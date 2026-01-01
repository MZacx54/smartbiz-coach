from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils

class GenerateSocialContentView(views.APIView):
    permission_classes = [IsAuthenticated]

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
        Return JSON with keys: caption, hashtags (array), callToAction, imageText, dmReply.
        If format is CAROUSEL, include 'slides' array with title and content.
        """
        
        try:
            content = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            return Response(content)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GenerateVideoScriptView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        topic = request.data.get('topic')
        platform = request.data.get('platform')
        tone = request.data.get('tone', 'Engaging')
        style = request.data.get('style', 'Tutorial')
        
        prompt = f"""Create a viral short-form video script for {platform} about: "{topic}".
        Tone: {tone}. Style: {style}.
        Return JSON with keys: title, hook, body, cta, duration.
        """
        
        try:
            script = gemini_utils.generate_json_content(prompt)
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
             # Basic handling if it returns a list directly or wrapped
            return Response(trends)
        except Exception as e:
            # Fallback (mock) if API fails or grounding not available in this tier
            fallback = [
                {"trendName": "No Gree For Anybody", "description": "Resilience theme.", "application": "Show persistence."},
                {"trendName": "Detty December", "description": "Holiday enjoyment.", "application": "Party ready products."}
            ]
            return Response(fallback)
            
class EditImageView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image_base64 = request.data.get('image')
        mime_type = request.data.get('mimeType')
        prompt_text = request.data.get('prompt')
        
        # We need a utility that handles image input.
        # Assuming gemini_utils can handle it or we use genai directly here for complex media.
        # For simplicity, implementing inline with gemini_utils pattern
        
        try:
            model = gemini_utils.get_model('gemini-2.5-flash-image') # Or appropriate vision model
            response = model.generate_content([
                {'mime_type': mime_type, 'data': image_base64},
                prompt_text
            ])
            
            # Extract image from response (similar to frontend logic)
            # The backend SDK might return it differently.
            # If the backend returns parts with inline data:
            for part in response.parts:
                if part.inline_data:
                     # Returning base64 directly to frontend
                    return Response({'image': part.inline_data.data})
            
            # Fallback if text
            return Response({'text': response.text})

        except Exception as e:
            return Response({'error': str(e)}, status=500)

class TranscribeAudioView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        audio_base64 = request.data.get('audio')
        mime_type = request.data.get('mimeType')
        
        try:
            model = gemini_utils.get_model('gemini-2.5-flash')
            response = model.generate_content([
                {'mime_type': mime_type, 'data': audio_base64},
                "Transcribe this audio."
            ])
            return Response({'transcription': response.text})
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
            model = gemini_utils.get_model('gemini-2.5-flash')
            
            # Convert simple history slightly if needed, but assuming gemini utils/sdk handles it or we restart.
            # Ideally we pass history.
            chat = model.start_chat(history=history or [])
            response = chat.send_message(message)
            return Response({'text': response.text})
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
             parts = [
                 {'mime_type': mime_type, 'data': image},
                 prompt
             ]
             try:
                model = gemini_utils.get_model('gemini-2.5-flash-image')
                response = model.generate_content(parts)
                text = response.text
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

    def post(self, request):
        script = request.data.get('script') # Object with title, hook, body, etc.
        visual_style = request.data.get('visualStyle', 'REALISTIC')
        
        # Video generation (Veo) is complex and might handle state/polling.
        # For this prototype, we will return a mock response or try to use a proxy if available.
        # Real implementation requires submitting an operation and polling, which is hard in a single HTTP request without async/celery.
        # We will Mock it for the user to see the flow, as the existing frontend code was also doing complex client-side polling.
        # To truly migrate, we'd need a 'start_generation' and 'check_status' endpoint.
        
        # For now, we return a mock URL to a generic video or specific asset.
        
        mock_video_url = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" # Placeholder
        return Response({'videoUrl': mock_video_url})

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
            model = gemini_utils.get_model('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return Response({'message': response.text})
        except Exception as e:
             return Response({'message': f"Hello {name}, please pay N{amount}."}, status=200)
