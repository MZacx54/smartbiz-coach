import requests
import json

url = "http://127.0.0.1:8000/api/users/register/"
payload = {
    "username": "testuser_local_1",
    "email": "test_local_1@example.com",
    "password": "testpassword123",
    "business_name": "Local Test Biz"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
