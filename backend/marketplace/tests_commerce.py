from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from brand.models import BrandIdentity
from marketplace.models import (DailySale, DeliveryRate, ListingReport, Order, Product, ProductReview)


class CommerceFlowTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.seller = User.objects.create_user(username='seller', email='s@x.com', password='pw12345!')
        self.brand = BrandIdentity.objects.create(user=self.seller, business_name='Alaba Gadgets')
        self.product = Product.objects.create(brand=self.brand, name='Phone', price=Decimal('10000'),
                                              stock_count=5, product_type='PHYSICAL', cost_price=Decimal('7000'))
        self.buyer = APIClient()
        self.seller_client = APIClient()
        self.seller_client.force_authenticate(self.seller)

    def _order(self, ref='REF1', qty=2, state=''):
        with mock.patch('marketplace.commerce_orders.verify_paystack', return_value=('success', Decimal('30000'))):
            return self.buyer.post('/api/marketplace/orders/create/', {
                'reference': ref, 'customer_name': 'Ada', 'customer_phone': '08031234567',
                'customer_address': '1 Allen Ave', 'delivery_state': state,
                'items': [{'productId': self.product.id, 'quantity': qty, 'price': 1}],  # client price is ignored
            }, format='json')

    def test_order_uses_server_price_deducts_stock_and_logs_sale(self):
        DeliveryRate.objects.create(brand=self.brand, state='Lagos', fee=Decimal('1000'), eta_days=2)
        res = self._order(qty=2, state='Lagos')
        self.assertEqual(res.status_code, 201)
        order = Order.objects.get()
        self.assertEqual(order.subtotal, Decimal('20000'))
        self.assertEqual(order.total_amount, Decimal('21000'))
        self.assertTrue(order.payment_verified)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 3)
        self.assertEqual(DailySale.objects.filter(user=self.seller).count(), 1)

    def test_same_reference_is_idempotent(self):
        self._order(ref='SAME')
        self._order(ref='SAME')
        self.assertEqual(Order.objects.count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 3)

    def test_failed_payment_is_rejected(self):
        with mock.patch('marketplace.commerce_orders.verify_paystack', return_value=('failed', None)):
            res = self.buyer.post('/api/marketplace/orders/create/', {
                'reference': 'BAD', 'items': [{'productId': self.product.id, 'quantity': 1}]}, format='json')
        self.assertEqual(res.status_code, 402)
        self.assertEqual(Order.objects.count(), 0)

    def test_merchant_status_flow_and_cancel_restores_stock(self):
        self._order(qty=2)
        order = Order.objects.get()
        bad = self.seller_client.patch(f'/api/marketplace/orders/{order.id}/', {'status': 'DELIVERED'}, format='json')
        self.assertEqual(bad.status_code, 400)
        ok = self.seller_client.patch(f'/api/marketplace/orders/{order.id}/',
                                      {'status': 'SHIPPED', 'courier': 'GIG', 'waybill_number': 'W1'}, format='json')
        self.assertEqual(ok.data['status'], 'SHIPPED')
        self.assertEqual(ok.data['courier'], 'GIG')
        self.seller_client.patch(f'/api/marketplace/orders/{order.id}/', {'status': 'CANCELLED'}, format='json')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 5)

    def test_other_merchant_cannot_touch_order(self):
        self._order()
        User = get_user_model()
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='o', email='o@x.com', password='pw12345!'))
        order = Order.objects.get()
        self.assertEqual(other.patch(f'/api/marketplace/orders/{order.id}/', {'status': 'PACKED'}, format='json').status_code, 404)

    def test_public_tracking_masks_phone_and_hides_address(self):
        self._order()
        order = Order.objects.get()
        data = self.buyer.get(f'/api/marketplace/orders/track/{order.tracking_code}/').data
        self.assertNotIn('08031234567', str(data))
        self.assertNotIn('delivery_address', data)

    def test_reviews_require_verified_delivered_order(self):
        self._order()
        order = Order.objects.get()
        payload = {'product_id': self.product.id, 'rating': 5, 'comment': 'Great',
                   'tracking_code': order.tracking_code}
        self.assertEqual(self.buyer.post('/api/marketplace/reviews/', payload, format='json').status_code, 403)
        order.status = 'DELIVERED'
        order.save()
        self.assertEqual(self.buyer.post('/api/marketplace/reviews/', payload, format='json').status_code, 201)
        self.assertEqual(self.buyer.post('/api/marketplace/reviews/', payload, format='json').status_code, 409)
        listing = self.buyer.get(f'/api/marketplace/reviews/?product_id={self.product.id}').data
        self.assertEqual(listing['review_count'], 1)
        self.assertEqual(listing['avg_rating'], 5.0)

    def test_buyer_can_confirm_and_dispute(self):
        self._order()
        order = Order.objects.get()
        url = f'/api/marketplace/orders/track/{order.tracking_code}/action/'
        self.assertEqual(self.buyer.post(url, {'action': 'confirm'}, format='json').status_code, 400)  # not shipped
        order.status = 'SHIPPED'
        order.save()
        self.assertEqual(self.buyer.post(url, {'action': 'dispute', 'reason': 'Wrong colour'}, format='json').data['status'], 'DISPUTED')

    def test_report_and_staff_only_moderation(self):
        self.assertEqual(self.buyer.post('/api/marketplace/reports/', {
            'product_id': self.product.id, 'reason': 'SCAM', 'contact': 'a@b.com'}, format='json').status_code, 201)
        report = ListingReport.objects.get()
        # A Pro-plan merchant (is_admin_or_owner) must NOT moderate
        self.seller.plan = 'Pro'
        self.seller.save()
        self.assertEqual(self.seller_client.get('/api/marketplace/moderation/reports/').status_code, 403)
        User = get_user_model()
        staff = APIClient()
        staff.force_authenticate(User.objects.create_user(username='st', email='st@x.com', password='pw12345!', is_staff=True))
        res = staff.post(f'/api/marketplace/moderation/reports/{report.id}/', {'action': 'suspend'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertTrue(self.product.is_suspended)
        self.assertEqual(self.buyer.get(f'/api/marketplace/public-product/{self.product.id}/').status_code, 404)

    def test_flash_deal_fields(self):
        self.product.compare_at_price = Decimal('12500')
        self.product.deal_ends_at = timezone.now() + timezone.timedelta(days=1)
        self.product.save()
        data = self.buyer.get(f'/api/marketplace/public-product/{self.product.id}/').data['product']
        self.assertTrue(data['deal_active'])
        self.assertEqual(data['discount_percent'], 20)

    def test_share_page_has_open_graph_tags(self):
        html = self.buyer.get(f'/api/marketplace/share/p/{self.product.id}/').content.decode()
        self.assertIn('og:title', html)
        self.assertIn('Phone', html)
