from datetime import timedelta
from decimal import Decimal, InvalidOperation
import os
import uuid
import urllib.parse
from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
import requests
import json
import logging
from .models import Transaction, CreditLedger, PaymentReferenceLedger
from .serializers import TransactionSerializer, CreditLedgerSerializer
from .catalog import CREDIT_PACKS, LEGACY_TOPUP_CREDITS, PRO_PLANS, AI_CREDIT_COSTS

logger = logging.getLogger(__name__)
User = get_user_model()


def _resolve_purchase(amount_naira: Decimal, requested_plan: str, billing_cycle: str, pack_id: str):
    """Canonical server-side credit & subscription resolution from verified Naira amount + explicit intent."""
    req_plan = (requested_plan or '').strip().lower()
    cycle = (billing_cycle or '').strip().lower()
    pid = (pack_id or '').strip().lower()

    is_pro_intent = (
        pid in ('pro_monthly', 'pro_annual')
        or req_plan in ('pro', 'growth_pro', 'growth merchant')
    )

    if amount_naira >= Decimal('34990') and (abs(amount_naira - Decimal('35000')) < Decimal('10') or (is_pro_intent and cycle == 'annual')):
        return True, 365, 'annual', PRO_PLANS['pro_annual']['credits'], PRO_PLANS['pro_annual']['label']

    if is_pro_intent and amount_naira >= Decimal('3495') and abs(amount_naira - Decimal('3500')) < Decimal('10'):
        return True, 30, 'monthly', PRO_PLANS['pro_monthly']['credits'], PRO_PLANS['pro_monthly']['label']

    # Credit Packs (never accidentally upgrade Pro)
    for pack in CREDIT_PACKS.values():
        if abs(amount_naira - pack['price_ngn']) < Decimal('5'):
            return False, 0, '', pack['credits'], f"{pack['label']} ({pack['credits']} BizCredits)"

    for legacy_price, legacy_credits in LEGACY_TOPUP_CREDITS.items():
        if abs(amount_naira - Decimal(str(legacy_price))) < Decimal('5'):
            return False, 0, '', legacy_credits, f"Credit Top-up ({legacy_credits} BizCredits)"

    fallback_credits = max(1, int(amount_naira / Decimal('10')))
    return False, 0, '', fallback_credits, f"Credit Top-up ({fallback_credits} BizCredits)"


class BillingCatalogView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        packs = [
            {
                'id': p['id'],
                'label': p['label'],
                'price': float(p['price_ngn']),
                'credits': p['credits'],
                'bonusCredits': p['bonus_credits'],
                'desc': p['desc'],
                'popular': bool(p.get('popular', False)),
            }
            for p in CREDIT_PACKS.values()
        ]
        plans = {
            k: {
                'id': v['id'],
                'label': v['label'],
                'billingCycle': v['billing_cycle'],
                'price': float(v['price_ngn']),
                'credits': v['credits'],
                'durationDays': v['duration_days'],
            }
            for k, v in PRO_PLANS.items()
        }
        return Response({
            'packs': packs,
            'plans': plans,
            'aiCreditCosts': AI_CREDIT_COSTS,
        })

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
        try:
            amount = Decimal(str(request.data.get('amount') or '0'))
        except (InvalidOperation, ValueError, TypeError):
            amount = Decimal('0')
        if amount <= 0:
            return Response({"error": "Invalid amount specified"}, status=status.HTTP_400_BAD_REQUEST)

        tx = Transaction.objects.create(
            user=request.user,
            amount=amount,
            description="Credit Top-up via Paystack",
            provider="PAYSTACK",
            type="CREDIT_TOPUP",
            status="PENDING",
            reference=f"T_{request.user.id}_{uuid.uuid4().hex[:12].upper()}"
        )

        return Response({
            "message": "Transaction initialized",
            "reference": tx.reference,
            "amount": tx.amount
        }, status=status.HTTP_201_CREATED)


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = str(request.data.get('reference') or '').strip()
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
            url = f"https://api.paystack.co/transaction/verify/{urllib.parse.quote(reference)}"
            response = requests.get(url, headers=headers, timeout=15)
            response_data = response.json()

            if response.status_code == 200 and response_data.get('status') and response_data.get('data', {}).get('status') == 'success':
                data = response_data['data']
                currency = str(data.get('currency') or '').upper()
                if currency != 'NGN':
                    return Response(
                        {"error": "Unsupported payment currency. Only NGN payments are accepted."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                paystack_amount_kobo = data.get('amount')
                if paystack_amount_kobo is None:
                    return Response({"error": "Invalid amount in payment verification response"}, status=status.HTTP_400_BAD_REQUEST)
                paystack_amount_naira = Decimal(str(paystack_amount_kobo)) / Decimal('100')

                meta = data.get('metadata') or {}
                if not isinstance(meta, dict):
                    meta = {}
                # Reject cross-account or non-billing Paystack reference replay
                meta_uid = meta.get('user_id')
                if meta_uid is not None and str(meta_uid) != '' and str(meta_uid) != str(request.user.id):
                    return Response({"error": "Payment reference belongs to a different account."}, status=status.HTTP_403_FORBIDDEN)
                meta_purpose = str(meta.get('purpose') or '').upper()
                if meta_purpose in ('STOREFRONT_ORDER', 'DEBT_SETTLEMENT', 'CAC_HIRE'):
                    return Response({"error": "Payment reference belongs to another checkout flow."}, status=status.HTTP_403_FORBIDDEN)

                with transaction.atomic():
                    user = User.objects.select_for_update().get(id=request.user.id)

                    # Reject reference already claimed for a different flow or different user
                    claimed = PaymentReferenceLedger.objects.select_for_update().filter(reference=reference).first()
                    if claimed:
                        if claimed.purpose not in ('BILLING_TOPUP', 'SUBSCRIPTION') or (claimed.user_id and claimed.user_id != user.id):
                            return Response({"error": "Payment reference has already been claimed by another flow or account."}, status=status.HTTP_409_CONFLICT)

                    # Check for idempotency: if transaction reference already processed
                    existing_tx = Transaction.objects.filter(reference=reference, status='SUCCESS').first()
                    if existing_tx:
                        if existing_tx.user_id and existing_tx.user_id != user.id:
                            return Response({"error": "Payment reference belongs to a different account."}, status=status.HTTP_403_FORBIDDEN)
                        return Response({
                            "message": "Payment already verified",
                            "credits": user.credits,
                            "plan": getattr(user, 'effective_plan', getattr(user, 'plan', 'Free')),
                            "is_pro": getattr(user, 'has_active_pro', False),
                        }, status=status.HTTP_200_OK)

                    requested_plan = str(request.data.get('plan') or meta.get('plan') or '').strip().lower()
                    billing_cycle = str(request.data.get('billing_cycle') or meta.get('billing_cycle') or '').strip().lower()
                    pack_id = str(request.data.get('pack_id') or meta.get('pack_id') or '').strip().lower()

                    is_pro_subscription, duration_days, cycle_label, credits_purchased, subscription_desc = _resolve_purchase(
                        paystack_amount_naira, requested_plan, billing_cycle, pack_id
                    )

                    if not claimed:
                        PaymentReferenceLedger.objects.create(
                            reference=reference,
                            purpose='SUBSCRIPTION' if is_pro_subscription else 'BILLING_TOPUP',
                            user=user,
                            amount_ngn=paystack_amount_naira,
                            target_id=str(user.id),
                        )

                    tx, created = Transaction.objects.get_or_create(
                        reference=reference,
                        defaults={
                            'user': user,
                            'amount': paystack_amount_naira,
                            'description': subscription_desc,
                            'provider': "PAYSTACK",
                            'type': "PURCHASE" if is_pro_subscription else "CREDIT_TOPUP",
                            'status': "SUCCESS"
                        }
                    )
                    if not created:
                        tx.user = user
                        tx.status = 'SUCCESS'
                        tx.amount = paystack_amount_naira
                        tx.description = subscription_desc
                        tx.type = "PURCHASE" if is_pro_subscription else "CREDIT_TOPUP"
                        tx.save(update_fields=['user', 'status', 'amount', 'description', 'type'])

                    update_fields = ['credits']
                    user.credits += credits_purchased
                    if is_pro_subscription:
                        now = timezone.now()
                        base_dt = user.plan_expires_at if (user.plan_expires_at and user.plan_expires_at > now) else now
                        user.plan = 'Pro'
                        user.plan_expires_at = base_dt + timedelta(days=duration_days)
                        user.plan_billing_cycle = cycle_label
                        update_fields.extend(['plan', 'plan_expires_at', 'plan_billing_cycle'])
                    user.save(update_fields=update_fields)

                    if is_pro_subscription:
                        try:
                            from marketplace.models import VendorVerification
                            VendorVerification.objects.get_or_create(
                                user=user,
                                defaults={'business_name': getattr(user, 'business_name', '') or getattr(user, 'username', '')}
                            )
                        except Exception as v_err:
                            logger.warning("Could not ensure vendor profile on Pro upgrade: %s", v_err)

                    CreditLedger.objects.create(
                        user=user,
                        amount=credits_purchased,
                        activity=subscription_desc
                    )

                    return Response({
                        "message": "Welcome to Growth Merchant Pro! Your account and wallet have been upgraded." if is_pro_subscription else "Payment verified successfully",
                        "credits": user.credits,
                        "added": credits_purchased,
                        "plan": getattr(user, 'effective_plan', user.plan),
                        "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
                        "is_pro": getattr(user, 'has_active_pro', user.plan == 'Pro'),
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
    MAX_SINGLE_DEDUCTION = 50

    def post(self, request):
        try:
            credit_cost = int(request.data.get('amount', 0))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid credit amount specified.'}, status=status.HTTP_400_BAD_REQUEST)

        if credit_cost < 0:
            return Response({'error': 'Invalid credit amount specified.'}, status=status.HTTP_400_BAD_REQUEST)

        if credit_cost > self.MAX_SINGLE_DEDUCTION:
            return Response(
                {'error': f'Credit deduction exceeds maximum single-action limit ({self.MAX_SINGLE_DEDUCTION}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        activity = str(request.data.get('activity', 'AI Generation')).strip() or 'AI Generation'

        if credit_cost == 0:
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
        product_title = request.data.get('product_title') or request.data.get('title') or 'Marketplace Product'

        # Prevent runaway abuse: allow up to 10 share rewards per 24 hours atomically
        reward_amount = 5
        since_time = timezone.now() - timedelta(hours=24)
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=request.user.id)
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
        if not (request.user.is_staff or request.user.is_superuser):
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

        # 5. POS Retail Day-Book & Cashflow (exclude voided entries)
        total_sales_volume = float(DailySale.objects.filter(is_voided=False).aggregate(total=Sum('total_amount'))['total'] or 0)
        total_sales_count = DailySale.objects.filter(is_voided=False).count()
        cash_sales_volume = float(DailySale.objects.filter(is_voided=False, payment_method='CASH').aggregate(total=Sum('total_amount'))['total'] or 0)
        transfer_sales_volume = float(DailySale.objects.filter(is_voided=False, payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('total_amount'))['total'] or 0)
        credit_sales_volume = float(DailySale.objects.filter(is_voided=False, payment_method='CREDIT').aggregate(total=Sum('total_amount'))['total'] or 0)
        total_expenses_volume = float(DailyExpense.objects.filter(is_voided=False).aggregate(total=Sum('amount'))['total'] or 0)
        total_expenses_count = DailyExpense.objects.filter(is_voided=False).count()

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
    """
    Cryptographically secure, idempotent Paystack Webhook Handler.
    Verifies HMAC-SHA512 signature against PAYSTACK_SECRET_KEY,
    and atomically credits user wallet/subscription in case client connection dropped.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hmac
        import hashlib
        import json

        paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
        if not paystack_secret:
            print("[WEBHOOK ERROR] PAYSTACK_SECRET_KEY missing on server.")
            return Response({"error": "Gateway not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        paystack_sig = request.headers.get('x-paystack-signature') or request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')
        if not paystack_sig:
            print("[WEBHOOK REJECTED] Missing x-paystack-signature header.")
            return Response({"error": "Signature required"}, status=status.HTTP_400_BAD_REQUEST)

        # Compute HMAC SHA512 signature on raw payload
        raw_body = request.body
        computed_sig = hmac.new(
            paystack_secret.encode('utf-8'),
            msg=raw_body,
            digestmod=hashlib.sha512
        ).hexdigest()

        if not hmac.compare_digest(computed_sig, paystack_sig):
            print(f"[WEBHOOK REJECTED] Signature mismatch! Computed: {computed_sig[:10]}... Got: {paystack_sig[:10]}...")
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_data = json.loads(raw_body.decode('utf-8'))
        except Exception as e:
            return Response({"error": f"Invalid JSON payload: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        event = event_data.get('event')
        data = event_data.get('data', {})

        if event == 'charge.success':
            reference = str(data.get('reference') or '').strip()
            currency = data.get('currency')
            if currency is not None and str(currency).strip() != '' and str(currency).upper() != 'NGN':
                return Response({"status": "ignored_unsupported_currency"}, status=status.HTTP_200_OK)
            amount_kobo = data.get('amount') or 0
            amount_naira = Decimal(str(amount_kobo)) / Decimal('100')
            customer_email = (data.get('customer') or {}).get('email', '')
            metadata = data.get('metadata') or {}
            if not isinstance(metadata, dict):
                metadata = {}

            if not reference:
                return Response({"status": "ignored", "reason": "No reference in payload"}, status=status.HTTP_200_OK)

            meta_purpose = str(metadata.get('purpose') or '').upper()
            if meta_purpose in ('STOREFRONT_ORDER', 'DEBT_SETTLEMENT', 'CAC_HIRE'):
                return Response({"status": "ignored_non_billing_flow"}, status=status.HTTP_200_OK)

            with transaction.atomic():
                # 1. Idempotency Check: if reference already fulfilled or claimed by non-billing flow
                claimed = PaymentReferenceLedger.objects.select_for_update().filter(reference=reference).first()
                if claimed and claimed.purpose not in ('BILLING_TOPUP', 'SUBSCRIPTION'):
                    return Response({"status": "ignored_cross_flow"}, status=status.HTTP_200_OK)
                existing_success = Transaction.objects.filter(reference=reference, status='SUCCESS').exists()
                if existing_success:
                    return Response({"status": "already_processed"}, status=status.HTTP_200_OK)

                # 2. Resolve matching User strictly by metadata.user_id first, or email only when metadata isn't storefront
                user_id = metadata.get('user_id')
                user = None
                if user_id:
                    user = User.objects.select_for_update().filter(id=user_id).first()
                if not user and customer_email and (metadata.get('pack_id') or metadata.get('plan') or metadata.get('billing_cycle')):
                    user = User.objects.select_for_update().filter(email__iexact=customer_email).first()
                if not user and customer_email and not metadata:
                    user = User.objects.select_for_update().filter(email__iexact=customer_email).first()

                if not user:
                    Transaction.objects.update_or_create(
                        reference=reference,
                        defaults={
                            'user': None,
                            'amount': amount_naira,
                            'description': f"Unlinked Storefront/Guest Payment (Ref: {reference})",
                            'provider': "PAYSTACK",
                            'type': "PURCHASE",
                            'status': "SUCCESS"
                        }
                    )
                    return Response({"status": "recorded_unlinked"}, status=status.HTTP_200_OK)

                requested_plan = str(metadata.get('plan') or '').strip().lower()
                billing_cycle = str(metadata.get('billing_cycle') or '').strip().lower()
                pack_id = str(metadata.get('pack_id') or '').strip().lower()
                is_pro_subscription, duration_days, cycle_label, credits_purchased, subscription_desc = _resolve_purchase(
                    amount_naira, requested_plan, billing_cycle, pack_id
                )

                if not claimed:
                    PaymentReferenceLedger.objects.create(
                        reference=reference,
                        purpose='SUBSCRIPTION' if is_pro_subscription else 'BILLING_TOPUP',
                        user=user,
                        amount_ngn=amount_naira,
                        target_id=str(user.id),
                    )

                Transaction.objects.update_or_create(
                    reference=reference,
                    defaults={
                        'user': user,
                        'amount': amount_naira,
                        'description': subscription_desc,
                        'provider': "PAYSTACK",
                        'type': "PURCHASE" if is_pro_subscription else "CREDIT_TOPUP",
                        'status': "SUCCESS"
                    }
                )

                update_fields = ['credits']
                user.credits += credits_purchased
                if is_pro_subscription:
                    now = timezone.now()
                    base_dt = user.plan_expires_at if (user.plan_expires_at and user.plan_expires_at > now) else now
                    user.plan = 'Pro'
                    user.plan_expires_at = base_dt + timedelta(days=duration_days)
                    user.plan_billing_cycle = cycle_label
                    update_fields.extend(['plan', 'plan_expires_at', 'plan_billing_cycle'])
                user.save(update_fields=update_fields)

                CreditLedger.objects.create(
                    user=user,
                    amount=credits_purchased,
                    activity=f"Paystack Top-up (Ref: {reference})"
                )

                if is_pro_subscription:
                    try:
                        from marketplace.models import VendorVerification
                        VendorVerification.objects.get_or_create(
                            user=user,
                            defaults={'business_name': getattr(user, 'business_name', '') or getattr(user, 'username', '')}
                        )
                    except Exception:
                        pass

        elif event in ('subscription.disable', 'invoice.payment_failed'):
            customer_email = (data.get('customer') or {}).get('email', '')
            if customer_email:
                with transaction.atomic():
                    sub_user = User.objects.select_for_update().filter(email__iexact=customer_email).first()
                    if sub_user and sub_user.plan == 'Pro':
                        sub_user.plan = 'Free'
                        sub_user.plan_expires_at = timezone.now()
                        sub_user.save(update_fields=['plan', 'plan_expires_at'])

        return Response({"status": "processed"}, status=status.HTTP_200_OK)


class SquadWebhookView(APIView):
    """
    HabariPay / Squad Webhook Handler with strict signature verification.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hmac
        import hashlib

        squad_secret = getattr(settings, 'SQUAD_SECRET_KEY', None) or os.getenv('SQUAD_SECRET_KEY', '')
        if not squad_secret:
            return Response({"error": "Squad gateway not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        squad_sig = request.headers.get('x-squad-signature') or request.META.get('HTTP_X_SQUAD_SIGNATURE', '')
        if not squad_sig:
            return Response({"error": "Signature required"}, status=status.HTTP_400_BAD_REQUEST)

        raw_body = request.body
        computed_sig = hmac.new(
            squad_secret.encode('utf-8'),
            msg=raw_body,
            digestmod=hashlib.sha512
        ).hexdigest()
        if not hmac.compare_digest(computed_sig, squad_sig):
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except Exception:
            return Response({"error": "Invalid JSON"}, status=status.HTTP_400_BAD_REQUEST)

        data = payload.get('Body') or payload.get('data') or {}
        reference = data.get('transaction_ref') or data.get('reference')

        if reference:
            with transaction.atomic():
                existing = Transaction.objects.filter(reference=reference, status='SUCCESS').exists()
                if existing:
                    return Response({"status": "already_processed"}, status=status.HTTP_200_OK)

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
