import os
import google.generativeai as genai
from django.conf import settings
import json
import time

# Configure Gemini
# Ensure GEMINI_API_KEY is in your .env or environment variables
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def get_model(model_name='gemini-2.5-flash'):
    return genai.GenerativeModel(model_name)

def generate_json_content(prompt, system_instruction=None, response_schema=None):
    """
    Helper to generate JSON content ensuring valid JSON response.
    """
    model = get_model()
    
    generation_config = {"response_mime_type": "application/json"}
    if response_schema:
        # If using newer SDK that supports schema objects directly, pass it.
        # For now, we rely on the prompt or simple JSON mode if schema isn't fully typed for the sdk version.
        # We'll pass response_schema if the SDK supports it in config, 
        # but for safety with basic 'response_mime_type', we trust the model often.
        # If schema is provided, we try to use it.
        generation_config["response_schema"] = response_schema

    try:
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            # system_instruction is supported in newer models/SDKs
            # If not supported by installed version, might need toprepend to prompt.
            # We assume a recent SDK version.
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini JSON generation error: {e}")
        raise e

def generate_text_content(prompt, system_instruction=None):
    model = get_model()
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini text generation error: {e}")
        raise e
