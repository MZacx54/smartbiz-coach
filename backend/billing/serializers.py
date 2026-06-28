from rest_framework import serializers
from .models import Transaction, CreditPurchase, CreditLedger

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['user', 'status', 'reference']

class CreditPurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditPurchase
        fields = '__all__'
        read_only_fields = ['user', 'timestamp']

class CreditLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditLedger
        fields = '__all__'

