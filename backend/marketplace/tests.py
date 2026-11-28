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


class Phase3And4SecurityTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(
            username='owner@mart.ng', email='owner@mart.ng', password='OwnerPassword123!', credits=50
        )
        self.attacker = User.objects.create_user(
            username='attacker@mart.ng', email='attacker@mart.ng', password='AttackerPassword123!', credits=0
        )
        self.brand = BrandIdentity.objects.create(user=self.owner, business_name='Mart A')
        self.product = Product.objects.create(
            brand=self.brand, name='Garri Bag', price=Decimal('15000'), stock_count=10, product_type='PHYSICAL'
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(self.owner)
        self.attacker_client = APIClient()
        self.attacker_client.force_authenticate(self.attacker)

    def test_cross_tenant_idor_isolation(self):
        sale = DailySale.objects.create(
            user=self.owner, product=self.product, item_name='Garri Bag',
            quantity=1, unit_price=15000, total_amount=15000, payment_method='CASH'
        )
        exp = DailyExpense.objects.create(user=self.owner, title='Diesel', amount=3000)

        self.assertEqual(self.attacker_client.get(f'/api/marketplace/daily-sales/{sale.id}/').status_code, 404)
        self.assertEqual(self.attacker_client.patch(f'/api/marketplace/daily-sales/{sale.id}/', {'item_name': 'Hacked'}, format='json').status_code, 404)
        self.assertEqual(self.attacker_client.delete(f'/api/marketplace/daily-sales/{sale.id}/').status_code, 404)
        self.assertEqual(self.attacker_client.get(f'/api/marketplace/daily-expenses/{exp.id}/').status_code, 404)
        self.assertEqual(self.attacker_client.delete(f'/api/marketplace/products/{self.product.id}/').status_code, 404)

    def test_apprentice_lock_blocks_mutation_and_void_preserves_audit_log(self):
        from marketplace.models import LedgerAuditLog
        create_res = self.owner_client.post('/api/marketplace/daily-sales/', {
            'product': self.product.id,
            'item_name': 'Garri Bag',
            'quantity': 2,
            'unit_price': '15000.00',
            'total_amount': '30000.00',
            'payment_method': 'CASH'
        }, format='json')
        self.assertEqual(create_res.status_code, 201)
        sale_id = create_res.data['id']
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.owner_client.post('/api/users/security-lock/', {
            'action': 'SET_PASSCODE', 'new_passcode': '749201', 'lock_immediately': True
        }, format='json')

        blocked_edit = self.owner_client.patch(f'/api/marketplace/daily-sales/{sale_id}/', {'item_name': 'Edited'}, format='json')
        blocked_del = self.owner_client.delete(f'/api/marketplace/daily-sales/{sale_id}/')
        self.assertEqual(blocked_edit.status_code, 403)
        self.assertEqual(blocked_del.status_code, 403)

        # Staff/Apprentice Lock must ALSO protect Inventory prices, creation, deletions, and cost_price visibility
        prod_create = self.owner_client.post('/api/marketplace/products/', {'name': 'Sneaky Item', 'price': '500.00'}, format='json')
        self.assertEqual(prod_create.status_code, 403)
        prod_patch = self.owner_client.patch(f'/api/marketplace/products/{self.product.id}/', {'price': '999.00'}, format='json')
        self.assertEqual(prod_patch.status_code, 403)
        prod_del = self.owner_client.delete(f'/api/marketplace/products/{self.product.id}/')
        self.assertEqual(prod_del.status_code, 403)
        prod_list = self.owner_client.get('/api/marketplace/products/')
        rows_prod = prod_list.data if isinstance(prod_list.data, list) else prod_list.data['results']
        self.assertIsNone(rows_prod[0]['cost_price'])

        # Staff/Apprentice Lock must ALSO mask profit/COGS/expenses on Daily Summary, Trends, Sales, Expenses, and AI endpoints
        sales_list = self.owner_client.get('/api/marketplace/daily-sales/')
        sales_rows = sales_list.data if isinstance(sales_list.data, list) else sales_list.data['results']
        self.assertIsNone(sales_rows[0]['cost_price'])

        exp_list = self.owner_client.get('/api/marketplace/daily-expenses/')
        self.assertEqual(exp_list.status_code, 403)
        exp_create = self.owner_client.post('/api/marketplace/daily-expenses/', {'title': 'Fake', 'amount': '500.00'}, format='json')
        self.assertEqual(exp_create.status_code, 403)

        summary_res = self.owner_client.get('/api/marketplace/daily-summary/')
        self.assertEqual(summary_res.status_code, 200)
        self.assertIsNone(summary_res.data['cogs'])
        self.assertIsNone(summary_res.data['net_profit'])
        self.assertIsNone(summary_res.data['total_expenses'])

        trends_res = self.owner_client.get('/api/marketplace/daily-trends/?days=7')
        self.assertEqual(trends_res.status_code, 200)
        self.assertIsNone(trends_res.data['total_profit'])
        self.assertIsNone(trends_res.data['total_expenses'])

        self.assertEqual(self.owner_client.post('/api/marketplace/daily-ai-insights/', {}, format='json').status_code, 403)
        self.assertEqual(self.owner_client.post('/api/marketplace/daily-ai-ask/', {'question': 'profit?'}, format='json').status_code, 403)
        self.assertEqual(self.owner_client.get('/api/analytics-ml/overview/').status_code, 403)

        unlock = self.owner_client.post('/api/users/security-lock/', {'action': 'UNLOCK', 'passcode': '749201'}, format='json')
        self.assertEqual(unlock.status_code, 200)

        void_res = self.owner_client.delete(f'/api/marketplace/daily-sales/{sale_id}/')
        self.assertEqual(void_res.status_code, 204)

        sale_obj = DailySale.objects.get(pk=sale_id)
        self.assertTrue(sale_obj.is_voided)  # Append-only soft-void, NOT silent delete
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 10)  # Stock restored
        self.assertTrue(LedgerAuditLog.objects.filter(user=self.owner, object_id=sale_id, action='VOID').exists())

        listed = self.owner_client.get('/api/marketplace/daily-sales/')
        rows = listed.data if isinstance(listed.data, list) else listed.data['results']
        self.assertEqual(len(rows), 0)

    def test_public_debtor_settlement_requires_verified_paystack_and_exact_amount(self):
        from marketplace.models import LedgerAuditLog
        debt = DailySale.objects.create(
            user=self.owner, item_name='Cement', quantity=1, unit_price=5000, total_amount=5000,
            payment_method='CREDIT', customer_name='Kola', is_debt=True
        )
        self.assertTrue(str(debt.settlement_token).startswith('DBT-'))
        anon = APIClient()

        # Sequential numeric ID lookup must be rejected (prevents enumeration IDOR)
        id_enum = anon.get(f'/api/marketplace/debtors/settle/{debt.id}/')
        self.assertEqual(id_enum.status_code, 404)

        no_ref = anon.post(f'/api/marketplace/debtors/settle/{debt.settlement_token}/', {}, format='json')
        self.assertEqual(no_ref.status_code, 400)

        with mock.patch('marketplace.commerce_orders.verify_paystack', return_value=('failed', None)):
            bad_ref = anon.post(f'/api/marketplace/debtors/settle/{debt.settlement_token}/', {'reference': 'FAKE123'}, format='json')
            self.assertEqual(bad_ref.status_code, 402)

        with mock.patch('marketplace.commerce_orders.verify_paystack', return_value=('success', Decimal('1000'))):
            short_pay = anon.post(f'/api/marketplace/debtors/settle/{debt.settlement_token}/', {'reference': 'SHORT123'}, format='json')
            self.assertEqual(short_pay.status_code, 400)

        with mock.patch('marketplace.commerce_orders.verify_paystack', return_value=('success', Decimal('5000'))):
            ok = anon.post(f'/api/marketplace/debtors/settle/{debt.settlement_token}/', {'reference': 'OKPAY123'}, format='json')
            self.assertEqual(ok.status_code, 200)

        # Same-debt retry is idempotent (200), whereas cross-debt replay returns 409 Conflict
        debt2 = DailySale.objects.create(
            user=self.owner, item_name='Sand', quantity=1, unit_price=5000, total_amount=5000,
            payment_method='CREDIT', customer_name='Ade', is_debt=True
        )
        with mock.patch('marketplace.commerce_orders.verify_paystack', return_value=('success', Decimal('5000'))):
            idemp = anon.post(f'/api/marketplace/debtors/settle/{debt.settlement_token}/', {'reference': 'OKPAY123'}, format='json')
            self.assertEqual(idemp.status_code, 200)
            self.assertTrue(idemp.data.get('idempotent'))
            replay = anon.post(f'/api/marketplace/debtors/settle/{debt2.settlement_token}/', {'reference': 'OKPAY123'}, format='json')
            self.assertEqual(replay.status_code, 409)

        debt.refresh_from_db()
        self.assertFalse(debt.is_debt)
        self.assertTrue(LedgerAuditLog.objects.filter(user=self.owner, object_id=debt.id, action='SETTLE').exists())

    def test_ai_credits_atomic_and_refund_on_upstream_failure(self):
        # 0-credit attacker gets HTTP 402 before any Gemini call
        res_voice = self.attacker_client.post('/api/marketplace/voice-pos-ingest/', {'text_transcript': 'sold rice 5000'}, format='json')
        res_ocr = self.attacker_client.post('/api/marketplace/receipt-ocr/', {'image_base64': 'abc'}, format='json')
        res_debt = self.attacker_client.post('/api/content/generate-debt-reminder/', {'name': 'Bola', 'amount': 2000}, format='json')
        self.assertEqual(res_voice.status_code, 402)
        self.assertEqual(res_ocr.status_code, 402)
        self.assertEqual(res_debt.status_code, 402)

        # Owner with 50 credits gets refunded automatically when upstream Gemini fails
        with mock.patch('smartbiz_backend.gemini_utils.generate_json_content', side_effect=RuntimeError('Gemini down')):
            ocr_fail = self.owner_client.post('/api/marketplace/receipt-ocr/', {'image_base64': 'abc'}, format='json')
        self.assertEqual(ocr_fail.status_code, 503)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.credits, 50)

    def test_offline_pos_sync_idempotency_across_payment_methods(self):
        entries = [
            {'offline_id': 'off-1', 'item_name': 'Milk', 'quantity': 1, 'unit_price': '1000.00', 'total_amount': '1000.00', 'payment_method': 'CASH'},
            {'offline_id': 'off-2', 'item_name': 'Bread', 'quantity': 2, 'unit_price': '1500.00', 'total_amount': '3000.00', 'payment_method': 'TRANSFER'},
            {'offline_id': 'off-3', 'item_name': 'Sugar', 'quantity': 1, 'unit_price': '2500.00', 'total_amount': '2500.00', 'payment_method': 'CREDIT', 'customer_name': 'Sadiq', 'is_debt': True},
        ]
        # Replay each offline item twice (e.g. flaky retry)
        for item in entries + entries:
            r = self.owner_client.post('/api/marketplace/daily-sales/', item, format='json')
            self.assertIn(r.status_code, (200, 201))

        self.assertEqual(DailySale.objects.filter(user=self.owner, is_voided=False).count(), 3)
        summary = self.owner_client.get('/api/marketplace/daily-summary/').data
        self.assertEqual(summary['total_sales_revenue'], 6500.0)
        self.assertEqual(summary['cash_sales'], 1000.0)
        self.assertEqual(summary['transfer_sales'], 3000.0)
        self.assertEqual(summary['credit_sales'], 2500.0)

    def test_marketplace_paystack_webhook_requires_valid_hmac_signature(self):
        import hmac, hashlib, json
        from django.conf import settings
        from marketplace.models import Order

        settings.PAYSTACK_SECRET_KEY = 'sk_test_mkt_secret'
        order = Order.objects.create(reference='ORD-WH-1', brand=self.brand, buyer_name='Tunde', total_amount=5000, payment_verified=False)
        body = json.dumps({'event': 'charge.success', 'data': {'reference': 'ORD-WH-1', 'amount': 500000}}).encode('utf-8')
        anon = APIClient()

        bad = anon.post('/api/marketplace/webhook/paystack/', data=body, content_type='application/json',
                        HTTP_X_PAYSTACK_SIGNATURE='invalid')
        self.assertEqual(bad.status_code, 401)

        sig = hmac.new(settings.PAYSTACK_SECRET_KEY.encode('utf-8'), body, hashlib.sha512).hexdigest()
        good = anon.post('/api/marketplace/webhook/paystack/', data=body, content_type='application/json',
                         HTTP_X_PAYSTACK_SIGNATURE=sig)
        self.assertEqual(good.status_code, 200)
        order.refresh_from_db()
        self.assertTrue(order.payment_verified)
