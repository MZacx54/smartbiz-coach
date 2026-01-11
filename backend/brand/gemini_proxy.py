import os
from dotenv import load_dotenv
import json

load_dotenv()

def generate_brand_identity(name, niche, vibe):
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise Exception("No API Key")
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are an expert branding consultant. A new business owner is looking for a brand identity.
        Business Name: {name}
        Niche: {niche}
        Vibe: {vibe}

        Generate a comprehensive brand identity in JSON format. The JSON object should have the following keys:
        - "palette": An array of 6 hex color codes.
        - "fonts": An object with "heading" and "body" font names (use Google Fonts).
        - "taglines": An array of 3-5 catchy taglines.
        - "bio": A short, engaging bio for social media.
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini Error: {e}")
        # Return fallback mock data if AI fails or isn't installed
        return json.dumps({
            "palette": ["#1A1A1A", "#FFFFFF", "#4CAF50", "#2196F3", "#FFC107", "#757575"],
            "fonts": {"heading": "Inter", "body": "Roboto"},
            "taglines": ["Success is a Habit", "Build Your Dreams"],
            "bio": "Empowering your business journey with smart tools."
        })
