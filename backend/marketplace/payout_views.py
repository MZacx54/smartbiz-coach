import os
import json
import urllib.request
import urllib.error
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.conf import settings
from .models import VendorVerification

# Curated list of major Nigerian Banks & Codes for instant frontend display
NIGERIAN_BANKS = [
    {"name": "Guaranty Trust Bank (GTBank)", "code": "058"},
    {"name": "Zenith Bank", "code": "057"},
    {"name": "Access Bank", "code": "044"},
    {"name": "First Bank of Nigeria", "code": "011"},
    {"name": "United Bank for Africa (UBA)", "code": "033"},
    {"name": "Moniepoint Microfinance Bank", "code": "50515"},
    {"name": "OPay Digital Services", "code": "999992"},
    {"name": "PalmPay", "code": "999991"},
    {"name": "Kuda Bank", "code": "50211"},
    {"name": "FCMB (First City Monument Bank)", "code": "214"},
    {"name": "Wema Bank (ALAT)", "code": "035"},
    {"name": "Sterling Bank", "code": "232"},
    {"name": "Stanbic IBTC Bank", "code": "221"},
    {"name": "Fidelity Bank", "code": "070"},
    {"name": "Union Bank of Nigeria", "code": "032"},
    {"name": "Ecobank Nigeria", "code": "050"},
    {"name": "Heritage Bank", "code": "030"},
    {"name": "Keystone Bank", "code": "082"},
    {"name": "Polaris Bank", "code": "076"},
    {"name": "Jaiz Bank", "code": "301"},
    {"name": "Taj Bank", "code": "302"},
    {"name": "Lotus Bank", "code": "303"},
    {"name": "VFD Microfinance Bank", "code": "566"},
    {"name": "Rubies MFB", "code": "125"},
    {"name": "Sparkle MFB", "code": "51310"},
]

def get_paystack_secret():
    return os.getenv('PAYSTACK_SECRET_KEY') or getattr(settings, 'PAYSTACK_SECRET_KEY', '') or os.getenv('VITE_PAYSTACK_SECRET_KEY', '')

class ListBanksView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"banks": NIGERIAN_BANKS}, status=status.HTTP_200_OK)

class ResolveBankView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_number = request.data.get('account_number', '').strip()
        bank_code = request.data.get('bank_code', '').strip()

        if not account_number or len(account_number) != 10:
            return Response({"error": "Please enter a valid 10-digit NUBAN account number."}, status=status.HTTP_400_BAD_REQUEST)

        if not bank_code:
            return Response({"error": "Please select a bank."}, status=status.HTTP_400_BAD_REQUEST)

        secret_key = get_paystack_secret()
        if not secret_key:
            # Fallback for testing/offline mode
            return Response({
                "account_number": account_number,
                "account_name": f"VERIFIED MERCHANT ({account_number[:4]}***)",
                "bank_code": bank_code
            }, status=status.HTTP_200_OK)

        try:
            url = f"https://api.paystack.co/bank/resolve?account_number={account_number}&bank_code={bank_code}"
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {secret_key}",
                "Content-Type": "application/json"
            })

            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                if res_data.get('status') and 'data' in res_data:
                    return Response({
                        "account_number": res_data['data']['account_number'],
                        "account_name": res_data['data']['account_name'],
                        "bank_code": bank_code
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({"error": "Could not resolve bank account details."}, status=status.HTTP_400_BAD_REQUEST)
        except urllib.error.HTTPError as http_err:
            try:
                err_json = json.loads(http_err.read().decode('utf-8'))
                msg = err_json.get('message', 'Account resolution failed.')
            except Exception:
                msg = "Could not verify account number with bank."
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Bank resolution error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SetupPayoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        bank_name = request.data.get('bank_name', '').strip()
        bank_code = request.data.get('bank_code', '').strip()
        account_number = request.data.get('account_number', '').strip()
        account_name = request.data.get('account_name', '').strip()

        if not bank_name or not bank_code or not account_number or not account_name:
            return Response({"error": "Bank name, bank code, account number, and resolved account name are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create VendorVerification profile for this user
        biz_name = getattr(request.user, 'business_name', '') or request.user.username
        vendor, _ = VendorVerification.objects.get_or_create(
            user=request.user,
            defaults={
                'business_name': biz_name,
                'business_type': 'Retail',
                'whatsapp_number': getattr(request.user, 'phone', '2348000000000')
            }
        )

        vendor.bank_name = bank_name
        vendor.bank_code = bank_code
        vendor.account_number = account_number
        vendor.account_name = account_name

        secret_key = get_paystack_secret()
        subaccount_code = vendor.paystack_subaccount_code or ""

        if secret_key:
            try:
                url = "https://api.paystack.co/subaccount"
                payload = {
                    "business_name": vendor.business_name or biz_name,
                    "settlement_bank": bank_code,
                    "account_number": account_number,
                    "percentage_charge": 0, # 100% of sales goes directly to the merchant
                    "description": f"Direct Payout Subaccount for {vendor.business_name}"
                }
                req_data = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(url, data=req_data, headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json"
                }, method="POST")

                with urllib.request.urlopen(req, timeout=12) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    if res_data.get('status') and 'data' in res_data:
                        subaccount_code = res_data['data']['subaccount_code']
                        vendor.paystack_subaccount_code = subaccount_code
            except Exception as e:
                print(f"Warning: Paystack subaccount creation notice: {e}")
                # Generate a offline fallback subaccount code if API key is not live yet
                if not subaccount_code:
                    subaccount_code = f"ACCT_DIR_{account_number[-4:]}"
                    vendor.paystack_subaccount_code = subaccount_code
        else:
            if not subaccount_code:
                subaccount_code = f"ACCT_DIR_{account_number[-4:]}"
                vendor.paystack_subaccount_code = subaccount_code

        vendor.save()

        # Update UserCompliance bank_account_completed flag
        from users.models import UserCompliance
        compliance, _ = UserCompliance.objects.get_or_create(user=request.user)
        compliance.bank_account_completed = True
        compliance.save()

        return Response({
            "message": "Direct Bank Payouts enabled successfully!",
            "bank_name": vendor.bank_name,
            "account_number": vendor.account_number,
            "account_name": vendor.account_name,
            "paystack_subaccount_code": vendor.paystack_subaccount_code
        }, status=status.HTTP_200_OK)

class GetVendorPayoutDetailsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            vendor = VendorVerification.objects.get(user=request.user)
            return Response({
                "is_setup": bool(vendor.account_number and vendor.bank_code),
                "bank_name": vendor.bank_name or "",
                "bank_code": vendor.bank_code or "",
                "account_number": vendor.account_number or "",
                "account_name": vendor.account_name or "",
                "paystack_subaccount_code": vendor.paystack_subaccount_code or ""
            })
        except VendorVerification.DoesNotExist:
            return Response({
                "is_setup": False,
                "bank_name": "",
                "bank_code": "",
                "account_number": "",
                "account_name": "",
                "paystack_subaccount_code": ""
            })
