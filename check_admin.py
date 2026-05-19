import urllib.request
import ssl

def main():
    url = "https://www.smartbizcoach.com.ng/admin/"
    print(f"Testing Django Admin at: {url}")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Status: {response.status}")
            print(f"Headers: {dict(response.info())}")
            body = response.read().decode('utf-8')
            print(f"Body snippet (first 500 chars):")
            print(body[:500])
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    main()
