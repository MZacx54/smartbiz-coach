import os
import json
import urllib.request
import urllib.error
import time
import hashlib

# Google Gemini defaults
DEFAULT_TEXT_MODEL = "gemini-2.0-flash"
DEFAULT_VISION_MODEL = "gemini-2.0-flash"

# In-memory prompt cache for free-tier optimization
PROMPT_CACHE = {}
CACHE_TTL = 86400  # 24 hours

def get_cache_key(messages, model, response_format, system_instruction):
    key_data = json.dumps({
        "messages": messages,
        "model": model,
        "response_format": response_format,
        "system_instruction": system_instruction
    }, sort_keys=True)
    return hashlib.sha256(key_data.encode('utf-8')).hexdigest()

def get_gemini_api_key():
    return os.environ.get("GEMINI_API_KEY")

def make_gemini_request(messages, model=DEFAULT_TEXT_MODEL, response_format=None, system_instruction=None):
    api_key = get_gemini_api_key()
    if not api_key:
        raise Exception("Configuration Error: GEMINI_API_KEY not found in environment.")

    # 1. In-memory cache lookup
    cache_key = get_cache_key(messages, model, response_format, system_instruction)
    now = time.time()
    if cache_key in PROMPT_CACHE:
        timestamp, cached_response = PROMPT_CACHE[cache_key]
        if now - timestamp < CACHE_TTL:
            print("Returning cached Gemini response!")
            return cached_response

    # Translate messages array from OpenAI format to Gemini REST format
    contents = []
    
    # Extract system instruction if present in messages list (OpenAI style)
    if isinstance(messages, list):
        for msg in messages:
            if "parts" in msg:
                contents.append(msg)
                continue
            role = msg.get("role")
            content = msg.get("content")
            if role == "system":
                system_instruction = content
            else:
                gemini_role = "model" if role in ["assistant", "model"] else "user"
                
                parts = []
                if isinstance(content, list):
                    for part in content:
                        part_type = part.get("type")
                        if part_type == "text":
                            parts.append({"text": part.get("text")})
                        elif part_type == "image_url":
                            img_url = part.get("image_url", {}).get("url", "")
                            if img_url.startswith("data:"):
                                try:
                                    header, base64_data = img_url.split(";base64,")
                                    mime_type = header.split("data:")[1]
                                    parts.append({
                                        "inlineData": {
                                            "mimeType": mime_type,
                                            "data": base64_data
                                        }
                                    })
                                except Exception as e:
                                    print(f"Error parsing base64 image: {e}")
                            else:
                                parts.append({"text": f"[Image URL: {img_url}]"})
                else:
                    parts.append({"text": str(content)})
                
                contents.append({
                    "role": gemini_role,
                    "parts": parts
                })
    else:
        # If passed directly as a string prompt
        contents = [{
            "role": "user",
            "parts": [{"text": str(messages)}]
        }]

    # Format the endpoint URL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    # Build payload
    payload = {
        "contents": contents
    }

    # Add system instruction if present
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": str(system_instruction)}]
        }

    # Set up generation config (JSON mode, temperature, etc.)
    gen_config = {
        "temperature": 0.7
    }
    
    # If JSON response requested
    if response_format and response_format.get("type") == "json_object":
        gen_config["responseMimeType"] = "application/json"
        
    payload["generationConfig"] = gen_config

    headers = {
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    max_retries = 5
    backoff_delay = 2.0

    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                try:
                    candidate = result['candidates'][0]
                    text_response = candidate['content']['parts'][0]['text']
                    
                    # Cache successful response
                    PROMPT_CACHE[cache_key] = (time.time(), text_response)
                    return text_response
                except (KeyError, IndexError) as parse_err:
                    print(f"Gemini response structure unexpected: {result}")
                    raise Exception(f"Gemini API parse error: {parse_err}")
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode()
            if e.code == 429:
                # Try to parse exact retryDelay from Google's response
                try:
                    err_json = json.loads(error_msg)
                    details = err_json.get('error', {}).get('details', [])
                    for d in details:
                        if 'retryDelay' in d:
                            delay_str = str(d['retryDelay']).rstrip('s')
                            parsed_delay = float(delay_str) + 1.0
                            backoff_delay = max(backoff_delay, parsed_delay)
                except Exception:
                    pass

                if attempt < max_retries - 1:
                    print(f"Gemini API 429 Quota Exceeded. Waiting {backoff_delay:.1f}s before retry... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(min(backoff_delay, 15.0)) # Cap single sleep at 15s
                    backoff_delay *= 1.5
                    continue
                else:
                    raise Exception("AI Rate Limit Reached: The AI engine is experiencing high traffic. Please wait 30 seconds and try again.")
            
            print(f"Gemini API Error: {e.code} - {error_msg}")
            raise Exception(f"AI Provider Error ({e.code}): Please try again shortly.")
        except Exception as exc:
            if attempt < max_retries - 1:
                print(f"Gemini request failed: {exc}. Retrying in {backoff_delay}s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(backoff_delay)
                backoff_delay *= 2
                continue
            raise exc



def clean_json_response(text):
    if not text:
        return "{}"
    import re
    # Remove markdown code blocks if the model wrapped it
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()

def generate_json_content(prompt, system_instruction=None, response_schema=None, image_base64=None, mime_type=None):
    """
    Generates JSON content using Google Gemini.
    """
    # Build contents parts
    parts = []
    if image_base64:
        parts.append({
            "inlineData": {
                "mimeType": mime_type or "image/jpeg",
                "data": image_base64
            }
        })
    parts.append({"text": prompt})

    contents = [{
        "role": "user",
        "parts": parts
    }]

    try:
        response_text = make_gemini_request(
            contents,
            model=DEFAULT_TEXT_MODEL,
            response_format={"type": "json_object"},
            system_instruction=system_instruction
        )
        cleaned_text = clean_json_response(response_text)
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"Gemini JSON generation error: {e}")
        return {"error": str(e)}

def generate_text_content(prompt, image_base64=None, audio_base64=None, mime_type=None):
    """
    Generates pure text content using Google Gemini.
    Supports optional image or audio base64 inputs for vision or voice tasks.
    """
    parts = []
    if image_base64:
        parts.append({
            "inlineData": {
                "mimeType": mime_type or "image/jpeg",
                "data": image_base64
            }
        })
    if audio_base64:
        parts.append({
            "inlineData": {
                "mimeType": mime_type or "audio/webm",
                "data": audio_base64
            }
        })
    parts.append({"text": prompt})

    contents = [{
        "role": "user",
        "parts": parts
    }]

    try:
        return make_gemini_request(contents, model=DEFAULT_TEXT_MODEL)
    except Exception as e:
        print(f"Gemini text generation error: {e}")
        return f"Error: {str(e)}"

# Placeholder proxy to prevent import errors
def get_model(model_name=None):
    return None
