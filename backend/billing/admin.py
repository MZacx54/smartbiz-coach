from django.contrib import admin
from .models import Transaction, CreditPurchase, CreditLedger

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['reference', 'user', 'amount', 'type', 'provider', 'status', 'created_at']
    list_filter = ['status', 'type', 'provider']
    search_fields = ['reference', 'user__username', 'user__email']

@admin.register(CreditPurchase)
class CreditPurchaseAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'timestamp']
    search_fields = ['user__username', 'user__email']

@admin.register(CreditLedger)
class CreditLedgerAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'activity', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'user__email', 'activity']
