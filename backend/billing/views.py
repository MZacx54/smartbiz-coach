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

                # Map Naira amount to Credit Packs (Starter: N300=50, Grower: N1000=250, Pro: N3000=1000)
                # Fallback to 1 Credit per N6 if custom amount
                credits_purchased = 0
                if abs(paystack_amount_naira - 300) < 5:
                    credits_purchased = 50
                elif abs(paystack_amount_naira - 1000) < 5:
                    credits_purchased = 250
                elif abs(paystack_amount_naira - 3000) < 5:
                    credits_purchased = 1000
                else:
                    # Generic fallback: roughly N6 per credit
                    credits_purchased = int(paystack_amount_naira / 6)

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
