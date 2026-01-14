import os
from django.conf import settings
import json
import time

def get_model(model_name='gemini-2.5-flash'):
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(model_name)
    except ImportError:
        print("Google Generative AI library not installed.")
        return None

def generate_json_content(prompt, system_instruction=None, response_schema=None):
    """
    Helper to generate JSON content ensuring valid JSON response.
    """
    model = get_model()
    if not model:
        print("Gemini model unavailable. Returning empty JSON.")
        return {}
    
    generation_config = {"response_mime_type": "application/json"}
    if response_schema:
        generation_config["response_schema"] = response_schema

    try:
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini JSON generation error: {e}")
        # Re-raise so the calling view can handle it (e.g. return fallback data)
        raise e

def generate_text_content(prompt, system_instruction=None):
    model = get_model()
    if not model:
        return "AI Service Unavailable."

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini text generation error: {e}")
        raise e
