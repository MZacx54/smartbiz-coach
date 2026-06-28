from django.urls import path
from .views import TransactionListView, CreditPurchaseView, VerifyPaymentView, DeductCreditsView, CreditLedgerListView

urlpatterns = [
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('ledger/', CreditLedgerListView.as_view(), name='credit-ledger'),
    path('buy-credits/', CreditPurchaseView.as_view(), name='buy-credits'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('deduct-credits/', DeductCreditsView.as_view(), name='deduct-credits'),
]
