import urllib.request
import ssl

def print_headers(url):
    print(f"\n--- Headers for {url} ---")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, context=ctx) as response:
            for k, v in response.info().items():
                print(f"  {k}: {v}")
    except Exception as e:
        print(f"Failed: {e}")

def main():
    print_headers("https://www.smartbizcoach.com.ng/")
    print_headers("https://smartbizcoach.com.ng/")

if __name__ == "__main__":
    main()
