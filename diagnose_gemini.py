import os
import google.generativeai as genai
from dotenv import load_dotenv

def diagnose():
    load_dotenv('backend/.env')
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in backend/.env")
        return

    print(f"API Key found: {api_key[:5]}...{api_key[-5:]}")
    genai.configure(api_key=api_key)

    print("\n--- Listing Available Models ---")
    try:
        model_list = genai.list_models()
        for m in model_list:
            if 'generateContent' in m.supported_generation_methods:
                print(f"Model: {m.name} (Supports generateContent)")
    except Exception as e:
        print(f"Error listing models: {e}")

    print("\n--- Testing Content Generation (gemini-1.5-flash) ---")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Hello")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error with gemini-1.5-flash: {e}")

    print("\n--- Testing Content Generation (models/gemini-1.5-flash) ---")
    try:
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        response = model.generate_content("Hello")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error with models/gemini-1.5-flash: {e}")

if __name__ == "__main__":
    diagnose()
