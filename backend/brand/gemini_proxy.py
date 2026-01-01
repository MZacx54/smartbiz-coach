import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

def generate_brand_identity(name, niche, vibe):
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
