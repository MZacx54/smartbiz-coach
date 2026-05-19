import urllib.request
import urllib.error
import ssl
import json

def test_url(url, data=None):
    print(f"\nTesting: {url}")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json'
    }
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode('utf-8')
        
    try:
        req = urllib.request.Request(url, data=req_data, headers=headers, method='POST' if data else 'GET')
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Status: {response.status}")
            print(f"Headers: {dict(response.info())}")
            print(f"Body snippet: {response.read().decode('utf-8')[:300]}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.reason}")
        try:
            print(f"Error Body: {e.read().decode('utf-8')[:500]}")
        except:
            pass
    except Exception as e:
        print(f"Error: {e}")

def main():
    # Test Root / Admin
    test_url("https://smartbiz-backend.up.railway.app/admin/")
    
    # Test Login Endpoint (expect 400 Bad Request or similar, but NOT 404 or CORS error)
    test_url("https://smartbiz-backend.up.railway.app/api/users/login/", {"username": "test", "password": "pwd"})
    test_url("https://smartbiz-backend.up.railway.app/users/login/", {"username": "test", "password": "pwd"})

if __name__ == "__main__":
    main()
