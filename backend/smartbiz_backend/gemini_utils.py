import os
import json
import re

def get_model(model_name='gemini-1.5-flash'):
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

def clean_json_response(text):
    """
    Strips markdown code blocks (```json ... ```) and other common non-JSON text.
    """
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    # Strip leading/trailing whitespace
    return text.strip()

def generate_json_content(prompt, system_instruction=None, response_schema=None):
    """
    Helper to generate JSON content ensuring valid JSON response.
    """
    model = get_model()
    if not model:
        return {}
    
    generation_config = {"response_mime_type": "application/json"}
    if response_schema:
        generation_config["response_schema"] = response_schema

    try:
        # Use system_instruction if provided (Gemini 1.5 supports this in the model init or as part of prompt)
        # For simplicity, we prepended it to prompt if no specific property is used in older SDKs
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        
        response = model.generate_content(
            full_prompt,
            generation_config=generation_config,
        )
        
        cleaned_text = clean_json_response(response.text)
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"Gemini JSON generation error: {e}")
        # Return a structured error so frontend doesn't crash
        return {"error": str(e)}

def generate_text_content(prompt):
    model = get_model()
    if not model:
        return "AI Service Unavailable."

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini text generation error: {e}")
        return f"Error: {str(e)}"
