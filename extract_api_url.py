import urllib.request
import re
import ssl

def main():
    url = "https://smartbizcoach.com.ng/assets/index-BP59c9oG.js"
    print(f"Downloading {url}...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, context=ctx) as response:
            content = response.read().decode('utf-8')
            print("Download successful.")
            
            # Search for anything ending in .railway.app or starting with https://
            railway_urls = re.findall(r'https?://[a-zA-Z0-9.-]*railway\.app[a-zA-Z0-9./_-]*', content)
            print(f"Found Railway URLs: {set(railway_urls)}")
            
            # Let's search for baseURL or VITE_API_URL keywords
            base_urls = re.findall(r'baseURL\s*:\s*"([^"]*)"', content)
            print(f"Found baseURL in code: {set(base_urls)}")
            
            # Let's also look for any other URLs
            all_urls = re.findall(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}[a-zA-Z0-9./_-]*', content)
            # Filter out standard libraries / fonts / etc.
            filtered_urls = [u for u in all_urls if 'google' not in u and 'github' not in u and 'w3.org' not in u and 'react' not in u]
            print(f"Other interesting URLs found: {set(filtered_urls[:15])}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
