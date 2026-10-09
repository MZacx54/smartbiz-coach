from django.urls import path
from .views import (
    TransactionListView, 
    CreditPurchaseView, 
    VerifyPaymentView, 
    DeductCreditsView, 
    CreditLedgerListView, 
    PaystackConfigView, 
    AdminTransactionsView,
    PaystackWebhookView,
    RewardShareView
)

urlpatterns = [
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('ledger/', CreditLedgerListView.as_view(), name='credit-ledger'),
    path('buy-credits/', CreditPurchaseView.as_view(), name='buy-credits'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('webhook/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('deduct-credits/', DeductCreditsView.as_view(), name='deduct-credits'),
    path('reward-share/', RewardShareView.as_view(), name='reward-share'),
    path('config/', PaystackConfigView.as_view(), name='billing-config'),
    path('admin/transactions/', AdminTransactionsView.as_view(), name='admin-transactions'),
]
