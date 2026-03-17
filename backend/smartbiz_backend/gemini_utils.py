import os
import json
import re

# List of models to try in order of preference
MODELS_TO_TRY = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-flash-8b',
    'models/gemini-1.0-pro'
]

def get_model(model_name):
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)

def clean_json_response(text):
    """
    Strips markdown code blocks (```json ... ```) and other common non-JSON text.
    """
    if not text:
        return ""
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()

def generate_json_content(prompt, system_instruction=None, response_schema=None):
    """
    Helper to generate JSON content ensuring valid JSON response, with model fallback.
    """
    generation_config = {"response_mime_type": "application/json"}
    if response_schema:
        generation_config["response_schema"] = response_schema

    full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
    
    last_error = "No API key configured."
    
    for model_name in MODELS_TO_TRY:
        try:
            model = get_model(model_name)
            if not model:
                continue
                
            response = model.generate_content(
                full_prompt,
                generation_config=generation_config,
            )
            
            if not response.text:
                continue

            cleaned_text = clean_json_response(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            last_error = str(e)
            print(f"Gemini error with {model_name}: {e}")
            # Continue to next model if it's a 404/not found error
            if "404" in last_error or "not found" in last_error or "not supported" in last_error:
                continue
            else:
                # If it's a different error (e.g. invalid key), stop and report it
                break

    return {"error": f"Failed after trying all models. Last Error: {last_error}"}

def generate_text_content(prompt):
    last_error = "No API key configured."
    for model_name in MODELS_TO_TRY:
        try:
            model = get_model(model_name)
            if not model:
                continue
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            last_error = str(e)
            print(f"Gemini text error with {model_name}: {e}")
            if "404" in last_error or "not found" in last_error:
                continue
            else:
                break
                
    return f"Error: {last_error}"
