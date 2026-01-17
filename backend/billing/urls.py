from .views import TransactionListView, CreditPurchaseView, VerifyPaymentView, VerifySquadPaymentView

urlpatterns = [
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('buy-credits/', CreditPurchaseView.as_view(), name='buy-credits'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('verify-squad-payment/', VerifySquadPaymentView.as_view(), name='verify-squad-payment'),
]
