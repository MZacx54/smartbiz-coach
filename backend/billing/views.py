import hmac
import hashlib
import requests
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Transaction, CreditPurchase, CreditLedger
from .serializers import TransactionSerializer, CreditPurchaseSerializer, CreditLedgerSerializer

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_at')

class CreditLedgerListView(generics.ListAPIView):
    serializer_class = CreditLedgerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CreditLedger.objects.filter(user=self.request.user).order_by('-created_at')

class CreditPurchaseView(generics.CreateAPIView):
    serializer_class = CreditPurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'payment'

    def post(self, request, *args, **kwargs):
        reference = request.data.get('reference')
        if not reference:
            return Response({"error": "No reference provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify with Paystack
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, timeout=15)
            response_data = response.json()

            if response_data.get('status') and response_data.get('data', {}).get('status') == 'success':
                paystack_amount_naira = response_data['data']['amount'] / 100
                
                # Concurrency-safe atomic transaction block with row-level locking
                with transaction.atomic():
                    User = get_user_model()
                    user = User.objects.select_for_update().get(id=request.user.id)

                    # Check if this transaction was already processed
                    if Transaction.objects.filter(reference=reference, status='SUCCESS').exists():
                        return Response({
                            "message": "Payment already processed",
                            "credits": user.credits
                        }, status=status.HTTP_200_OK)

                    # Create transaction record
                    Transaction.objects.create(
                        user=user,
                        amount=paystack_amount_naira,
                        description=f"Direct Credit Purchase - Ref: {reference}",
                        status='SUCCESS',
                        provider='PAYSTACK',
                        type='CREDIT_TOPUP',
                        reference=reference
                    )

                    # Map Naira amount to Credit Packs:
                    credits_purchased = 0
                    if abs(paystack_amount_naira - 500) < 5:
                        credits_purchased = 40
                    elif abs(paystack_amount_naira - 1500) < 5:
                        credits_purchased = 150
                    elif abs(paystack_amount_naira - 3500) < 5:
                        credits_purchased = 400
                    elif abs(paystack_amount_naira - 7500) < 5:
                        credits_purchased = 1000
                    elif abs(paystack_amount_naira - 15000) < 5:
                        credits_purchased = 2500
                    # Legacy packs compatibility
                    elif abs(paystack_amount_naira - 300) < 5:
                        credits_purchased = 30
                    elif abs(paystack_amount_naira - 1000) < 5:
                        credits_purchased = 120
                    elif abs(paystack_amount_naira - 3000) < 5:
                        credits_purchased = 400
                    else:
                        # Generic fallback: N10 per credit
                        credits_purchased = max(1, int(paystack_amount_naira / 10))

                    # Update user credits
                    user.credits += credits_purchased
                    user.save(update_fields=['credits'])

                    # Record in CreditLedger
                    CreditLedger.objects.create(
                        user=user,
                        amount=credits_purchased,
                        activity=f"Purchased credit pack ({credits_purchased} credits)"
                    )

                    return Response({
                        "message": "Payment verified successfully",
                        "credits": user.credits
                    }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Payment verification failed",
                    "details": response_data.get('message')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeductCreditsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        credit_cost = request.data.get('amount', 0)
        activity = request.data.get('activity', 'AI Generation')

        user = request.user
        if isinstance(credit_cost, int) and credit_cost > 0:
            deduct_amt = min(user.credits, credit_cost) if user.credits > 0 else 0
            if deduct_amt > 0:
                user.credits -= deduct_amt
                user.save()

                CreditLedger.objects.create(
                    user=user,
                    amount=-deduct_amt,
                    activity=activity
                )

        return Response({
            "message": "Credits processed successfully",
            "credits": user.credits
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
        # Allow staff, superusers, or designated admin emails only
        user_email = (getattr(request.user, 'email', '') or '').strip().lower()
        trusted_admins = {
            'meshachzax@gmail.com',
            'admin@smartbiz.com.ng',
            'admin@smartbizcoach.com.ng',
            'partners@smartbizcoach.com.ng',
            'info@smartbizcoach.com.ng',
            'mzacs54@gmail.com',
        }
        is_admin_authorized = (
            request.user.is_staff or 
            request.user.is_superuser or 
            user_email in trusted_admins
        )
        if not is_admin_authorized:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Sum
        from marketplace.models import Lead, VendorVerification, Product, DailySale, DailyExpense
        from users.models import User, AgentHireRequest, PartnershipInquiry

        try:
            total_users_count = User.objects.count()
            active_users_count = User.objects.filter(is_active=True).count()
            onboarded_users_count = User.objects.filter(has_onboarded=True).count()
        except Exception:
            total_users_count = 1
            active_users_count = 1
            onboarded_users_count = 1

        try:
            total_products_count = Product.objects.count()
        except Exception:
            total_products_count = 0

        try:
            total_cac_requests = AgentHireRequest.objects.count()
            paid_cac_requests = AgentHireRequest.objects.filter(payment_status='PAID').count()
        except Exception:
            total_cac_requests = 0
            paid_cac_requests = 0

        # 1. AI BizCredit Platform Revenue
        credit_txs_data = []
        total_credit_revenue = 0
        try:
            all_transactions = Transaction.objects.all().order_by('-created_at')
            total_credit_revenue = all_transactions.filter(status='SUCCESS').aggregate(total=Sum('amount'))['total'] or 0

            for tx in all_transactions[:200]:
                username = tx.user.username if tx.user else 'User'
                email = tx.user.email if tx.user else 'No Email'
                biz_name = (getattr(tx.user, 'business_name', '') if tx.user else '') or username
                credit_txs_data.append({
                    'id': tx.id,
                    'username': username,
                    'email': email,
                    'business_name': biz_name,
                    'amount': float(tx.amount or 0),
                    'description': tx.description or '',
                    'status': tx.status or 'PENDING',
                    'reference': tx.reference or '',
                    'created_at': tx.created_at.isoformat() if getattr(tx, 'created_at', None) else ''
                })
        except Exception as e:
            print(f"Transactions query notice: {e}")
            all_transactions = Transaction.objects.none()

        # 2. Storefront Products GMV (Gross Merchandise Value - ONLY Verified Paid Orders)
        order_txs_data = []
        storefront_gmv = 0
        try:
            all_orders = Lead.objects.filter(lead_type='ORDER').order_by('-created_at')
            paid_orders = all_orders.filter(status='WON')
            storefront_gmv = paid_orders.aggregate(total=Sum('quoted_price'))['total'] or 0

            for ord in all_orders[:200]:
                is_paid = (ord.status == 'WON')
                brand_name = getattr(ord.brand, 'business_name', 'Merchant Store') if getattr(ord, 'brand', None) else 'Merchant Store'
                prod_name = getattr(ord.product, 'name', 'Storefront Product') if getattr(ord, 'product', None) else 'Storefront Product'
                order_txs_data.append({
                    'id': ord.id,
                    'business_name': brand_name,
                    'customer_name': getattr(ord, 'customer_name', 'Customer'),
                    'customer_contact': getattr(ord, 'customer_contact', 'N/A'),
                    'product_name': prod_name,
                    'amount': float(ord.quoted_price or 0),
                    'details': getattr(ord, 'message', '') or '',
                    'status': 'PAID (Paystack Verified)' if is_paid else 'PENDING (WhatsApp Inquiry)',
                    'is_paid': is_paid,
                    'created_at': ord.created_at.isoformat() if getattr(ord, 'created_at', None) else ''
                })
        except Exception as e:
            print(f"Orders query notice: {e}")
            all_orders = Lead.objects.none()

        # 3. Merchant Subaccount Settlement Directory
        vendors_data = []
        active_subaccounts_count = 0
        try:
            vendors = VendorVerification.objects.all().order_by('-created_at')
            for v in vendors:
                bank_name = getattr(v, 'bank_name', '') or 'Not Connected'
                acc_num = getattr(v, 'account_number', '') or 'N/A'
                acc_name = getattr(v, 'account_name', '') or 'N/A'
                sub_code = getattr(v, 'paystack_subaccount_code', '') or 'Pending Link'
                if sub_code and sub_code != 'Pending Link':
                    active_subaccounts_count += 1

                vendors_data.append({
                    'id': v.id,
                    'business_name': getattr(v, 'business_name', 'Merchant'),
                    'business_type': getattr(v, 'business_type', 'General'),
                    'whatsapp_number': getattr(v, 'whatsapp_number', ''),
                    'bank_name': bank_name,
                    'account_number': acc_num,
                    'account_name': acc_name,
                    'paystack_subaccount_code': sub_code,
                    'is_verified': getattr(v, 'is_verified', False),
                    'created_at': v.created_at.isoformat() if getattr(v, 'created_at', None) else ''
                })
        except Exception as e:
            print(f"Vendor payout directory query notice: {e}")

        # 4. Institutional & NGO Partnership Proposals
        partnership_data = []
        try:
            inquiries = PartnershipInquiry.objects.all().order_by('-created_at')
            for inq in inquiries[:200]:
                partnership_data.append({
                    'id': inq.id,
                    'organization': inq.organization,
                    'name': inq.name,
                    'email': inq.email,
                    'phone': inq.phone or 'N/A',
                    'partnership_type': inq.partnership_type,
                    'cohort_size': inq.cohort_size or 'Not specified',
                    'message': inq.message,
                    'source': inq.source,
                    'status': inq.status,
                    'created_at': inq.created_at.isoformat() if getattr(inq, 'created_at', None) else ''
                })
        except Exception as e:
            print(f"Partnership inquiries query notice: {e}")

        # 5. CAC Accredited Agent Desk Registrations
        cac_requests_data = []
        try:
            cac_regs = AgentHireRequest.objects.all().order_by('-created_at')
            for req in cac_regs[:200]:
                user_email_cac = req.user.email if req.user else 'No Email'
                user_name_cac = req.user.username if req.user else 'Anonymous'
                cac_requests_data.append({
                    'id': req.id,
                    'business_name': req.business_name,
                    'registration_type': req.registration_type,
                    'user_email': user_email_cac,
                    'user_name': user_name_cac,
                    'amount': float(req.amount or 0),
                    'payment_status': req.payment_status,
                    'payment_reference': req.payment_reference or 'N/A',
                    'status': req.status,
                    'created_at': req.created_at.isoformat() if getattr(req, 'created_at', None) else ''
                })
        except Exception as e:
            print(f"CAC requests query notice: {e}")

        # 6. POS Retail Day-Book & Expense Metrics
        pos_stats = {
            'total_sales_volume': 0.0,
            'total_sales_count': 0,
            'cash_sales_volume': 0.0,
            'transfer_sales_volume': 0.0,
            'credit_sales_volume': 0.0,
            'total_expenses_volume': 0.0,
            'total_expenses_count': 0,
        }
        try:
            all_sales = DailySale.objects.all()
            all_expenses = DailyExpense.objects.all()

            pos_stats['total_sales_count'] = all_sales.count()
            pos_stats['total_sales_volume'] = float(all_sales.aggregate(t=Sum('total_amount'))['t'] or 0.0)
            pos_stats['cash_sales_volume'] = float(all_sales.filter(payment_method='CASH').aggregate(t=Sum('total_amount'))['t'] or 0.0)
            pos_stats['transfer_sales_volume'] = float(all_sales.filter(payment_method='TRANSFER').aggregate(t=Sum('total_amount'))['t'] or 0.0)
            pos_stats['credit_sales_volume'] = float(all_sales.filter(payment_method='CREDIT').aggregate(t=Sum('total_amount'))['t'] or 0.0)

            pos_stats['total_expenses_count'] = all_expenses.count()
            pos_stats['total_expenses_volume'] = float(all_expenses.aggregate(t=Sum('amount'))['t'] or 0.0)
        except Exception as e:
            print(f"POS stats query notice: {e}")

        return Response({
            'total_users_count': total_users_count,
            'active_users_count': active_users_count,
            'onboarded_users_count': onboarded_users_count,
            'total_products_count': total_products_count,
            'total_cac_requests': total_cac_requests,
            'paid_cac_requests': paid_cac_requests,
            'total_revenue': float(total_credit_revenue), # AI Wallet Credit Purchases Revenue
            'storefront_gmv': float(storefront_gmv),      # Combined Storefront Orders GMV
            'combined_total': float(total_credit_revenue) + float(storefront_gmv),
            'total_count': all_transactions.count() + all_orders.count(),
            'success_count': all_transactions.filter(status='SUCCESS').count() + all_orders.count(),
            'failed_count': all_transactions.filter(status='FAILED').count(),
            'pending_count': all_transactions.filter(status='PENDING').count(),
            'active_subaccounts_count': active_subaccounts_count,
            'transactions': credit_txs_data, # Backward compatibility
            'credit_transactions': credit_txs_data,
            'storefront_orders': order_txs_data,
            'merchant_payout_directory': vendors_data,
            'partnership_inquiries': partnership_data,
            'cac_requests': cac_requests_data,
            'pos_stats': pos_stats,
        }, status=status.HTTP_200_OK)


class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        paystack_signature = request.headers.get('x-paystack-signature')
        secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', '') or ''

        if not paystack_signature or not secret_key:
            return Response({"error": "Signature or secret key missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Cryptographically verify webhook authenticity via HMAC SHA-512
        computed_signature = hmac.new(
            secret_key.encode('utf-8'),
            request.body,
            hashlib.sha512
        ).hexdigest()

        if not hmac.compare_digest(paystack_signature, computed_signature):
            return Response({"error": "Invalid HMAC signature"}, status=status.HTTP_400_BAD_REQUEST)

        event_data = request.data
        if event_data.get('event') == 'charge.success':
            data = event_data.get('data', {})
            reference = data.get('reference')
            amount_naira = (data.get('amount') or 0) / 100
            customer_email = data.get('customer', {}).get('email')

            if reference and customer_email:
                User = get_user_model()
                user = User.objects.filter(email__iexact=customer_email).first()
                if user:
                    with transaction.atomic():
                        user = User.objects.select_for_update().get(id=user.id)
                        if not Transaction.objects.filter(reference=reference, status='SUCCESS').exists():
                            Transaction.objects.create(
                                user=user,
                                amount=amount_naira,
                                description=f"Webhook Credit Purchase - Ref: {reference}",
                                status='SUCCESS',
                                provider='PAYSTACK',
                                type='CREDIT_TOPUP',
                                reference=reference
                            )
                            # Calculate credits
                            if abs(amount_naira - 500) < 5:
                                credits_purchased = 40
                            elif abs(amount_naira - 1500) < 5:
                                credits_purchased = 150
                            elif abs(amount_naira - 3500) < 5:
                                credits_purchased = 400
                            elif abs(amount_naira - 7500) < 5:
                                credits_purchased = 1000
                            else:
                                credits_purchased = max(1, int(amount_naira / 10))

                            user.credits += credits_purchased
                            user.save(update_fields=['credits'])
                            CreditLedger.objects.create(
                                user=user,
                                amount=credits_purchased,
                                activity=f"Webhook credit allocation ({credits_purchased} credits)"
                            )

        return Response({"status": "received"}, status=status.HTTP_200_OK)
