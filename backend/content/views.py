import os
from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils
from smartbiz_backend.throttles import ContentGenThrottle, ImageEditThrottle, VideoGenThrottle

# ─── Credit Costs per AI Action ───────────────────────────────────────────────
CREDIT_COSTS = {
    'social_post': 2,
    'image_edit': 5,
    'video_script': 8,
    'business_plan': 10,
    'daily_motivation': 1,
    'seasonal_tips': 1,
    'debt_reminder': 2,
    'transcription': 3,
    'suggested_prompts': 1,
}

def deduct_credits(user, action_key):
    """Deduct credits and return (success, remaining). Returns True even if 0 credits (dev-friendly)."""
    cost = CREDIT_COSTS.get(action_key, 1)
    if user.credits >= cost:
        user.credits -= cost
        user.save(update_fields=['credits'])
        return True, user.credits
    return False, user.credits

class GenerateSocialContentView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        topic = request.data.get('topic')
        platform = request.data.get('platform')
        tone = request.data.get('tone')
        format_type = request.data.get('format', 'SINGLE')

        if not all([topic, platform, tone]):
             return Response({'error': 'Missing required parameters'}, status=400)

        prompt = f"""
        Write a { 'Carousel (multi-slide)' if format_type == 'CAROUSEL' else 'Single Image' } social media post for {platform}.
        Topic: "{topic}"
        Tone: "{tone}"
        Include a caption, hashtags, and call to action.
        """
        
        # We can refine this prompt or use a system instruction if we want strict schema
        # For now, let's ask for JSON directly in the prompt or rely on the utility if we updated it to support schemas well.
        
        # Re-using the system prompt logic from frontend but adapted for the backend utility
        # Ideally, we pass the prompts into the utility or keep them here.
        system_prompt = """
        You are a top-tier Social Media Manager for Nigerian small businesses.
        Return JSON with keys: 
        - caption: The primary post caption.
        - hashtags: Array of relevant hashtags.
        - callToAction: A punchy CTA.
        - imageText: Text that should be overlaid on the image/graphic.
        - dmReply: A script the business owner can use to reply to customers who comment or DM.
        - slides: Optional array for CAROUSEL format. Each slide object should have 'title' and 'content'.
        """
        
        try:
            content = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            deduct_credits(request.user, 'social_post')
            return Response(content)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GenerateVideoScriptView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [VideoGenThrottle]
    
    def post(self, request):
        topic = request.data.get('topic')
        platform = request.data.get('platform')
        tone = request.data.get('tone', 'Engaging')
        style = request.data.get('style', 'Tutorial')
        
        prompt = f"""Create a viral short-form video script for {platform} about: "{topic}".
        Tone: {tone}. Style: {style}.
        Return JSON with keys: 
        - title: Catchy video title.
        - hook: A scroll-stopping opening line.
        - body: The main value proposition.
        - visual_cues: Array of directions for the camera/creator.
        - audio_suggestions: Background music or SFX ideas.
        - cta: The closing Call to Action.
        - estimated_duration: In seconds.
        """
        
        system_prompt = """
        You are a viral content creator specializing in short-form video (TikTok, Reels, Shorts).
        Return JSON with keys: 
        - title: Catchy video title.
        - hook: A scroll-stopping opening line.
        - body: The main value proposition/script.
        - visual_cues: Array of directions for the camera/creator.
        - audio_suggestions: Background music or SFX ideas.
        - cta: The closing Call to Action.
        - estimated_duration: In seconds.
        """
        
        try:
            script = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            deduct_credits(request.user, 'video_script')
            return Response(script)
        except Exception as e:
             return Response({'error': str(e)}, status=500)

class GenerateTrendIdeasView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        niche = request.data.get('niche')
        prompt = f"""List 3 trending social media concepts or seasonal angles currently popular in Nigeria suitable for a "{niche}" business.
        Return JSON list of objects with keys: trendName, description, application.
        """
        
        try:
            trends = gemini_utils.generate_json_content(prompt)
            return Response(trends)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
            
class EditImageView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        image_base64 = request.data.get('image_base64') or request.data.get('image')
        mime_type = request.data.get('mime_type') or request.data.get('mimeType')
        prompt_text = request.data.get('prompt')
        
        if not all([image_base64, mime_type, prompt_text]):
            return Response({'error': 'Missing image data or prompt'}, status=400)
            
        try:
            # Construct Groq Vision API payload (OpenAI format)
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            }
                        }
                    ]
                }
            ]
            response_text = gemini_utils.make_groq_request(messages, model=gemini_utils.DEFAULT_VISION_MODEL)
            # Deduct credits after successful call
            deduct_credits(request.user, 'image_edit')
            return Response({'text': response_text})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class TranscribeAudioView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        audio_base64 = request.data.get('audio')
        mime_type = request.data.get('mimeType')
        
        try:
            import requests
            import base64
            import tempfile
            import os
            
            api_key = gemini_utils.get_groq_api_key()
            if not api_key: raise Exception("No API key")
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
            }
            with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
                f.write(base64.b64decode(audio_base64))
                temp_name = f.name
            
            with open(temp_name, "rb") as audio_file:
                files = {"file": audio_file, "model": (None, "whisper-large-v3")}
                res = requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers=headers, files=files)
            os.remove(temp_name)
            
            return Response({'transcription': res.json().get('text', '')})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GenerateDailyMotivationView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        business_name = request.data.get('businessName')
        prompt = f"""Generate a short, punchy daily motivation quote for a Nigerian business owner named "{business_name}".
        Mix English and Pidgin. It should be inspiring, specifically for an entrepreneur ("Hustle spirit").
        Return JSON with keys: quote, author, theme (HUSTLE, RESILIENCE, GROWTH).
        """
        
        try:
            content = gemini_utils.generate_json_content(prompt)
            return Response(content)
        except Exception as e:
            return Response({
                "quote": "No food for lazy man. Go get that bag today!",
                "author": "SmartBiz Coach",
                "theme": "HUSTLE"
            })

class GenerateSeasonalTipsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from datetime import datetime
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        prompt = f"""Based on today's date ({date_str}), what is the upcoming major event or season in Nigeria?
        (e.g., Valentine, Ramadan, Easter, Christmas, Rainy Season, Back to School).
        Give one business tip for a small vendor to prepare.
        Return JSON with keys: title, description, actionItem, season.
        """
        
        try:
            content = gemini_utils.generate_json_content(prompt)
            return Response(content)
        except Exception as e:
            return Response({
                "title": "Prepare for Month End",
                "description": "Salaries are coming. Stock up.",
                "actionItem": "Broadcast to customers.",
                "season": "Month End" 
            })

class ChatWithSmartBizView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        history = request.data.get('history', [])
        message = request.data.get('message')
        
        # Simple chat handling for now
        try:
            messages = history or []
            messages.append({"role": "user", "content": message})
            text = gemini_utils.make_groq_request(messages)
            return Response({'text': text})
        except Exception as e:
            # Fallback if history format is issue or network
            return Response({'text': "I'm having trouble connecting. Please try again or check network."}, status=200)

class GenerateSuggestedPromptsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        niche = request.data.get('niche')
        context = request.data.get('context') # POST, SCRIPT, PHOTO
        image = request.data.get('image') # Base64
        mime_type = request.data.get('mimeType')
        trends = request.data.get('trends', [])
        
        trend_context = f"Consider trends: {', '.join(trends)}." if trends else ""
        
        if image:
             prompt = f"""Based on this image and the niche "{niche}", suggest 3 editing or caption prompts. 
             Return JSON list of strings (array)."""
             messages = [
                 {
                     "role": "user",
                     "content": [
                         {"type": "text", "text": prompt},
                         {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image}"}}
                     ]
                 }
             ]
             try:
                text = gemini_utils.make_groq_request(messages, model=gemini_utils.DEFAULT_VISION_MODEL)
                lines = [line.strip().lstrip('-0123456789. ') for line in text.splitlines() if line.strip()]
                return Response(lines[:3])
             except Exception as e:
                 return Response(["Enhance brightness", "Focus on product", "Add logo"], status=200)
        else:
            prompt = f"""Suggest 3 creative and viral {context} ideas for a Nigerian business in the "{niche}" niche. {trend_context}
            Return JSON list of strings (array).
            """
            try:
                suggestions = gemini_utils.generate_json_content(prompt)
                return Response(suggestions)
            except Exception as e:
                return Response(["Morning Motivation", "Product Showcase", "Customer Review"])


class GenerateWeeklyPlanView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        niche = request.data.get('niche')
        prompt = f"""Create a 7-day social media content plan for a Nigerian business in the "{niche}" niche.
        Balance promotional, educational, and entertainment content.
        Themes: Motivation Monday, Tuesday Tips, etc.
        Return JSON with keys: weekStartDate, days (array of objects with day, theme, postIdea).
        """
        
        try:
            plan = gemini_utils.generate_json_content(prompt)
            # Ensure structure matches what frontend expects or frontend adapts
            return Response(plan)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GenerateMarketingVideoView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [VideoGenThrottle]

    def post(self, request):
        script_data = request.data.get('script')
        visual_style = request.data.get('visualStyle', 'REALISTIC')
        
        # Step 1: Generate the exact audio script for TTS
        prompt = f"""
        Extract ONLY the spoken audio portion from this video script: {script_data}.
        Return ONLY the raw text that should be spoken by a voiceover artist. No brackets, no stage directions, just the spoken words.
        """
        
        try:
            import tempfile
            import os
            import base64
            from gtts import gTTS
            
            # Get the spoken text
            spoken_text = gemini_utils.generate_text_content(prompt)
            
            # Step 2: Generate Audio using gTTS (Free Google Text-to-Speech)
            # tld='com.ng' gives it a slight localized accent (if available, else defaults to standard)
            tts = gTTS(text=spoken_text, lang='en', tld='com.ng', slow=False)
            
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                temp_name = f.name
                
            tts.save(temp_name)
            
            # Step 3: Encode audio to base64 to send to frontend
            with open(temp_name, "rb") as audio_file:
                audio_b64 = base64.b64encode(audio_file.read()).decode('utf-8')
                
            os.remove(temp_name)
            
            # Deduct credits (It's a heavy action)
            deduct_credits(request.user, 'video_script')
            
            return Response({
                'audio_base64': audio_b64,
                'spoken_text': spoken_text,
                'message': "Audio Voiceover Generated Successfully! You can use this sound for your Faceless Marketing Reels."
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class GenerateDebtReminderView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get('name')
        amount = request.data.get('amount')
        tone = request.data.get('tone', 'POLITE')
        
        prompt = f"""Write a WhatsApp message to a debtor named "{name}" who owes N{amount}. 
        Tone: {tone}. 
        Context: Nigerian Business owner sending to a customer.
        """
        
        try:
            text = gemini_utils.generate_text_content(prompt)
            return Response({'message': text})
        except Exception as e:
             return Response({'message': f"Hello {name}, please pay N{amount}."}, status=200)
class ListModelsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        api_key = gemini_utils.get_groq_api_key()
        if not api_key:
            return Response({"error": "API_KEY NOT SET"}, status=404)
        
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
            }
            res = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
            models = res.json().get('data', [])
            model_list = [{"name": m["id"]} for m in models]
            return Response({"api_key_last_4": api_key[-4:], "models": model_list})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

import random

class GetTrendingTopicsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        trends_pool = [
            {"id": "t1", "title": "Fuel Scarcity Survival", "category": "News/Culture", "volume": "120K Tweets"},
            {"id": "t2", "title": "New Afrobeats Dance Challenge", "category": "Entertainment", "volume": "85K TikToks"},
            {"id": "t3", "title": "Naira Exchange Rate Humour", "category": "Economy", "volume": "50K Posts"},
            {"id": "t4", "title": "Lagos Traffic Chronicles", "category": "Lifestyle", "volume": "40K Posts"},
            {"id": "t5", "title": "Detty December Prep", "category": "Seasonal", "volume": "200K Posts"},
            {"id": "t6", "title": "Odogwu Bitters Meme", "category": "Pop Culture", "volume": "75K Posts"},
            {"id": "t7", "title": "ASUU Strike Updates", "category": "News", "volume": "90K Posts"}
        ]
        
        # Return 3 random trends
        daily_trends = random.sample(trends_pool, 3)
        return Response(daily_trends)
