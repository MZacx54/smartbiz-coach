import requests
from django.conf import settings
from rest_framework import generics, permissions, status
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
            response = requests.get(url, headers=headers)
            response_data = response.json()

            if response_data.get('status') and response_data['data']['status'] == 'success':
                paystack_amount_naira = response_data['data']['amount'] / 100
                
                # Check if this transaction was already processed
                if Transaction.objects.filter(reference=reference, status='SUCCESS').exists():
                    return Response({
                        "message": "Payment already processed",
                        "credits": request.user.credits
                    }, status=status.HTTP_200_OK)

                # Create transaction record
                Transaction.objects.create(
                    user=request.user,
                    amount=paystack_amount_naira,
                    description=f"Direct Credit Purchase - Ref: {reference}",
                    status='SUCCESS',
                    provider='PAYSTACK',
                    type='CREDIT_TOPUP',
                    reference=reference
                )

                # Map Naira amount to Credit Packs:
                # - Micro Pack: N500 = 40 Credits
                # - Starter Pack: N1,500 = 150 Credits
                # - Grower Pack: N3,500 = 400 Credits
                # - Vendor Pro Pack: N7,500 = 1,000 Credits
                credits_purchased = 0
                if abs(paystack_amount_naira - 500) < 5:
                    credits_purchased = 40
                elif abs(paystack_amount_naira - 1500) < 5:
                    credits_purchased = 150
                elif abs(paystack_amount_naira - 3500) < 5:
                    credits_purchased = 400
                elif abs(paystack_amount_naira - 7500) < 5:
                    credits_purchased = 1000
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
                request.user.credits += credits_purchased
                request.user.save()

                # Record in CreditLedger
                CreditLedger.objects.create(
                    user=request.user,
                    amount=credits_purchased,
                    activity=f"Purchased credit pack ({credits_purchased} credits)"
                )

                return Response({
                    "message": "Payment verified successfully",
                    "credits": request.user.credits
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
        # Allow staff, superusers, Pro users, or admin emails
        user_email = (getattr(request.user, 'email', '') or '').lower()
        is_admin_authorized = (
            request.user.is_staff or 
            request.user.is_superuser or 
            getattr(request.user, 'plan', '') == 'Pro' or
            any(admin_email in user_email for admin_email in ['meshachzax@gmail.com', 'admin@smartbizcoach.com.ng', 'mzacs54@gmail.com', 'admin'])
        )
        if not is_admin_authorized:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Sum
        from marketplace.models import Lead, VendorVerification, Product
        from users.models import User, AgentHireRequest

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
            'merchant_payout_directory': vendors_data
        }, status=status.HTTP_200_OK)
