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

        from django.db.models import Sum
        from users.models import AgentHireRequest, PartnershipInquiry
        from marketplace.models import Order, DailySale, DailyExpense, VendorVerification, Product

        # 1. Transactions (BizCredit AI Purchases)
        tx_qs = Transaction.objects.filter(type='CREDIT_TOPUP').select_related('user').order_by('-created_at')[:200]
        tx_list = []
        for t in tx_qs:
            tx_list.append({
                "id": t.id,
                "username": getattr(t.user, 'username', '') if t.user else '',
                "email": getattr(t.user, 'email', '') if t.user else '',
                "business_name": getattr(getattr(t.user, 'brand', None), 'business_name', '') or getattr(t.user, 'business_name', '') or getattr(t.user, 'first_name', '') or 'Merchant',
                "amount": float(t.amount or 0),
                "description": t.description or 'BizCredit Purchase',
                "status": t.status,
                "reference": t.reference or '',
                "created_at": t.created_at.isoformat() if t.created_at else ''
            })

        # 2. Storefront Orders
        orders_qs = Order.objects.select_related('brand').prefetch_related('items').order_by('-created_at')[:200]
        orders_list = []
        for o in orders_qs:
            item_summary = ", ".join([f"{item.name} x{item.quantity}" for item in o.items.all()]) or "Storefront Order"
            orders_list.append({
                "id": o.id,
                "business_name": getattr(o.brand, 'business_name', '') or "Verified Merchant",
                "customer_name": o.buyer_name or "Storefront Customer",
                "customer_contact": f"{o.buyer_phone} ({o.delivery_state or 'NG'})".strip(),
                "product_name": item_summary,
                "amount": float(o.total_amount or 0),
                "details": f"{o.delivery_state or 'Nigeria'} · Track: {o.tracking_code}",
                "status": o.status or "PAID",
                "created_at": o.created_at.isoformat() if o.created_at else ""
            })

        # 3. Institutional & NGO Partnership Proposals
        inq_qs = PartnershipInquiry.objects.order_by('-created_at')[:200]
        inquiry_list = []
        for p in inq_qs:
            inquiry_list.append({
                "id": p.id,
                "organization": p.organization or 'Organization',
                "name": p.name or 'Representative',
                "email": p.email or '',
                "phone": p.phone or 'N/A',
                "partnership_type": p.partnership_type or 'Strategic Partnership',
                "cohort_size": p.cohort_size or 'Not specified',
                "message": p.message or '',
                "source": p.source or 'Direct',
                "status": p.status or 'NEW',
                "created_at": p.created_at.isoformat() if p.created_at else ''
            })

        # 4. CAC Accredited Agent Desk Registrations
        cac_qs = AgentHireRequest.objects.select_related('user').order_by('-created_at')[:200]
        cac_list = []
        for c in cac_qs:
            cac_list.append({
                "id": c.id,
                "business_name": c.business_name or 'Business Name',
                "registration_type": c.registration_type or 'CAC Registration',
                "user_email": getattr(c.user, 'email', '') if c.user else '',
                "user_name": getattr(c.user, 'name', '') or getattr(c.user, 'username', '') if c.user else 'Applicant',
                "amount": float(c.amount_paid or 0),
                "payment_status": c.payment_status or 'PENDING',
                "payment_reference": c.payment_reference or 'N/A',
                "status": c.status or 'Pending',
                "created_at": c.created_at.isoformat() if c.created_at else ''
            })

        # 5. POS Retail Day-Book & Cashflow
        total_sales_volume = float(DailySale.objects.aggregate(total=Sum('total_amount'))['total'] or 0)
        total_sales_count = DailySale.objects.count()
        cash_sales_volume = float(DailySale.objects.filter(payment_method='CASH').aggregate(total=Sum('total_amount'))['total'] or 0)
        transfer_sales_volume = float(DailySale.objects.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('total_amount'))['total'] or 0)
        credit_sales_volume = float(DailySale.objects.filter(payment_method='CREDIT').aggregate(total=Sum('total_amount'))['total'] or 0)
        total_expenses_volume = float(DailyExpense.objects.aggregate(total=Sum('amount'))['total'] or 0)
        total_expenses_count = DailyExpense.objects.count()

        pos_stats = {
            "total_sales_volume": total_sales_volume,
            "total_sales_count": total_sales_count,
            "cash_sales_volume": cash_sales_volume,
            "transfer_sales_volume": transfer_sales_volume,
            "credit_sales_volume": credit_sales_volume,
            "total_expenses_volume": total_expenses_volume,
            "total_expenses_count": total_expenses_count,
        }

        # 6. Merchant Bank Subaccounts & Payout Directory
        payout_qs = VendorVerification.objects.select_related('user').order_by('-created_at')[:200]
        payout_list = []
        for v in payout_qs:
            payout_list.append({
                "id": v.id,
                "business_name": v.business_name or getattr(v.user, 'business_name', '') or "Merchant",
                "business_type": v.business_type or "Retail",
                "whatsapp_number": v.whatsapp_number or getattr(v.user, 'phone', '') or "",
                "bank_name": v.bank_name or "Not configured",
                "account_number": v.account_number or "",
                "account_name": v.account_name or "",
                "paystack_subaccount_code": v.paystack_subaccount_code or "Pending Setup",
                "is_verified": v.is_verified,
                "created_at": v.created_at.isoformat() if v.created_at else ""
            })

        # Top Executive Aggregates
        total_users_count = User.objects.count()
        active_users_count = User.objects.filter(is_active=True).count()
        onboarded_users_count = User.objects.filter(has_onboarded=True).count()
        total_products_count = Product.objects.count()
        total_cac_requests = AgentHireRequest.objects.count()
        paid_cac_requests = AgentHireRequest.objects.filter(payment_status='PAID').count()

        credit_rev = float(Transaction.objects.filter(type='CREDIT_TOPUP', status='SUCCESS').aggregate(total=Sum('amount'))['total'] or 0)
        storefront_gmv = float(Order.objects.aggregate(total=Sum('total_amount'))['total'] or 0)
        combined_total = credit_rev + storefront_gmv

        total_count = Transaction.objects.filter(type='CREDIT_TOPUP').count()
        success_count = Transaction.objects.filter(type='CREDIT_TOPUP', status='SUCCESS').count()
        failed_count = Transaction.objects.filter(type='CREDIT_TOPUP', status='FAILED').count()
        pending_count = Transaction.objects.filter(type='CREDIT_TOPUP', status='PENDING').count()
        active_subaccounts_count = VendorVerification.objects.filter(paystack_subaccount_code__isnull=False).exclude(paystack_subaccount_code='').count()

        return Response({
            "total_users_count": total_users_count,
            "active_users_count": active_users_count,
            "onboarded_users_count": onboarded_users_count,
            "total_products_count": total_products_count,
            "total_cac_requests": total_cac_requests,
            "paid_cac_requests": paid_cac_requests,
            "total_revenue": credit_rev,
            "storefront_gmv": storefront_gmv,
            "combined_total": combined_total,
            "total_count": total_count,
            "success_count": success_count,
            "failed_count": failed_count,
            "pending_count": pending_count,
            "active_subaccounts_count": active_subaccounts_count,
            "transactions": tx_list,
            "storefront_orders": orders_list,
            "merchant_payout_directory": payout_list,
            "partnership_inquiries": inquiry_list,
            "cac_requests": cac_list,
            "pos_stats": pos_stats,
        })

class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return Response({"status": "received"}, status=status.HTTP_200_OK)


class AIBudgetStatusView(APIView):
    """
    Phase 0 Guardrail Endpoint: Returns current monthly Gemini Flash/Flash-Lite token usage,
    estimated USD spend, remaining monthly budget, and cache hit efficiency.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from smartbiz_backend.gemini_utils import get_monthly_ai_spend_summary
        summary = get_monthly_ai_spend_summary(user=request.user)
        return Response(summary, status=status.HTTP_200_OK)
