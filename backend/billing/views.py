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

                # Map Naira amount to Credit Packs (Starter: N300=30, Grower: N1000=120, Pro: N3000=400)
                # Fallback to 1 Credit per N10 if custom amount
                credits_purchased = 0
                if abs(paystack_amount_naira - 300) < 5:
                    credits_purchased = 30
                elif abs(paystack_amount_naira - 1000) < 5:
                    credits_purchased = 120
                elif abs(paystack_amount_naira - 3000) < 5:
                    credits_purchased = 400
                else:
                    # Generic fallback: N10 per credit
                    credits_purchased = int(paystack_amount_naira / 10)

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
        credit_cost = request.data.get('amount')
        activity = request.data.get('activity', 'AI Generation')

        if not credit_cost or not isinstance(credit_cost, int) or credit_cost <= 0:
            return Response({"error": "Valid positive credit amount required"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        
        # Calculate daily limit
        daily_limit = 50 if getattr(user, 'plan', 'Free') == 'Free' else 200
        
        # Calculate today's spent credits
        from django.utils import timezone
        from django.db.models import Sum
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        spent_today_sum = CreditLedger.objects.filter(
            user=user,
            amount__lt=0,
            created_at__gte=today_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        spent_today = abs(spent_today_sum)
        
        if spent_today + credit_cost > daily_limit:
            return Response({
                "error": f"Daily usage limit reached. You can only spend up to {daily_limit} credits per day on your {getattr(user, 'plan', 'Free')} plan.",
                "daily_limit": daily_limit,
                "spent_today": spent_today,
                "credits": user.credits
            }, status=status.HTTP_400_BAD_REQUEST)

        if user.credits < credit_cost:
            return Response({
                "error": "Insufficient credits",
                "credits": user.credits
            }, status=status.HTTP_400_BAD_REQUEST)

        # Deduct credits
        user.credits -= credit_cost
        user.save()

        # Log to ledger
        CreditLedger.objects.create(
            user=user,
            amount=-credit_cost,
            activity=activity
        )

        return Response({
            "message": "Credits deducted successfully",
            "credits": user.credits
        }, status=status.HTTP_200_OK)

class PaystackConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({
            "publicKey": getattr(settings, 'PAYSTACK_PUBLIC_KEY', '') or ''
        })

class AdminTransactionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser or request.user.email == 'meshachzax@gmail.com'):
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Sum
        from marketplace.models import Lead, VendorVerification

        # 1. AI BizCredit Platform Revenue
        all_transactions = Transaction.objects.all().order_by('-created_at')
        total_credit_revenue = all_transactions.filter(status='SUCCESS').aggregate(total=Sum('amount'))['total'] or 0

        credit_txs_data = []
        for tx in all_transactions[:200]:
            credit_txs_data.append({
                'id': tx.id,
                'username': tx.user.username,
                'email': tx.user.email,
                'business_name': getattr(tx.user, 'business_name', '') or tx.user.username,
                'amount': float(tx.amount),
                'description': tx.description,
                'status': tx.status,
                'reference': tx.reference,
                'created_at': tx.created_at.isoformat()
            })

        # 2. Storefront Products GMV (Gross Merchandise Value)
        all_orders = Lead.objects.filter(lead_type='ORDER').order_by('-created_at')
        storefront_gmv = all_orders.aggregate(total=Sum('quoted_price'))['total'] or 0

        order_txs_data = []
        for ord in all_orders[:200]:
            order_txs_data.append({
                'id': ord.id,
                'business_name': ord.brand.business_name if ord.brand else 'Merchant Store',
                'customer_name': ord.customer_name,
                'customer_contact': ord.customer_contact,
                'product_name': ord.product.name if ord.product else 'Storefront Product',
                'amount': float(ord.quoted_price or 0),
                'details': ord.message,
                'status': 'SUCCESS' if ord.status in ['WON', 'NEW', 'FOLLOW_UP'] else 'CANCELLED',
                'created_at': ord.created_at.isoformat()
            })

        # 3. Merchant Subaccount Settlement Directory
        vendors = VendorVerification.objects.all().order_by('-created_at')
        vendors_data = []
        for v in vendors:
            vendors_data.append({
                'id': v.id,
                'business_name': v.business_name,
                'business_type': v.business_type,
                'whatsapp_number': v.whatsapp_number,
                'bank_name': v.bank_name or 'Not Connected',
                'account_number': v.account_number or 'N/A',
                'account_name': v.account_name or 'N/A',
                'paystack_subaccount_code': v.paystack_subaccount_code or 'Pending Link',
                'is_verified': v.is_verified,
                'created_at': v.created_at.isoformat()
            })

        return Response({
            'total_revenue': float(total_credit_revenue), # AI Wallet Credit Purchases Revenue
            'storefront_gmv': float(storefront_gmv),      # Combined Storefront Orders GMV
            'combined_total': float(total_credit_revenue) + float(storefront_gmv),
            'total_count': all_transactions.count() + all_orders.count(),
            'success_count': all_transactions.filter(status='SUCCESS').count() + all_orders.count(),
            'failed_count': all_transactions.filter(status='FAILED').count(),
            'pending_count': all_transactions.filter(status='PENDING').count(),
            'active_subaccounts_count': vendors.filter(paystack_subaccount_code__isnull=False).exclude(paystack_subaccount_code='').count(),
            'transactions': credit_txs_data, # Backward compatibility
            'credit_transactions': credit_txs_data,
            'storefront_orders': order_txs_data,
            'merchant_payout_directory': vendors_data
        }, status=status.HTTP_200_OK)
