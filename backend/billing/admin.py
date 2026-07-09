from django.contrib import admin
from .models import Transaction, CreditPurchase, CreditLedger

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['reference', 'user', 'amount', 'type', 'provider', 'status', 'created_at']
    list_filter = ['status', 'type', 'provider']
    search_fields = ['reference', 'user__username', 'user__email']

    def save_model(self, request, obj, form, change):
        if change:
            try:
                old_obj = Transaction.objects.get(pk=obj.pk)
                if old_obj.status != 'SUCCESS' and obj.status == 'SUCCESS':
                    amount_naira = float(obj.amount)
                    credits_purchased = 0
                    if abs(amount_naira - 300) < 5:
                        credits_purchased = 50
                    elif abs(amount_naira - 1000) < 5:
                        credits_purchased = 250
                    elif abs(amount_naira - 3000) < 5:
                        credits_purchased = 1000
                    else:
                        credits_purchased = int(amount_naira / 6)

                    user = obj.user
                    user.credits += credits_purchased
                    user.save(update_fields=['credits'])

                    # Log to ledger without triggering another save override loop
                    CreditLedger.objects.create(
                        user=user,
                        amount=credits_purchased,
                        activity=f"Manual Admin Transaction approval ({credits_purchased} credits)"
                    )
            except Exception as e:
                print(f"Error in TransactionAdmin save override: {e}")
        super().save_model(request, obj, form, change)

@admin.register(CreditPurchase)
class CreditPurchaseAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'timestamp']
    search_fields = ['user__username', 'user__email']

@admin.register(CreditLedger)
class CreditLedgerAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'activity', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'user__email', 'activity']

    def save_model(self, request, obj, form, change):
        if not change:
            user = obj.user
            user.credits += obj.amount
            user.save(update_fields=['credits'])
        else:
            try:
                old_obj = CreditLedger.objects.get(pk=obj.pk)
                diff = obj.amount - old_obj.amount
                if diff != 0:
                    user = obj.user
                    user.credits += diff
                    user.save(update_fields=['credits'])
            except Exception as e:
                print(f"Error in CreditLedgerAdmin save override: {e}")
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        try:
            user = obj.user
            user.credits -= obj.amount
            user.save(update_fields=['credits'])
        except Exception as e:
            print(f"Error in CreditLedgerAdmin delete override: {e}")
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        try:
            for obj in queryset:
                user = obj.user
                user.credits -= obj.amount
                user.save(update_fields=['credits'])
        except Exception as e:
            print(f"Error in CreditLedgerAdmin delete_queryset override: {e}")
        super().delete_queryset(request, queryset)
