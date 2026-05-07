import os
import json
import urllib.request
import urllib.error

# We preserve the file name `gemini_utils.py` to avoid breaking imports globally,
# but the underlying AI engine is now Groq (Meta Llama 3 models)

# Default models for Groq
DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_VISION_MODEL = "llama-3.2-90b-vision-preview"

def get_groq_api_key():
    # Attempt to use GROQ_API_KEY first, fallback to GEMINI_API_KEY if user just renamed value
    return os.environ.get("GROQ_API_KEY") or os.environ.get("GEMINI_API_KEY")

def make_groq_request(messages, model=DEFAULT_TEXT_MODEL, response_format=None):
    api_key = get_groq_api_key()
    if not api_key:
        raise Exception("Configuration Error: GROQ_API_KEY or GEMINI_API_KEY not found in environment.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
    }

    if response_format:
        payload["response_format"] = response_format

    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"Groq API Error: {e.code} - {error_msg}")
        raise Exception(f"AI Provider Error: {e.code} - {error_msg}")

def clean_json_response(text):
    if not text:
        return "{}"
    import re
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()

def generate_json_content(prompt, system_instruction=None, response_schema=None, image_base64=None, mime_type=None):
    """
    Generates JSON content using Groq's Llama-3 model.
    Supports vision if image_base64 is provided.
    """
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    
    # Force JSON instruction for safety
    prompt = prompt + "\n\nIMPORTANT: You must return a valid JSON object ONLY. No markdown, no conversational text."
    
    if image_base64:
        # Vision request format
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type or 'image/jpeg'};base64,{image_base64}"
                    }
                }
            ]
        })
        model = DEFAULT_VISION_MODEL
    else:
        # Standard text request
        messages.append({"role": "user", "content": prompt})
        model = DEFAULT_TEXT_MODEL

    try:
        # Llama 3 models support JSON mode
        response_text = make_groq_request(messages, model=model, response_format={"type": "json_object"})
        cleaned_text = clean_json_response(response_text)
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"Groq JSON generation error: {e}")
        return {"error": str(e)}

def generate_text_content(prompt):
    """
    Generates pure text content using Groq's Llama-3 model.
    """
    messages = [{"role": "user", "content": prompt}]
    try:
        return make_groq_request(messages, model=DEFAULT_TEXT_MODEL)
    except Exception as e:
        print(f"Groq text generation error: {e}")
        return f"Error: {str(e)}"

# Placeholder proxy to prevent import errors in EditImageView
def get_model(model_name=None):
    return None
