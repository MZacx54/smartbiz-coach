from rest_framework import generics, permissions
from .models import Transaction, CreditPurchase
from .serializers import TransactionSerializer, CreditPurchaseSerializer

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_at')

class CreditPurchaseView(generics.CreateAPIView):
    serializer_class = CreditPurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # In a real app, this would verify payment first
        purchase = serializer.save(user=self.request.user)
        # Update user credits
        self.request.user.credits += purchase.amount
        self.request.user.save()
