import json
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from .models import Transaction

User = get_user_model()

class BillingTests(TestCase):
    def setUp(self):
        settings.PAYSTACK_SECRET_KEY = 'sk_test_mock_secret_key_12345'
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword',
            email='test@example.com'
        )
        self.client.force_authenticate(user=self.user)

    @patch('requests.get')
    def test_verify_payment_success(self, mock_get):
        # Mock Paystack success response for ₦5,000 (Oga Pack = 700 credits)
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "id": 12345,
                "domain": "test",
                "status": "success",
                "reference": "test-ref-123",
                "amount": 500000, # 5000 Naira in kobo
                "gateway_response": "Successful",
            }
        }

        response = self.client.post('/api/billing/verify-payment/', {
            "reference": "test-ref-123",
            "amount": 5000
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "Payment verified successfully")
        
        # Verify user credits updated (50 default + 700 Oga Pack credits = 750)
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 750)

        # Verify transaction record created
        tx = Transaction.objects.get(reference="test-ref-123")
        self.assertEqual(tx.status, "SUCCESS")
        self.assertEqual(tx.amount, 5000)

    @patch('requests.get')
    def test_verify_pro_monthly_subscription(self, mock_get):
        # Mock Paystack success for ₦3,500 Growth Pro monthly upgrade
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {
                "status": "success",
                "reference": "pro-sub-monthly-001",
                "amount": 350000, # 3500 Naira in kobo
            }
        }

        response = self.client.post('/api/billing/verify-payment/', {
            "reference": "pro-sub-monthly-001",
            "amount": 3500,
            "plan": "Pro",
            "billing_cycle": "monthly"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], "Pro")
        self.assertTrue(response.data['is_pro'])

        self.user.refresh_from_db()
        self.assertEqual(self.user.plan, "Pro")
        self.assertEqual(self.user.credits, 500) # 50 default + 450 credits

    @patch('requests.get')
    def test_verify_pro_annual_subscription(self, mock_get):
        # Mock Paystack success for ₦35,000 Growth Pro annual upgrade
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {
                "status": "success",
                "reference": "pro-sub-annual-001",
                "amount": 3500000, # 35,000 Naira in kobo
            }
        }

        response = self.client.post('/api/billing/verify-payment/', {
            "reference": "pro-sub-annual-001",
            "amount": 35000,
            "plan": "Pro",
            "billing_cycle": "annual"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], "Pro")
        self.assertTrue(response.data['is_pro'])

        self.user.refresh_from_db()
        self.assertEqual(self.user.plan, "Pro")
        self.assertEqual(self.user.credits, 5050) # 50 default + 5000 credits

    @patch('requests.get')
    def test_verify_pay_as_you_go_pocket_pack(self, mock_get):
        # Pay-as-you-go micro pack ₦500 -> 50 credits, plan remains Free
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {
                "status": "success",
                "reference": "payg-pack-500",
                "amount": 50000, # 500 Naira in kobo
            }
        }

        response = self.client.post('/api/billing/verify-payment/', {
            "reference": "payg-pack-500",
            "amount": 500
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], "Free")
        self.assertFalse(response.data['is_pro'])

        self.user.refresh_from_db()
        self.assertEqual(self.user.plan, "Free")
        self.assertEqual(self.user.credits, 100) # 50 default + 50 credits

    @patch('requests.get')
    def test_verify_payment_failure(self, mock_get):
        # Mock Paystack failure response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": False,
            "message": "Invalid transaction reference",
            "data": None
        }

        response = self.client.post('/api/billing/verify-payment/', {
            "reference": "invalid-ref",
            "amount": 1000
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify credits NOT updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 50)

    @patch('requests.get')
    def test_duplicate_verification(self, mock_get):
        # First verification (₦1,000 = 110 credits)
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {"status": "success", "amount": 100000, "reference": "dup-ref"}
        }
        
        self.client.post('/api/billing/verify-payment/', {"reference": "dup-ref", "amount": 1000})
        
        # Second verification with same reference
        response = self.client.post('/api/billing/verify-payment/', {"reference": "dup-ref", "amount": 1000})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "Payment already verified")
        
        # Verify credits only updated once (50 + 110 = 160)
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 160)

    @patch('requests.get')
    def test_cannot_upgrade_to_pro_by_forging_plan_on_100_naira_payment(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {"status": "success", "amount": 10000, "reference": "tamper-pro-100"}
        }
        res = self.client.post('/api/billing/verify-payment/', {
            "reference": "tamper-pro-100",
            "amount": 100,
            "plan": "Pro",
            "billing_cycle": "monthly"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan, "Free")
        self.assertEqual(self.user.credits, 60)  # 50 + 10 (100/10), NOT 450 Pro credits

    @patch('requests.get')
    def test_pro_upgrade_does_not_auto_verify_kyc(self, mock_get):
        from marketplace.models import VendorVerification
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {"status": "success", "amount": 350000, "reference": "pro-no-kyc-001"}
        }
        res = self.client.post('/api/billing/verify-payment/', {
            "reference": "pro-no-kyc-001",
            "amount": 3500,
            "plan": "Pro",
            "billing_cycle": "monthly"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        vendor = VendorVerification.objects.get(user=self.user)
        self.assertFalse(vendor.is_verified)

    def test_paystack_webhook_signature_and_idempotency(self):
        import hmac, hashlib
        anon = APIClient()
        payload = json.dumps({
            "event": "charge.success",
            "data": {
                "reference": "wh-ref-001",
                "amount": 50000,
                "customer": {"email": self.user.email},
                "metadata": {"user_id": self.user.id}
            }
        }).encode('utf-8')

        bad = anon.post('/api/billing/webhook/paystack/', data=payload, content_type='application/json',
                        HTTP_X_PAYSTACK_SIGNATURE='deadbeef')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        sig = hmac.new(settings.PAYSTACK_SECRET_KEY.encode('utf-8'), payload, hashlib.sha512).hexdigest()
        ok1 = anon.post('/api/billing/webhook/paystack/', data=payload, content_type='application/json',
                        HTTP_X_PAYSTACK_SIGNATURE=sig)
        self.assertEqual(ok1.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 100)  # 50 + 50 pocket pack

        # Replay must be idempotent
        ok2 = anon.post('/api/billing/webhook/paystack/', data=payload, content_type='application/json',
                        HTTP_X_PAYSTACK_SIGNATURE=sig)
        self.assertEqual(ok2.status_code, status.HTTP_200_OK)
        self.assertEqual(ok2.data['status'], 'already_processed')
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 100)
