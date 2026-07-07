import os
from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils
from smartbiz_backend.throttles import ContentGenThrottle, ImageEditThrottle, VideoGenThrottle
from brand.models import BrandIdentity

# ─── Credit Costs per AI Action ───────────────────────────────────────────────
CREDIT_COSTS = {
    'social_post': 2,
    'image_edit': 5,
    'video_script': 8,
    'business_plan': 15,  # Upgraded plans cost more
    'daily_motivation': 1,
    'seasonal_tips': 1,
    'debt_reminder': 1,   # As configured in usageLimiter
    'transcription': 3,
    'suggested_prompts': 1,
    'sales_script': 1,    # As configured in usageLimiter
    'health_score': 5,
    'pricing_assistant': 2,
    'blog_post': 5,
    'partnership_pitch': 3,
}

def deduct_credits(user, action_key):
    """Deduct credits and return (success, remaining). Returns True even if 0 credits (dev-friendly)."""
    cost = CREDIT_COSTS.get(action_key, 1)
    if user.credits >= cost:
        user.credits -= cost
        user.save(update_fields=['credits'])
        return True, user.credits
    return False, user.credits

def get_brand_context(user):
    """Fetch and format brand identity for AI context."""
    try:
        brand = BrandIdentity.objects.get(user=user)
        return f"""
        BUSINESS CONTEXT:
        - Name: {brand.business_name}
        - Niche: {brand.niche}
        - Target Audience: {brand.target_audience}
        - Brand Voice/Tone: {brand.brand_voice}
        - Tagline: {brand.taglines[0] if brand.taglines else 'N/A'}
        - Vibe: {brand.vibe}
        """
    except BrandIdentity.DoesNotExist:
        return "BUSINESS CONTEXT: General Nigerian MSME. No specific brand profile yet."

class GenerateSocialContentView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        topic = request.data.get('topic')
        platform = request.data.get('platform')
        tone = request.data.get('tone')
        format_type = request.data.get('format', 'SINGLE')
        user_context = request.data.get('context', '')

        if not all([topic, platform, tone]):
             return Response({'error': 'Missing required parameters'}, status=400)

        # Platform-specific optimization instructions
        platform_hooks = ""
        if platform.upper() == 'TIKTOK':
            platform_hooks = "Focus on a strong hook in the first 3 seconds. Use trending sounds/vibe. Keep it fast-paced and relatable."
        elif platform.upper() == 'INSTAGRAM':
            platform_hooks = "Focus on aesthetic appeal and engagement-driven captions."
        elif platform.upper() == 'LINKEDIN':
            platform_hooks = "Focus on professional value, thought leadership, and storytelling."

        prompt = f"""
        Write a { 'Carousel (multi-slide)' if format_type == 'CAROUSEL' else 'Single Image' } social media post for {platform}.
        Topic: "{topic}"
        Tone: "{tone}"
        
        {platform_hooks}
        
        USER SPECIFIED CONTEXT: {user_context}
        
        Include a caption, hashtags, and call to action.
        """
        
        brand_context = get_brand_context(request.user)
        system_prompt = f"""
        {brand_context}
        
        You are a Senior Digital Marketer specializing in Nigerian MSMEs. 
        Your goal is to write high-converting, viral social media content that reflects the specific brand context and user context above.
        Be creative, use local context where appropriate (but remain professional), and ensure the content is unique to this business.
        
        If the platform is TikTok, ensure the caption is punchy and optimized for short-form video discovery.
        
        Return JSON with keys: 
        - caption: The primary post caption.
        - hashtags: Array of relevant hashtags (include a mix of niche and Nigerian tags).
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
        
        brand_context = get_brand_context(request.user)
        system_prompt = f"""
        {brand_context}
        
        You are a professional Video Scriptwriter and Director.
        Create a script that perfectly matches the brand voice and target audience described in the context.
        Ensure the script is engaging, flows well, and is optimized for viral short-form video.
        
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
        brand_context = get_brand_context(request.user)
        
        system_instruction = f"""
        {brand_context}
        
        You are a Strategic Growth Consultant for Nigerian businesses. 
        Instead of generic trends, provide 3 UNIQUE, brand-specific marketing angles or concepts that this EXACT business can use today to stand out.
        Think outside the box. Connect the business niche with current Nigerian pop culture, seasonal events, or specific local challenges.
        
        Return JSON list of objects with keys: trendName, description, application.
        """
        
        prompt = f"Provide 3 hyper-personalized marketing concept ideas for this business."
        
        try:
            trends = gemini_utils.generate_json_content(prompt, system_instruction=system_instruction)
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
            # Construct Vision API payload (OpenAI format)
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
            response_text = gemini_utils.make_gemini_request(messages, model=gemini_utils.DEFAULT_VISION_MODEL)
            # Deduct credits after successful call
            deduct_credits(request.user, 'image_edit')
            return Response({'text': response_text})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class TranscribeAudioView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        audio_base64 = request.data.get('audio')
        mime_type = request.data.get('mimeType') or 'audio/m4a'
        if not audio_base64:
            return Response({'error': 'No audio data'}, status=400)
            
        try:
            # Use Gemini to transcribe the audio natively
            text = gemini_utils.generate_text_content(
                "Transcribe this audio file accurately. Return ONLY the transcribed text, nothing else.",
                audio_base64=audio_base64,
                mime_type=mime_type
            )
            return Response({'transcription': text})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GenerateDailyMotivationView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        brand_context = get_brand_context(request.user)
        prompt = f"""
        {brand_context}
        Generate a personalized daily action plan (not just a generic motivation quote) for this specific entrepreneur.
        It should consist of 3 short, actionable, punchy tasks they should complete today to grow their business (marketing task, operational task, financial task).
        
        Return JSON with keys: 
        - quote: "A motivating, personal quote/message (mix of English and Pidgin) targeted to their industry",
        - author: "SmartBiz Coach",
        - theme: "ACTION_PLAN",
        - actions: Array of 3 strings (specific task descriptions, e.g. "Create 1 Instagram reel showing your newest collection", "Check your stock levels for high demand products", "Review outstanding debts and send 1 reminder")
        """
        
        try:
            content = gemini_utils.generate_json_content(prompt)
            # Ensure actions is a list of strings if the AI returned it empty
            if not content.get('actions') or not isinstance(content.get('actions'), list):
                content['actions'] = [
                    "Promote one key product on your WhatsApp Status today.",
                    "Review your stock levels to see what needs restocking.",
                    "Check your outstanding invoices and follow up on pending payments."
                ]
            return Response(content)
        except Exception as e:
            return Response({
                "quote": "No food for lazy man. Go get that bag today!",
                "author": "SmartBiz Coach",
                "theme": "HUSTLE",
                "actions": [
                    "Promote one key product on your WhatsApp Status today.",
                    "Review your stock levels to see what needs restocking.",
                    "Check your outstanding invoices and follow up on pending payments."
                ]
            })

class GenerateSeasonalTipsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from datetime import datetime
        date_str = datetime.now().strftime("%Y-%m-%d")
        brand_context = get_brand_context(request.user)
        
        prompt = f"""
        {brand_context}
        Based on today's date ({date_str}), what is the upcoming major event or season in Nigeria?
        Provide a strategic marketing tip specifically for this business to capitalize on this season.
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
        
        # Inject brand context into chat
        brand_context = get_brand_context(request.user)
        try:
            messages = []
            messages.append({
                "role": "system", 
                "content": f"You are a professional Digital Marketing Consultant for Nigerian MSMEs. Brand Profile: {brand_context}"
            })
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": message})
            text = gemini_utils.make_gemini_request(messages)
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
        
        brand_context = get_brand_context(request.user)
        
        if image:
             prompt = f"""
             {brand_context}
             Based on this image and the brand niche above, suggest 3 creative editing or caption prompts. 
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
                text = gemini_utils.make_gemini_request(messages, model=gemini_utils.DEFAULT_VISION_MODEL)
                lines = [line.strip().lstrip('-0123456789. ') for line in text.splitlines() if line.strip()]
                return Response(lines[:3])
             except Exception as e:
                 return Response(["Enhance brightness", "Focus on product", "Add logo"], status=200)
        else:
            prompt = f"""
            {brand_context}
            Suggest 3 creative and viral {context} ideas for this specific business. {trend_context}
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
        brand_context = get_brand_context(request.user)
        prompt = f"""
        {brand_context}
        Create a 7-day social media content plan for this specific business.
        Balance promotional, educational, and entertainment content.
        Themes should be professional yet engaging, reflecting the brand voice.
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
        
        prompt = f"""Write two versions of a WhatsApp message to a debtor named "{name}" who owes N{amount}. 
        Tone: {tone}. 
        Context: Nigerian Business owner sending to a customer.
        
        Return JSON with keys:
        - english: "The formal/standard English message",
        - pidgin: "The Nigerian Pidgin version of the message (make it authentic, e.g. using terms like 'abeg', 'make we settle this matter')"
        """
        
        try:
            result = gemini_utils.generate_json_content(prompt)
            if not result.get('english') or not result.get('pidgin'):
                # fallback structure
                text = gemini_utils.generate_text_content(f"Write a debt reminder to {name} for {amount} in {tone} tone.")
                return Response({'english': text, 'pidgin': f"Abeg {name}, make we settle the ₦{amount} payment. Thank you."})
            # Deduct credits
            deduct_credits(request.user, 'debt_reminder')
            return Response(result)
        except Exception as e:
             return Response({
                 'english': f"Hello {name}, please pay N{amount}.",
                 'pidgin': f"Abeg {name}, make we settle the ₦{amount} payment. Thank you."
             }, status=200)
class ListModelsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        api_key = gemini_utils.get_gemini_api_key()
        if not api_key:
            return Response({"error": "GEMINI_API_KEY NOT SET"}, status=404)
        
        try:
            import requests
            res = requests.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
            models_data = res.json().get('models', [])
            model_list = [{"name": m["name"].split("/")[-1]} for m in models_data]
            return Response({"api_key_last_4": api_key[-4:] if len(api_key) > 4 else "...", "models": model_list})
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


class GenerateSalesScriptView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        context = request.data.get('context', 'CLOSING') # CLOSING, OBJECTION, FOLLOW_UP, GREETING
        customer_message = request.data.get('customer_message', '')
        
        brand_context = get_brand_context(request.user)
        
        mode_prompts = {
            'CLOSING': "Help me close this sale. The customer is interested but hasn't paid yet.",
            'OBJECTION': f"The customer has an objection: '{customer_message}'. Help me handle it professionally.",
            'FOLLOW_UP': "Generate a polite but firm follow-up message for a customer who stopped replying.",
            'GREETING': "Create a warm, professional first-contact message for a new inquiry.",
            'PRICE_ISSUE': "The customer says the price is too high. Help me explain the value professionally.",
        }
        
        goal = mode_prompts.get(context, mode_prompts['CLOSING'])
        
        system_prompt = f"""
        {brand_context}
        
        You are a Master Sales Closer and Digital Marketer for Nigerian businesses. 
        Your goal is to provide 3 different response options for the business owner to send on WhatsApp:
        1. Professional & Direct
        2. Naija Friendly (using warm local Nigerian context/pidgin where appropriate)
        3. Urgent (FOMO/Scarcity)
        
        Return JSON with keys: 
        - options: Array of 3 strings (the response messages).
        - one_liner: A single high-impact one-liner opener that immediately hooks the customer.
        - strategy_tip: A one-sentence tip on why these options work.
        - do_not_say: Array of 2-3 phrases/arguments the seller must AVOID using in this specific situation (e.g. "We don't do refunds", "Our price is final").
        """
        
        prompt = f"{goal} \nCustomer Message: '{customer_message}'"
        
        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            deduct_credits(request.user, 'sales_script')
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AnalyzeProductView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        image_base64 = request.data.get('image_base64')
        mime_type = request.data.get('mime_type', 'image/jpeg')
        mode = request.data.get('mode', 'ANALYZE')

        if not image_base64:
            return Response({'error': 'No image provided'}, status=400)

        mode_prompts = {
            'ANALYZE': """Analyze this product photo for e-commerce/social media use.
Return JSON with these keys:
- suggestions: array of 4-5 specific improvement tips (lighting, angle, background, props, etc.)
- quality_score: integer 0-100 rating the photo quality for selling online
- social_media_tips: array of 3 tips for posting this product on Instagram/TikTok
- color_palette: array of 5 hex color codes found in the image (e.g. "#FF5733")
- composition_notes: one paragraph about framing, rule of thirds, focal point
- enhanced_description: a compelling 2-sentence product description a Nigerian seller could use on Instagram or WhatsApp status""",

            'BG_REMOVE': """Analyze this product photo's background.
Return JSON with these keys:
- suggestions: array of 4 specific tips for improving or replacing the background (what color/scene would work best for this product type)
- quality_score: integer 0-100 rating background cleanliness
- social_media_tips: array of 3 background styling tips for social media product shots
- color_palette: array of 5 hex color codes that would make great backgrounds for this product
- composition_notes: one paragraph about how the current background affects the product visibility
- enhanced_description: a 2-sentence description focusing on the product's visual appeal against a clean background""",

            'SOCIAL_READY': """Analyze this product for social media marketing in Nigeria.
Return JSON with these keys:
- suggestions: array of 4 posting strategy tips (best time to post, story vs feed, reels ideas)
- quality_score: integer 0-100 rating how social-media-ready this photo is
- social_media_tips: array of 5 items, each being a ready-to-use caption with emojis and 3 relevant Nigerian hashtags
- color_palette: array of 5 hex brand colors detected in the product
- composition_notes: one paragraph about how to crop/edit this for different platforms (IG story vs feed vs TikTok)
- enhanced_description: a viral-style 3-sentence product pitch a Nigerian entrepreneur would use on WhatsApp Business"""
        }

        prompt = mode_prompts.get(mode, mode_prompts['ANALYZE'])
        brand_context = get_brand_context(request.user)
        
        system_instruction = f"""
        {brand_context}
        
        You are a Product Presentation Expert and AI Photo Analyst for Nigerian MSMEs. 
        Analyze the provided image and give advice that is hyper-personalized to the brand context above.
        Don't just give general advice; tell them how to style this product SPECIFICALLY for their brand.
        """
        
        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_instruction, image_base64=image_base64, mime_type=mime_type)
            deduct_credits(request.user, 'image_edit')
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class GenerateBlogPostView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        topic = request.data.get('topic')
        tone = request.data.get('tone', 'Informative')
        length = request.data.get('length', 'Medium')
        
        if not topic:
            return Response({'error': 'Missing required parameter: topic'}, status=400)
            
        brand_context = get_brand_context(request.user)
        
        system_prompt = f"""
        {brand_context}
        
        You are a Professional Content Writer and SEO & GEO (Generative Engine Optimization) Specialist for Nigerian SMEs.
        Your goal is to write a high-impact, long-form blog post about the selected topic.
        
        CRITICAL GEO (Generative Engine Optimization) INSTRUCTIONS:
        1. Statistics Addition: Weave credible, quantitative details/statistics into the narrative.
        2. Quotation Addition: Cite authoritative voices or industry experts (e.g. Aliko Dangote, SMEDAN Directors, PwC reports, Central Bank statements, etc.).
        3. Source Citation: Explicitly name reputable sources or whitepapers.
        4. Fluency & Concreteness: Write short, precise, and semantically clear sentences that can be easily parsed and cited by AI large language models.
        5. Domain Vocabulary: Use domain-specific vocabulary terms and explain them clearly.
        
        Return JSON with keys:
        - title: An SEO-optimized headline.
        - metaDescription: A compelling 150-character meta description.
        - blogContent: The full body of the blog post in Markdown format, with headers (##, ###) and clean bullet points.
        - keywords: Array of 5 target SEO keywords.
        """
        
        prompt = f"Write a {length} blog post about: '{topic}' with a {tone} tone. Optimize it for both human readers and AI crawlers using the GEO strategy."
        
        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            deduct_credits(request.user, 'blog_post')
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class GeneratePartnershipPitchView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        partner_name = request.data.get('partner_name', 'SMEDAN')
        pitch_type = request.data.get('pitch_type', 'Workshop')
        call_to_action = request.data.get('call_to_action', 'Zoom meeting')
        
        brand_context = get_brand_context(request.user)
        
        system_prompt = f"""
        {brand_context}
        
        You are a Master Business Developer and Corporate Communicator specializing in B2B partnerships with Nigerian government agencies, hubs, and NGOs.
        Your goal is to write a highly persuasive partnership proposal email pitch.
        
        Return JSON with keys:
        - subjectLine: A professional email subject line.
        - emailBody: The full body of the email in professional corporate format.
        - keyBenefits: Array of 3 main benefits for the target partner (why they should partner with us).
        - followUpStrategy: A short sentence detailing when and how to follow up.
        """
        
        prompt = f"Write a partnership proposal email pitch to {partner_name}. Our offer type is: '{pitch_type}' and the call to action is: '{call_to_action}'."
        
        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            deduct_credits(request.user, 'partnership_pitch')
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
