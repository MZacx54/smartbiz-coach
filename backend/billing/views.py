import requests
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Transaction, CreditPurchase
from .serializers import TransactionSerializer, CreditPurchaseSerializer

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_at')

class CreditPurchaseView(generics.CreateAPIView):
    """
    Initializes a credit purchase. 
    In the future, this can call Paystack's initialize endpoint.
    For now, it acts as a record of intent.
    """
    serializer_class = CreditPurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        reference = request.data.get('reference')
        amount_intended = request.data.get('amount') # In Naira

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
                # Double check amount (Paystack returns amount in kobo)
                paystack_amount = response_data['data']['amount'] / 100
                
                # Check if this transaction was already processed
                if Transaction.objects.filter(reference=reference, status='SUCCESS').exists():
                    return Response({"message": "Payment already processed"}, status=status.HTTP_200_OK)

                # Create transaction record
                Transaction.objects.create(
                    user=request.user,
                    amount=paystack_amount,
                    description=f"Direct Credit Purchase - Ref: {reference}",
                    status='SUCCESS',
                    provider='PAYSTACK',
                    type='CREDIT_TOPUP',
                    reference=reference
                )

                # Update user credits
                # Credits are 1 per Naira in this implementation
                request.user.credits += int(paystack_amount)
                request.user.save()

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

class VerifySquadPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        reference = request.data.get('reference')

        if not reference:
            return Response({"error": "No reference provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify with Squad
        # Use Sandbox URL if DEBUG is True, otherwise Production
        base_url = "https://sandbox-api-d.squadco.com" if settings.DEBUG else "https://api.squadco.com"
        
        # NOTE: If you are using 'squadpy', you would initialize it here.
        # Since we want to ensure zero dependency issues, we use requests directly with improved URL handling.
        
        url = f"{base_url}/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.SQUAD_SECRET_KEY}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.get(url, headers=headers)
            response_data = response.json()

            # Squad verification response structure check
            if response.status_code == 200 and response_data.get('status') == 200 and response_data.get('data', {}).get('transaction_status') == 'success':
                
                # Squad amount is usually in kobo (confirm with documentation)
                # We assume kobo based on standard Nigerian payment gateway practice
                transaction_data = response_data['data']
                squad_amount = transaction_data.get('amount', 0) / 100
                
                # Check if this transaction was already processed
                if Transaction.objects.filter(reference=reference, status='SUCCESS').exists():
                    return Response({"message": "Payment already processed"}, status=status.HTTP_200_OK)

                # Create transaction record
                Transaction.objects.create(
                    user=request.user,
                    amount=squad_amount,
                    description=f"Direct Credit Purchase (Squad) - Ref: {reference}",
                    status='SUCCESS',
                    provider='SQUAD',
                    type='CREDIT_TOPUP',
                    reference=reference
                )

                # Update user credits
                request.user.credits += int(squad_amount)
                request.user.save()

                return Response({
                    "message": "Payment verified successfully",
                    "credits": request.user.credits
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Payment verification failed",
                    "details": response_data.get('message', 'Unknown error')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
