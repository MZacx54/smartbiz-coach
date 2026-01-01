from django.urls import path
from .views import TransactionListView, CreditPurchaseView

urlpatterns = [
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('buy-credits/', CreditPurchaseView.as_view(), name='buy-credits'),
]
