import os
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from marketplace.models import DailySale, DailyExpense
from analytics_ml.services import CreditScoringService
from smartbiz_backend import gemini_utils


User = get_user_model()


class PhaseZeroRestructureTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="amina_merchant",
            email="amina@smartbiz.ng",
            password="StrongPassword123!",
            business_name="Amina Spices Hub",
            phone="08031234567",
            credits=100,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        DailySale.objects.create(
            user=self.user,
            item_name="Ginger Powder Carton",
            quantity=3,
            unit_price=15000,
            total_amount=45000,
            payment_method="TRANSFER",
            is_debt=False,
        )
        DailyExpense.objects.create(
            user=self.user,
            title="Generator Diesel",
            amount=6500,
            category="FUEL_GEN",
        )

    def test_credit_scoring_and_persisted_ml_model(self):
        result = CreditScoringService.calculate_credit_score(self.user)
        self.assertGreaterEqual(result["credit_score"], 300)
        self.assertLessEqual(result["credit_score"], 850)
        self.assertIn("ifrs9_risk", result)
        self.assertIn("explainability", result)
        self.assertTrue(len(result["explainability"]["positive_drivers"]) >= 1)
        self.assertEqual(result["metrics"]["total_expenses_logged"], 6500.0)
        self.assertTrue(CreditScoringService._MODEL_PATH.exists())

    def test_underwriting_dossier_and_public_lender_verification(self):
        dossier_res = self.client.get("/api/analytics-ml/underwriting-dossier/")
        self.assertEqual(dossier_res.status_code, 200)
        dossier_id = dossier_res.data["dossier_id"]
        v_hash = dossier_res.data["verification_hash"]

        # Unauthenticated public lender verification
        anon_client = APIClient()
        verify_res = anon_client.get(f"/api/analytics-ml/verify-dossier/{dossier_id}/?hash={v_hash}")
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.data["verified"])
        self.assertEqual(verify_res.data["signature_status"], "CRYPTOGRAPHICALLY_VALID")

    def test_monthly_gemini_budget_guardrail_and_status_endpoint(self):
        gemini_utils.record_ai_usage(
            model_name="gemini-flash-lite-latest",
            prompt_tokens=1200,
            completion_tokens=400,
            cached=False,
            feature="unit_test",
            user=self.user,
        )
        status_res = self.client.get("/api/billing/ai-budget-status/")
        self.assertEqual(status_res.status_code, 200)
        self.assertIn("platform_budget_usd", status_res.data)
        self.assertGreaterEqual(status_res.data["total_calls_this_month"], 1)

        # Simulate budget ceiling reached
        old_budget = os.environ.get("GEMINI_MONTHLY_BUDGET_USD")
        try:
            os.environ["GEMINI_MONTHLY_BUDGET_USD"] = "0.00001"
            with self.assertRaises(gemini_utils.GeminiBudgetExceededError):
                gemini_utils.make_gemini_request("Test prompt", strict=True, user=self.user)
        finally:
            if old_budget is None:
                os.environ.pop("GEMINI_MONTHLY_BUDGET_USD", None)
            else:
                os.environ["GEMINI_MONTHLY_BUDGET_USD"] = old_budget

    def test_whatsapp_cloud_webhook_and_commands(self):
        # 1. Meta GET hub.challenge verification
        anon = APIClient()
        verify_res = anon.get(
            "/api/marketplace/whatsapp/webhook/?hub.mode=subscribe&hub.verify_token=smartbiz_whatsapp_verify_2026&hub.challenge=987654321"
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.content.decode("utf-8"), "987654321")

        # 2. Conversational Sale Command via POST webhook
        sale_res = self.client.post(
            "/api/marketplace/whatsapp/webhook/",
            {"from": "2348031234567", "text": "Sold 2 bags of turmeric for 30000 transfer"},
            format="json",
        )
        self.assertEqual(sale_res.status_code, 200)
        self.assertEqual(sale_res.data["intent"], "SALE_LOGGED")
        self.assertEqual(DailySale.objects.filter(user=self.user).count(), 2)

        # 3. Conversational Summary Command
        sum_res = self.client.post(
            "/api/marketplace/whatsapp/webhook/",
            {"from": "2348031234567", "text": "Summary"},
            format="json",
        )
        self.assertEqual(sum_res.status_code, 200)
        self.assertEqual(sum_res.data["intent"], "DAILY_SUMMARY")
        self.assertIn("credit_score", sum_res.data)
