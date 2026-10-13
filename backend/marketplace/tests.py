from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from brand.models import BrandIdentity
from marketplace.models import DailyExpense, DailySale, Product
from marketplace.voice_pos import find_catalog_match, validate_payload


class ValidatePayloadTests(APITestCase):
    def test_total_unit_consistency_and_defaults(self):
        sales, _, warnings = validate_payload(
            [{'item_name': ' photocopy ', 'quantity': 2, 'unit_price': 100, 'total_amount': 999}], [])
        self.assertEqual(sales[0]['total_amount'], 200.0)   # unit x qty wins
        self.assertEqual(sales[0]['payment_method'], 'CASH')
        self.assertEqual(warnings, [])

    def test_total_only_derives_unit(self):
        sales, _, _ = validate_payload([{'item_name': 'Rice', 'quantity': 2, 'total_amount': 180000}], [])
        self.assertEqual(sales[0]['unit_price'], 90000.0)

    def test_debt_without_name_warns_and_forces_credit(self):
        sales, _, warnings = validate_payload(
            [{'item_name': 'Rice', 'total_amount': 5000, 'is_debt': True}], [])
        self.assertEqual(sales[0]['payment_method'], 'CREDIT')
        self.assertTrue(any('owes' in w for w in warnings))

    def test_missing_price_and_huge_amount_flagged(self):
        sales, expenses, warnings = validate_payload(
            [{'item_name': 'Soap'}], [{'title': 'Fuel', 'amount': 10 ** 12}])
        self.assertEqual(sales[0]['total_amount'], 0.0)
        self.assertEqual(expenses[0]['amount'], 0.0)
        self.assertGreaterEqual(len(warnings), 2)

    def test_string_amounts_with_commas(self):
        sales, _, _ = validate_payload([{'item_name': 'Fabric', 'total_amount': '₦12,500'}], [])
        self.assertEqual(sales[0]['total_amount'], 12500.0)

    def test_bad_enums_are_normalised(self):
        sales, expenses, _ = validate_payload(
            [{'item_name': 'X', 'total_amount': 10, 'payment_method': 'bitcoin', 'product_type': 'weird'}],
            [{'title': 'Y', 'amount': 5, 'category': 'nonsense', 'payment_method': 'cheque'}])
        self.assertEqual(sales[0]['payment_method'], 'CASH')
        self.assertEqual(sales[0]['product_type'], 'PHYSICAL')
        self.assertEqual(expenses[0]['category'], 'OTHER')
        self.assertEqual(expenses[0]['payment_method'], 'CASH')


class VoicePOSFlowTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='trader', password='pw12345!')
        self.brand = BrandIdentity.objects.create(user=self.user, business_name='Test Biz')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _ai(self, extract):
        return mock.patch.multiple(
            'smartbiz_backend.gemini_utils',
            extract_json_strict=mock.Mock(return_value=extract),
            transcribe_audio_strict=mock.Mock(return_value='mo se photocopy fun igba naira'),
        )

    def test_fuzzy_match_reuses_existing_product(self):
        p = Product.objects.create(brand=self.brand, name='Photocopy (Black & White)', price=200,
                                   product_type='SERVICE', stock_count=999)
        match, score = find_catalog_match([p], 'photocopy black and white')
        self.assertIsNotNone(match)

    def test_preview_saves_nothing_then_confirm_creates_new_service(self):
        extract = {'detected_language': 'Yoruba', 'english_summary': 'x', 'sales': [
            {'item_name': 'Photocopy (Black & White)', 'product_type': 'SERVICE', 'quantity': 1,
             'unit_price': 200, 'total_amount': 200, 'payment_method': 'CASH'}], 'expenses': []}
        with self._ai(extract):
            r = self.client.post('/api/marketplace/voice-pos-ingest/',
                                 {'text_transcript': 'mo se photocopy fun igba naira', 'language': 'yoruba'},
                                 format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['status'], 'preview')
        self.assertEqual(DailySale.objects.count(), 0)
        self.assertTrue(r.data['sales'][0]['is_new_item'])

        c = self.client.post('/api/marketplace/voice-pos-confirm/',
                             {'sales': r.data['sales'], 'expenses': r.data['expenses'],
                              'transcript': r.data['transcript'], 'detected_language': 'Yoruba'},
                             format='json')
        self.assertEqual(c.status_code, 201, c.content)
        self.assertEqual(DailySale.objects.count(), 1)
        prod = Product.objects.get(name='Photocopy (Black & White)')
        self.assertEqual(prod.product_type, 'SERVICE')
        self.assertFalse(prod.is_public)           # not auto-published
        self.assertEqual(DailySale.objects.get().total_amount, Decimal('200'))

    def test_new_physical_item_does_not_invent_stock(self):
        sale = {'item_name': 'Bag of Rice', 'product_type': 'PHYSICAL', 'quantity': 2,
                'unit_price': 90000, 'total_amount': 180000, 'payment_method': 'CREDIT',
                'customer_name': 'Musa', 'is_debt': True}
        c = self.client.post('/api/marketplace/voice-pos-confirm/', {'sales': [sale], 'expenses': []}, format='json')
        self.assertEqual(c.status_code, 201, c.content)
        prod = Product.objects.get(name='Bag of Rice')
        self.assertEqual(prod.stock_count, 0)
        self.assertEqual(prod.low_stock_threshold, 0)
        self.assertEqual(c.data['debts'][0]['name'], 'Musa')

    def test_confirm_rejects_missing_price(self):
        c = self.client.post('/api/marketplace/voice-pos-confirm/',
                             {'sales': [{'item_name': 'Soap'}], 'expenses': []}, format='json')
        self.assertEqual(c.status_code, 400)
        self.assertEqual(DailySale.objects.count(), 0)

    def test_ai_outage_returns_503_not_fake_data(self):
        from smartbiz_backend.gemini_utils import GeminiUnavailableError
        with mock.patch('smartbiz_backend.gemini_utils.extract_json_strict',
                        side_effect=GeminiUnavailableError('down')):
            r = self.client.post('/api/marketplace/voice-pos-ingest/',
                                 {'text_transcript': 'I sold rice 5000'}, format='json')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(DailySale.objects.count(), 0)

    def test_nothing_found_returns_422(self):
        with self._ai({'sales': [], 'expenses': []}):
            r = self.client.post('/api/marketplace/voice-pos-ingest/',
                                 {'text_transcript': 'good morning'}, format='json')
        self.assertEqual(r.status_code, 422)

    def test_backdated_entry_lands_on_chosen_day(self):
        r = self.client.post('/api/marketplace/daily-sales/', {
            'item_name': 'Soap', 'quantity': 1, 'unit_price': '100.00', 'total_amount': '100.00',
            'payment_method': 'CASH', 'date': '2020-01-05'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        listed = self.client.get('/api/marketplace/daily-sales/?date=2020-01-05')
        rows = listed.data if isinstance(listed.data, list) else listed.data['results']
        self.assertEqual(len(rows), 1)

    def test_trends_endpoint(self):
        DailyExpense.objects.create(user=self.user, title='Fuel', amount=500)
        r = self.client.get('/api/marketplace/daily-trends/?days=7')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['series']), 7)
