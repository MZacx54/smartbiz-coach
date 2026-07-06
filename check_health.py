import urllib.request
import urllib.error
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def check_health(url):
    print(f"\nChecking health at: {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            print("  Status:", response.status)
            body = response.read().decode('utf-8')
            print("  Response JSON:")
            try:
                data = json.loads(body)
                print(json.dumps(data, indent=4))
            except:
                print(body[:500])
    except urllib.error.HTTPError as e:
        print(f"  HTTPError: {e.code} - {e.reason}")
        try:
             print("  Body:", e.read().decode('utf-8')[:500])
        except:
             pass
    except Exception as e:
        print("  Error:", e)

check_health("https://api.smartbizcoach.com.ng/health/")
