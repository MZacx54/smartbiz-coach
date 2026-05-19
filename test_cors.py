import urllib.request
import urllib.error
import ssl

def test_cors_all_headers(url, origin):
    print(f"\nTesting CORS headers for {url} with Origin: {origin}")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
    }
    
    req = urllib.request.Request(url, headers=headers, method='OPTIONS')
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Preflight Status: {response.status}")
            for k, v in response.info().items():
                print(f"  {k}: {v}")
    except urllib.error.HTTPError as e:
        print(f"Preflight HTTPError: {e.code} - {e.reason}")
        for k, v in e.headers.items():
            print(f"  {k}: {v}")
    except Exception as e:
        print(f"Error: {e}")

def main():
    test_cors_all_headers("https://www.smartbizcoach.com.ng/users/login/", "http://localhost:5173")

if __name__ == "__main__":
    main()
