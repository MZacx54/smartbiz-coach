"""
Test the live forgot-password API endpoint against api.smartbizcoach.com.ng
Run: python test_forgot_password.py
"""
import urllib.request
import urllib.error
import json

BASE = "https://api.smartbizcoach.com.ng/api/users"

def post(path, data):
    url = f"{BASE}/{path}/"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode())
        return e.code, body

print("=" * 55)
print("  SmartBiz Coach — Forgot Password Live Test")
print("=" * 55)

# ── Step 1: request a reset code ─────────────────────────
EMAIL = "admin@smartbizcoach.com.ng"   # change to a real registered email
print(f"\n[1] Sending reset code to: {EMAIL}")
status, body = post("forgot-password", {"email": EMAIL})
print(f"    Status : {status}")
print(f"    Body   : {body}")

if status == 200:
    print("\n[SUCCESS] forgot-password endpoint is ALIVE")
    if "debug_code" in body:
        print(f"[WARN] DEBUG mode - code returned in response: {body['debug_code']}")
        print("   (This means EMAIL_HOST_USER is not set on the server)")
    else:
        print("[INFO] Email dispatched via Brevo - check your inbox!")
else:
    print("\n[ERROR] Endpoint returned an error - check Railway logs")

print("\nDone.")
