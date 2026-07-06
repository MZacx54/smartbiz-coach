import urllib.request
import urllib.error
import json
import ssl
import time

def test_login():
    url = "https://www.smartbizcoach.com.ng/users/login/"
    print(f"\nTesting login on: {url}")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json'
    }
    
    data = {
        'username': 'admin',
        'password': 'SmartBizAdmin2026!'
    }
    
    req_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=req_data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Status: {response.status}")
            body = response.read().decode('utf-8')
            print("Response Body:")
            print(body)
            if "token" in body:
                print("\n=============================================")
                print("SUCCESS: Seeded superuser verified live!")
                print("Username: admin")
                print("Password: SmartBizAdmin2026!")
                print("=============================================")
                return True
            else:
                print("Failed: No token returned in response.")
                return False
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.reason}")
        try:
            print(f"Error Body: {e.read().decode('utf-8')}")
        except:
            pass
        return False
    except Exception as e:
        print(f"Failed: {e}")
        return False

def main():
    print("Waiting 60 seconds for Railway to build and restart Gunicorn...")
    time.sleep(60)
    
    for attempt in range(1, 10):
        print(f"\n--- Attempt {attempt} of 9 ---")
        if test_login():
            return
        print("Waiting 15 seconds before retry...")
        time.sleep(15)
        
    print("\nVerification completed, but the seed account is not active yet.")

if __name__ == "__main__":
    main()
