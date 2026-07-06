import urllib.request
import urllib.error
import json
import ssl

BASE = "https://api.smartbizcoach.com.ng/api/users"

# Bypass SSL verification if needed (common for custom subdomains/certificates)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def post(path, data):
    url = f"{BASE}/{path}/"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            body = json.loads(resp.read().decode())
            return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except Exception:
            body = e.reason
        return e.code, body

print("=" * 60)
print("  SmartBiz Coach — Live User Registration & Forgot Password Test")
print("=" * 60)

# Step 1: Register user
EMAIL = "noreply@smartbizcoach.com.ng"
USERNAME = "noreply_tester"
register_data = {
    "username": USERNAME,
    "email": EMAIL,
    "password": "TestPassword2026!",
    "business_name": "Test Business"
}

print(f"\n[1] Registering test user '{USERNAME}' with email '{EMAIL}'...")
status, body = post("register", register_data)
print(f"    Status : {status}")
print(f"    Body   : {body}")

if status == 201 or (status == 400 and "username" in body and "already exists" in str(body["username"])):
    print("\n[SUCCESS] Test user registered or already exists.")
    
    # Step 2: Request reset code
    print(f"\n[2] Requesting forgot-password reset code for: {EMAIL}")
    status_forgot, body_forgot = post("forgot-password", {"email": EMAIL})
    print(f"    Status : {status_forgot}")
    print(f"    Body   : {body_forgot}")
    
    if status_forgot == 200:
        print("\n[SUCCESS] Forgot password request completed!")
        print("Please check the inbox of 'noreply@smartbizcoach.com.ng' for the OTP code.")
    else:
        print("\n[ERROR] forgot-password request failed.")
else:
    print("\n[ERROR] Failed to ensure test user exists. Check API status and errors.")

print("\nDone.")
