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
                            "credits": user.credits,
                            "plan": getattr(user, 'plan', 'Free'),
                            "is_pro": getattr(user, 'plan', '') == 'Pro'
                        }, status=status.HTTP_200_OK)

                    # Extract requested plan / billing cycle intent
                    requested_plan = str(request.data.get('plan') or '').strip().lower()
                    billing_cycle = str(request.data.get('billing_cycle') or '').strip().lower()

                    is_pro_subscription = False
                    subscription_desc = ""

                    # Server-side price enforcement: never trust client-submitted plan/amount without verified kobo amount
                    # 1. Pro Annual Subscription (₦35,000)
                    if paystack_amount_naira >= 34990 and (abs(paystack_amount_naira - 35000) < 10 or (requested_plan in ('pro', 'growth_pro', 'growth merchant') and billing_cycle == 'annual')):
                        is_pro_subscription = True
                        credits_purchased = 5000  # 5,000 BizCredits for Annual Pro (400/mo * 12 + 200 bonus)
                        subscription_desc = "Growth Merchant Pro (Annual) - 5,000 BizCredits Included"
                    # 2. Pro Monthly Subscription (₦3,500)
                    elif paystack_amount_naira >= 3495 and ((requested_plan in ('pro', 'growth_pro', 'growth merchant') and abs(paystack_amount_naira - 3500) < 10) or (abs(paystack_amount_naira - 3500) < 5 and getattr(user, 'plan', '') != 'Pro')):
                        is_pro_subscription = True
                        credits_purchased = 450   # 400 credits + 50 bonus
                        subscription_desc = "Growth Merchant Pro (Monthly) - 450 BizCredits Included"
                    # 3. Pay-As-You-Go Credit Packs:
                    elif abs(paystack_amount_naira - 500) < 5:
                        credits_purchased = 50    # 50 Credits Pocket Pack
                    elif abs(paystack_amount_naira - 1000) < 5:
                        credits_purchased = 110   # 110 Credits Starter (+10 Bonus)
                    elif abs(paystack_amount_naira - 1500) < 5:
                        credits_purchased = 175   # 175 Credits Starter Pack
                    elif abs(paystack_amount_naira - 2500) < 5:
                        credits_purchased = 300   # 300 Credits Growth (+50 Bonus)
                    elif abs(paystack_amount_naira - 3500) < 5:
                        credits_purchased = 450   # 450 Credits Grower Pack (Pay-as-you-go)
                    elif abs(paystack_amount_naira - 5000) < 5:
                        credits_purchased = 700   # 700 Credits Oga Pack (+200 Bonus)
                    elif abs(paystack_amount_naira - 7500) < 5:
                        credits_purchased = 1100  # 1,100 Credits Vendor Pro
                    elif abs(paystack_amount_naira - 15000) < 5:
                        credits_purchased = 2500  # 2,500 Credits Mogul
                    else:
                        # Fallback: 10 Naira = 1 Credit
                        credits_purchased = max(1, int(paystack_amount_naira / 10))

                    tx, created = Transaction.objects.get_or_create(
                        reference=reference,
                        defaults={
                            'user': user,
                            'amount': paystack_amount_naira,
                            'description': subscription_desc or f"Credit Top-up ({credits_purchased} BizCredits)",
                            'provider': "PAYSTACK",
                            'type': "PURCHASE" if is_pro_subscription else "CREDIT_TOPUP",
                            'status': "SUCCESS"
                        }
                    )
                    if not created:
                        tx.status = 'SUCCESS'
                        tx.amount = paystack_amount_naira
                        tx.description = subscription_desc or f"Credit Top-up ({credits_purchased} BizCredits)"
                        tx.type = "PURCHASE" if is_pro_subscription else "CREDIT_TOPUP"
                        tx.save(update_fields=['status', 'amount', 'description', 'type'])

                    # Update user credits and plan
                    update_fields = ['credits']
                    user.credits += credits_purchased
                    if is_pro_subscription:
                        user.plan = 'Pro'
                        update_fields.append('plan')
                    user.save(update_fields=update_fields)

                    # Ensure vendor profile record exists on Pro activation without bypassing KYC verification
                    if is_pro_subscription:
                        try:
                            from marketplace.models import VendorVerification
                            VendorVerification.objects.get_or_create(
                                user=user,
                                defaults={'business_name': getattr(user, 'business_name', '') or getattr(user, 'username', '')}
                            )
                        except Exception as v_err:
                            logger.warning("Could not ensure vendor profile on Pro upgrade: %s", v_err)

                    # Record in CreditLedger
                    CreditLedger.objects.create(
                        user=user,
                        amount=credits_purchased,
                        activity=subscription_desc or f"Purchased BizCredits ({credits_purchased} credits)"
                    )

                    return Response({
                        "message": "Welcome to Growth Merchant Pro! Your account and wallet have been upgraded." if is_pro_subscription else "Payment verified successfully",
                        "credits": user.credits,
                        "added": credits_purchased,
                        "plan": user.plan,
                        "is_pro": user.plan == 'Pro'
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
            reference = data.get('reference')
            amount_kobo = data.get('amount', 0)
            amount_naira = amount_kobo / 100.0
            customer_email = data.get('customer', {}).get('email', '')
            metadata = data.get('metadata', {}) or {}

            if not reference:
                return Response({"status": "ignored", "reason": "No reference in payload"}, status=status.HTTP_200_OK)

            with transaction.atomic():
                # 1. Idempotency Check: if reference already fulfilled
                existing_success = Transaction.objects.filter(reference=reference, status='SUCCESS').exists()
                if existing_success:
                    print(f"[WEBHOOK IDEMPOTENT] Reference {reference} already processed. Skipping duplicate fulfillment.")
                    return Response({"status": "already_processed"}, status=status.HTTP_200_OK)

                # 2. Resolve matching User
                user_id = metadata.get('user_id')
                user = None
                if user_id:
                    user = User.objects.select_for_update().filter(id=user_id).first()
                if not user and customer_email:
                    user = User.objects.select_for_update().filter(email__iexact=customer_email).first()

                if not user:
                    print(f"[WEBHOOK NOTE] Charge success for unlinked customer {customer_email} (Ref: {reference}, ₦{amount_naira})")
                    Transaction.objects.update_or_create(
                        reference=reference,
                        defaults={
                            'amount': amount_naira,
                            'description': f"Direct Storefront/Guest Payment (Ref: {reference})",
                            'provider': "PAYSTACK",
                            'type': "PURCHASE",
                            'status': "SUCCESS"
                        }
                    )
                    return Response({"status": "recorded_unlinked"}, status=status.HTTP_200_OK)

                # 3. Determine Plan or Credit Pack purchased
                requested_plan = str(metadata.get('plan') or '').strip().lower()
                billing_cycle = str(metadata.get('billing_cycle') or '').strip().lower()
                is_pro_subscription = False
                subscription_desc = ""

                if amount_naira >= 34990 and (abs(amount_naira - 35000) < 10 or (requested_plan in ('pro', 'growth_pro', 'growth merchant') and billing_cycle == 'annual')):
                    is_pro_subscription = True
                    credits_purchased = 5000
                    subscription_desc = "Growth Merchant Pro (Annual) - 5,000 BizCredits Included"
                elif amount_naira >= 3495 and ((requested_plan in ('pro', 'growth_pro', 'growth merchant') and abs(amount_naira - 3500) < 10) or (abs(amount_naira - 3500) < 5 and getattr(user, 'plan', '') != 'Pro')):
                    is_pro_subscription = True
                    credits_purchased = 450
                    subscription_desc = "Growth Merchant Pro (Monthly) - 450 BizCredits Included"
                elif abs(amount_naira - 500) < 5:
                    credits_purchased = 50
                elif abs(amount_naira - 1000) < 5:
                    credits_purchased = 110
                elif abs(amount_naira - 1500) < 5:
                    credits_purchased = 175
                elif abs(amount_naira - 2500) < 5:
                    credits_purchased = 300
                elif abs(amount_naira - 3500) < 5:
                    credits_purchased = 450
                elif abs(amount_naira - 5000) < 5:
                    credits_purchased = 700
                elif abs(amount_naira - 7500) < 5:
                    credits_purchased = 1100
                elif abs(amount_naira - 15000) < 5:
                    credits_purchased = 2500
                else:
                    credits_purchased = max(1, int(amount_naira / 10))

                # 4. Atomically persist Transaction & Credit Wallet
                tx, _ = Transaction.objects.update_or_create(
                    reference=reference,
                    defaults={
                        'user': user,
                        'amount': amount_naira,
                        'description': subscription_desc or f"Credit Top-up ({credits_purchased} BizCredits)",
                        'provider': "PAYSTACK",
                        'type': "PURCHASE" if is_pro_subscription else "CREDIT_TOPUP",
                        'status': "SUCCESS"
                    }
                )

                update_fields = ['credits']
                user.credits += credits_purchased
                if is_pro_subscription:
                    user.plan = 'Pro'
                    update_fields.append('plan')
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
                    except Exception as ve:
                        print(f"[WEBHOOK NOTE] VendorVerification auto-link notice: {ve}")

                print(f"[OK] Webhook fulfilled: +{credits_purchased} credits to {user.username} (Ref: {reference})")

        return Response({"status": "processed"}, status=status.HTTP_200_OK)


class SquadWebhookView(APIView):
    """
    HabariPay / Squad Webhook Handler with signature verification & atomic idempotency.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hmac
        import hashlib
        import json

        squad_secret = getattr(settings, 'SQUAD_SECRET_KEY', None) or os.getenv('SQUAD_SECRET_KEY', '')
        squad_sig = request.headers.get('x-squad-signature') or request.META.get('HTTP_X_SQUAD_SIGNATURE', '')

        raw_body = request.body
        if squad_secret and squad_sig:
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

        event = payload.get('Event') or payload.get('event')
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
