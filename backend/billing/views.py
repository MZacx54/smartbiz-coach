from rest_framework import views, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
import requests
import json
import logging
from .models import Transaction, CreditLedger
from .serializers import TransactionSerializer, CreditLedgerSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

class TransactionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

class CreditLedgerListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ledger = CreditLedger.objects.filter(user=request.user).order_by('-created_at')
        serializer = CreditLedgerSerializer(ledger, many=True)
        return Response(serializer.data)

class CreditPurchaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        if not amount or amount <= 0:
            return Response({"error": "Invalid amount specified"}, status=status.HTTP_400_BAD_REQUEST)

        # In production this creates a pending Transaction
        tx = Transaction.objects.create(
            user=request.user,
            amount=amount,
            description="Credit Top-up via Paystack",
            provider="PAYSTACK",
            type="CREDIT_TOPUP",
            status="PENDING",
            reference=f"T_{request.user.id}_{Transaction.objects.count() + 1}"
        )

        return Response({
            "message": "Transaction initialized",
            "reference": tx.reference,
            "amount": tx.amount
        }, status=status.HTTP_201_CREATED)

class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get('reference')
        amount = request.data.get('amount')

        if not reference:
            return Response({"error": "Reference is required"}, status=status.HTTP_400_BAD_REQUEST)

        paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
        if not paystack_secret:
            return Response({"error": "Payment gateway configuration missing on server"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = {
            "Authorization": f"Bearer {paystack_secret}",
            "Content-Type": "application/json"
        }

        try:
            url = f"https://api.paystack.co/transaction/verify/{reference}"
            response = requests.get(url, headers=headers, timeout=15)
            response_data = response.json()

            if response.status_code == 200 and response_data.get('status') and response_data.get('data', {}).get('status') == 'success':
                data = response_data['data']
                paystack_amount_kobo = data.get('amount')
                paystack_amount_naira = paystack_amount_kobo / 100

                with transaction.atomic():
                    user = User.objects.select_for_update().get(id=request.user.id)

                    # Check for idempotency: if transaction reference already processed
                    existing_tx = Transaction.objects.filter(reference=reference, status='SUCCESS').first()
                    if existing_tx:
                        return Response({
                            "message": "Payment already verified",
                            "credits": user.credits
                        }, status=status.HTTP_200_OK)

                    tx, created = Transaction.objects.get_or_create(
                        reference=reference,
                        defaults={
                            'user': user,
                            'amount': paystack_amount_naira,
                            'description': "Credit Top-up via Paystack",
                            'provider': "PAYSTACK",
                            'type': "CREDIT_TOPUP",
                            'status': "SUCCESS"
                        }
                    )
                    if not created:
                        tx.status = 'SUCCESS'
                        tx.amount = paystack_amount_naira
                        tx.save(update_fields=['status', 'amount'])

                    # Map Naira amount to Credit Packs (Standard: ₦10 = 1 BizCredit + bonus tiers)
                    credits_purchased = 0
                    if abs(paystack_amount_naira - 500) < 5:
                        credits_purchased = 50   # 50 Credits Pocket Pack
                    elif abs(paystack_amount_naira - 1000) < 5:
                        credits_purchased = 110  # 110 Credits Starter (+10 Bonus)
                    elif abs(paystack_amount_naira - 1500) < 5:
                        credits_purchased = 175  # 175 Credits
                    elif abs(paystack_amount_naira - 2500) < 5:
                        credits_purchased = 300  # 300 Credits Growth (+50 Bonus)
                    elif abs(paystack_amount_naira - 3500) < 5:
                        credits_purchased = 450  # 450 Credits
                    elif abs(paystack_amount_naira - 5000) < 5:
                        credits_purchased = 700  # 700 Credits Oga Pack (+200 Bonus)
                    elif abs(paystack_amount_naira - 7500) < 5:
                        credits_purchased = 1100 # 1,100 Credits Vendor Pro
                    elif abs(paystack_amount_naira - 15000) < 5:
                        credits_purchased = 2500 # 2,500 Credits Mogul
                    else:
                        # Fallback: 10 Naira = 1 Credit
                        credits_purchased = max(1, int(paystack_amount_naira / 10))

                    # Update user credits
                    user.credits += credits_purchased
                    user.save(update_fields=['credits'])

                    # Record in CreditLedger
                    CreditLedger.objects.create(
                        user=user,
                        amount=credits_purchased,
                        activity=f"Purchased BizCredits ({credits_purchased} credits)"
                    )

                    return Response({
                        "message": "Payment verified successfully",
                        "credits": user.credits,
                        "added": credits_purchased
                    }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Payment verification failed",
                    "details": response_data.get('message')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error("VerifyPaymentView error: %s", e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeductCreditsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            credit_cost = int(request.data.get('amount', 0))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid credit amount specified.'}, status=status.HTTP_400_BAD_REQUEST)

        activity = str(request.data.get('activity', 'AI Generation')).strip() or 'AI Generation'

        if credit_cost <= 0:
            return Response({
                "message": "Zero credit cost",
                "credits": request.user.credits,
                "deducted": 0
            }, status=status.HTTP_200_OK)

        with transaction.atomic():
            user = User.objects.select_for_update().get(id=request.user.id)
            if user.credits < credit_cost:
                return Response({
                    "error": f"Insufficient BizCredits. You have {user.credits} credits, but this action requires {credit_cost} credits.",
                    "credits_required": credit_cost,
                    "current_credits": user.credits
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

            user.credits -= credit_cost
            user.save(update_fields=['credits'])

            CreditLedger.objects.create(
                user=user,
                amount=-credit_cost,
                activity=activity[:200]
            )

            return Response({
                "message": "Credits deducted successfully",
                "credits": user.credits,
                "deducted": credit_cost
            }, status=status.HTTP_200_OK)

class RewardShareView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        product_title = request.data.get('product_title') or request.data.get('title') or 'Marketplace Product'
        product_id = request.data.get('product_id') or request.data.get('id')

        # Prevent runaway abuse: allow up to 10 share rewards per 24 hours
        from django.utils import timezone
        import datetime
        since_time = timezone.now() - datetime.timedelta(hours=24)
        recent_share_count = CreditLedger.objects.filter(
            user=user,
            activity__startswith="Product Link Share Bonus",
            created_at__gte=since_time
        ).count()

        if recent_share_count >= 10:
            return Response({
                "message": "Daily product share reward limit reached (10 shares / 50 credits daily). Keep sharing to boost your store reach!",
                "credits": user.credits,
                "earned": 0
            }, status=status.HTTP_200_OK)

        reward_amount = 5
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=user.id)
            user.credits += reward_amount
            user.save(update_fields=['credits'])

            CreditLedger.objects.create(
                user=user,
                amount=reward_amount,
                activity=f"Product Link Share Bonus: {str(product_title)[:120]}"
            )

        return Response({
            "message": f"🎉 +{reward_amount} SmartBiz Credits earned for sharing!",
            "credits": user.credits,
            "earned": reward_amount
        }, status=status.HTTP_200_OK)

class PaystackConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({
            "publicKey": getattr(settings, 'PAYSTACK_PUBLIC_KEY', '') or ''
        })

class AdminTransactionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_email = (getattr(request.user, 'email', '') or '').strip().lower()
        trusted_admins = {
            'meshachzax@gmail.com',
            'support@smartbizcoach.com.ng',
            'admin@smartbizcoach.com.ng'
        }
        if not (request.user.is_staff or request.user.is_superuser or user_email in trusted_admins):
            return Response({"error": "Admin clearance required."}, status=status.HTTP_403_FORBIDDEN)

        transactions = Transaction.objects.all().order_by('-created_at')[:200]
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return Response({"status": "received"}, status=status.HTTP_200_OK)
