import json
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Transaction

User = get_user_model()

class BillingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword',
            email='test@example.com'
        )
        self.client.force_authenticate(user=self.user)

    @patch('requests.get')
    def test_verify_payment_success(self, mock_get):
        # Mock Paystack success response
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
        
        # Verify user credits updated (5000 Naira = 5000 Credits)
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 5010) # 10 default + 5000

        # Verify transaction record created
        tx = Transaction.objects.get(reference="test-ref-123")
        self.assertEqual(tx.status, "SUCCESS")
        self.assertEqual(tx.amount, 5000)

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
        self.assertEqual(self.user.credits, 10)

    @patch('requests.get')
    def test_duplicate_verification(self, mock_get):
        # First verification
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {"status": "success", "amount": 100000, "reference": "dup-ref"}
        }
        
        self.client.post('/api/billing/verify-payment/', {"reference": "dup-ref", "amount": 1000})
        
        # Second verification with same reference
        response = self.client.post('/api/billing/verify-payment/', {"reference": "dup-ref", "amount": 1000})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "Payment already processed")
        
        # Verify credits only updated once
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 1010)

    @patch('requests.get')
    def test_verify_squad_payment_success(self, mock_get):
        # Mock Squad success response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": 200,
            "message": "success",
            "data": {
                "transaction_status": "success",
                "transaction_reference": "sqd-ref-123",
                "amount": 200000, # 2000 Naira in kobo
            }
        }

        response = self.client.post('/api/billing/verify-squad-payment/', {
            "reference": "sqd-ref-123",
            "amount": 2000
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user credits updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.credits, 2010)

        # Verify transaction record created
        tx = Transaction.objects.get(reference="sqd-ref-123")
        self.assertEqual(tx.provider, "SQUAD")
        self.assertEqual(tx.amount, 2000)
