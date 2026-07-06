import urllib.request
import urllib.error
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def check(url):
    print(f"\nChecking URL: {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            print("  Status:", response.status)
            print("  Headers:")
            for k, v in response.getheaders():
                print(f"    {k}: {v}")
            print("  Body:", response.read()[:200])
    except urllib.error.HTTPError as e:
        print(f"  HTTPError: {e.code} - {e.reason}")
        print("  Headers:")
        for k, v in e.headers.items():
             print(f"    {k}: {v}")
        try:
             print("  Body:", e.read()[:200])
        except:
             pass
    except Exception as e:
        print("  Error:", e)

check("https://www.smartbizcoach.com.ng/admin/")
check("https://luminous-flow-production.up.railway.app/admin/")
