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
    # Credits are managed and deducted on successful response by the frontend React client.
    # This prevent double-charging and billing users for failed AI generations.
    return True, user.credits

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
    except Exception:
        return "BUSINESS CONTEXT: General Nigerian MSME. No specific brand profile yet."

class GenerateSocialContentView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        from billing.utils import check_usage_gatekeeper
        allowed, remaining_credits = check_usage_gatekeeper(request.user, 'content_gen', 5)
        if not allowed:
            return Response({"error": "Insufficient credits. Your free daily limit is exhausted.", "credits": remaining_credits}, status=402)

        topic = request.data.get('topic')
        platform = request.data.get('platform')
        tone = request.data.get('tone')
        format_type = request.data.get('format', 'SINGLE').upper().strip()
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
        - callToAction: The closing Call to Action.
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
        - callToAction: The closing Call to Action.
        - estimated_duration: In seconds.
        """
        
        try:
            script = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(script, dict):
                if 'cta' in script and 'callToAction' not in script:
                    script['callToAction'] = script['cta']
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
            
            # Normalize response to a structured list of trend objects
            trends_list = []
            if isinstance(trends, dict):
                if 'trends' in trends:
                    trends_list = trends['trends']
                elif 'ideas' in trends:
                    trends_list = trends['ideas']
                elif 'data' in trends:
                    trends_list = trends['data']
                else:
                    trends_list = [trends]
            elif isinstance(trends, list):
                trends_list = trends
                
            normalized = []
            for idx, item in enumerate(trends_list):
                if isinstance(item, dict):
                    name = item.get('trendName') or item.get('title') or item.get('name') or "Naija Trend Idea"
                    desc = item.get('description') or item.get('application') or "Trending fast in Nigeria"
                    app = item.get('application') or item.get('description') or "Incorporate this into your marketing campaign today."
                    normalized.append({
                        'id': item.get('id') or idx + 1,
                        'trendName': name,
                        'title': name,
                        'description': desc,
                        'application': app,
                        'volume': 'Trending fast'
                    })
            
            return Response(normalized)
        except Exception as e:
            return Response([
                {"trendName": "Naija Pop Vibe", "description": "Leveraging trending afrobeats slangs", "application": "Create status posts matching current music trends.", "volume": "Trending fast"},
                {"trendName": "Inflation Hacks", "description": "Provide smart packaging options", "application": "Offer smaller sizes for pocket-friendly pricing.", "volume": "Trending fast"},
                {"trendName": "WhatsApp Referral Loops", "description": "Encourage status repost shares", "application": "Give discounts on next purchase when they repost.", "volume": "Trending fast"}
            ])

class EditImageView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        image_base64 = request.data.get('image_base_64') or request.data.get('image_base64') or request.data.get('image')
        mime_type = request.data.get('mime_type') or request.data.get('mimeType') or 'image/png'
        prompt_text = request.data.get('prompt')
        
        if not all([image_base64, prompt_text]):
            return Response({'error': 'Missing image data or prompt'}, status=400)
            
        try:
            import base64
            import io
            from PIL import Image, ImageEnhance, ImageDraw, ImageOps, ImageFilter
            
            # Decode image
            clean_base64 = image_base64
            if "," in image_base64:
                clean_base64 = image_base64.split(",")[1]
            
            img_bytes = base64.b64decode(clean_base64)
            img = Image.open(io.BytesIO(img_bytes))
            
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            width, height = img.size
            
            # 0. Integrated Auto Studio Filter (AI Clean Background Matting & Backdrop Compositing)
            if prompt_text.startswith('[ACTION] auto_studio') or prompt_text.startswith('[ACTION] no_bg'):
                # Convert to RGB array for intelligent edge & background detection
                rgb_img = img.convert('RGB')
                w, h = img.size
                
                # Sample corners (top-left, top-right, bottom-left, bottom-right) to determine multi-point background palette
                corners = [
                    rgb_img.getpixel((5, 5)),
                    rgb_img.getpixel((w - 5, 5)),
                    rgb_img.getpixel((5, h - 5)),
                    rgb_img.getpixel((w - 5, h - 5))
                ]
                
                datas = img.getdata()
                newData = []
                
                for y in range(h):
                    for x in range(w):
                        item = datas[y * w + x]
                        r, g, b, a = item[0], item[1], item[2], item[3] if len(item) > 3 else 255
                        
                        # Distance to any background sample point
                        min_bg_dist = min(
                            sum((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2 for c in corners) ** 0.5
                            for c in corners
                        )
                        
                        # Detect light bedsheets, ground surfaces, and ambient shadows
                        is_white_sheet = (r > 175 and g > 175 and b > 175)
                        is_shadow_crease = (abs(r - g) < 15 and abs(g - b) < 15 and (r < 110 or r > 160) and min_bg_dist < 120)
                        is_edge = (x < 15 or x > w - 15 or y < 15 or y > h - 15) and min_bg_dist < 140
                        
                        if min_bg_dist < 90 or is_white_sheet or is_shadow_crease or is_edge:
                            newData.append((255, 255, 255, 0)) # Make pixel transparent
                        else:
                            newData.append((r, g, b, 255))
                            
                img.putdata(newData)
                
                # Step B: Auto HD Enhance foreground subject
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.2)
                enhancer = ImageEnhance.Color(img)
                img = enhancer.enhance(1.1)
                
                if prompt_text.startswith('[ACTION] auto_studio'):
                    # Step C: Composite isolated subject onto selected backdrop (Marble Studio)
                    bg = Image.new("RGBA", (w, h), (255, 255, 255, 255))
                    draw = ImageDraw.Draw(bg)
                    for py in range(h):
                        color = int(242 + (13 * py / h))
                        draw.line([(0, py), (w, py)], fill=(color, color, color, 255))
                    for i in range(0, w + h, 90):
                        draw.line([(i, 0), (i - h, h)], fill=(215, 215, 215, 75), width=2)
                    
                    # Scale product to fill maximum canvas dimensions (95%)
                    prod_w = int(w * 0.95)
                    prod_h = int(prod_w * (h / w))
                    prod_resized = img.resize((prod_w, prod_h), Image.Resampling.LANCZOS)
                    
                    offset_x = (w - prod_w) // 2
                    offset_y = (h - prod_h) // 2
                    bg.paste(prod_resized, (offset_x, offset_y), prod_resized)
                    img = bg
                
            # 1. Background removal filter
            elif prompt_text.startswith('[ACTION] no_bg'):
                datas = img.getdata()
                newData = []
                ref_color = datas[0] # (r, g, b, a)
                for item in datas:
                    dist = sum((item[i] - ref_color[i]) ** 2 for i in range(3)) ** 0.5
                    if dist < 45 or (item[0] > 235 and item[1] > 235 and item[2] > 235):
                        newData.append((255, 255, 255, 0)) # transparent
                    else:
                        newData.append(item)
                img.putdata(newData)
                
            # 2. HD Enhance filter
            elif prompt_text.startswith('[ACTION] hd_enhance'):
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.25)
                enhancer = ImageEnhance.Color(img)
                img = enhancer.enhance(1.15)
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(1.3)
                
            # 3. Text Placement
            elif prompt_text.startswith('[TEXT]'):
                text_content = prompt_text.replace('[TEXT]', '').strip()
                draw = ImageDraw.Draw(img)
                draw.rectangle([10, height - 40, width - 10, height - 10], fill=(0, 0, 0, 160))
                draw.text((20, height - 32), text_content, fill=(255, 255, 255, 255))
                
            # 4. Backdrop Composition (Virtual Studio)
            elif prompt_text.startswith('[SCENE]'):
                # First execute clean background matting on the input product
                rgb_img = img.convert('RGB')
                w, h = img.size
                corners = [
                    rgb_img.getpixel((5, 5)),
                    rgb_img.getpixel((w - 5, 5)),
                    rgb_img.getpixel((5, h - 5)),
                    rgb_img.getpixel((w - 5, h - 5))
                ]
                datas = img.getdata()
                newData = []
                for y in range(h):
                    for x in range(w):
                        item = datas[y * w + x]
                        r, g, b, a = item[0], item[1], item[2], item[3] if len(item) > 3 else 255
                        min_bg_dist = min(
                            sum((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2 for c in corners) ** 0.5
                            for c in corners
                        )
                        is_white_sheet = (r > 175 and g > 175 and b > 175)
                        is_shadow_crease = (abs(r - g) < 15 and abs(g - b) < 15 and (r < 110 or r > 160) and min_bg_dist < 120)
                        is_edge = (x < 15 or x > w - 15 or y < 15 or y > h - 15) and min_bg_dist < 140
                        if min_bg_dist < 90 or is_white_sheet or is_shadow_crease or is_edge:
                            newData.append((255, 255, 255, 0))
                        else:
                            newData.append((r, g, b, 255))
                img.putdata(newData)

                scene_type = prompt_text.replace('[SCENE]', '').strip().lower()
                bg = Image.new("RGBA", (width, height), (255, 255, 255, 255))
                draw = ImageDraw.Draw(bg)
                
                if scene_type == 'studio':
                    for y in range(height):
                        color = int(245 + (10 * y / height))
                        draw.line([(0, y), (width, y)], fill=(color, color, color, 255))
                elif scene_type == 'marble':
                    for y in range(height):
                        color = int(240 + (15 * y / height))
                        draw.line([(0, y), (width, y)], fill=(color, color, color, 255))
                    for i in range(0, width + height, 100):
                        draw.line([(i, 0), (i - height, height)], fill=(210, 210, 210, 80), width=2)
                elif scene_type == 'wood':
                    for y in range(height):
                        r = int(115 - (35 * y / height))
                        g = int(65 - (20 * y / height))
                        b = int(30 - (10 * y / height))
                        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
                    for i in range(20, height, 40):
                        draw.line([(0, i), (width, i + 4)], fill=(45, 20, 8, 40), width=2)
                elif scene_type == 'nature' or scene_type == 'gradient-warm':
                    for y in range(height):
                        r = int(255 - (35 * y / height))
                        g = int(220 - (45 * y / height))
                        b = int(190 - (55 * y / height))
                        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
                elif scene_type == 'city':
                    for y in range(height):
                        r = int(65 + (30 * y / height))
                        g = int(75 + (20 * y / height))
                        b = int(90 + (10 * y / height))
                        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
                    draw.rectangle([30, height - 140, 100, height], fill=(45, 55, 65, 110))
                    draw.rectangle([120, height - 210, 200, height], fill=(40, 50, 60, 90))
                    draw.rectangle([width - 130, height - 170, width - 30, height], fill=(50, 60, 70, 110))
                else:
                    for y in range(height):
                        color = int(245 + (10 * y / height))
                        draw.line([(0, y), (width, y)], fill=(color, color, color, 255))
                
                # Resizing product to fit composition
                prod_w = int(width * 0.78)
                prod_h = int(prod_w * (height / width))
                prod_resized = img.resize((prod_w, prod_h), Image.Resampling.LANCZOS)
                
                offset_x = (width - prod_w) // 2
                offset_y = (height - prod_h) // 2
                bg.paste(prod_resized, (offset_x, offset_y), prod_resized)
                img = bg
                
            # 5. Fallback custom prompt styling filters
            else:
                tone_lower = prompt_text.lower()
                if "warm" in tone_lower or "vintage" in tone_lower or "sunset" in tone_lower:
                    r, g, b, a = img.split()
                    r = r.point(lambda i: min(255, int(i * 1.15)))
                    b = b.point(lambda i: int(i * 0.85))
                    img = Image.merge('RGBA', (r, g, b, a))
                elif "cool" in tone_lower or "neon" in tone_lower or "cyber" in tone_lower:
                    r, g, b, a = img.split()
                    r = r.point(lambda i: int(i * 0.85))
                    b = b.point(lambda i: min(255, int(i * 1.15)))
                    img = Image.merge('RGBA', (r, g, b, a))
                elif "bright" in tone_lower or "enhance" in tone_lower:
                    enhancer = ImageEnhance.Brightness(img)
                    img = enhancer.enhance(1.2)
                else:
                    enhancer = ImageEnhance.Contrast(img)
                    img = enhancer.enhance(1.1)
            
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            processed_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            deduct_credits(request.user, 'image_edit')
            return Response({
                'image_base64': processed_base64,
                'text': f"Styled image according to prompt: '{prompt_text}'"
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

from rest_framework.parsers import MultiPartParser, FormParser

class TranscribeAudioView(views.APIView):
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        audio_file = request.FILES.get('audio')
        mime_type = 'audio/webm'
        
        if audio_file:
            import base64
            audio_data = audio_file.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            # Normalize mime type for Gemini API support
            raw_mime = audio_file.content_type or 'audio/webm'
            mime_type = 'audio/webm' if 'webm' in raw_mime else 'audio/wav' if 'wav' in raw_mime else 'audio/mp3' if 'mp3' in raw_mime or 'mpeg' in raw_mime else 'audio/webm'
        else:
            audio_base64 = request.data.get('audio')
            raw_mime = request.data.get('mimeType') or 'audio/webm'
            mime_type = 'audio/webm' if 'webm' in raw_mime else 'audio/wav' if 'wav' in raw_mime else 'audio/mp3' if 'mp3' in raw_mime or 'mpeg' in raw_mime else 'audio/webm'
            
        if not audio_base64:
            return Response({'error': 'No audio data provided'}, status=400)
            
        try:
            # Use Gemini to transcribe the audio natively
            text = gemini_utils.generate_text_content(
                "Transcribe this audio file accurately. Return ONLY the transcribed text, nothing else.",
                audio_base64=audio_base64,
                mime_type=mime_type
            )
            return Response({
                'transcription': text,
                'text': text
            })
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
            # Ensure actions is a list of strings if the AI returned it empty or failed
            if not content or not content.get('actions') or not isinstance(content.get('actions'), list) or 'error' in content:
                raise Exception("Gemini JSON invalid or contains error")
            return Response(content)
        except Exception as e:
            # Dynamic Fallback Engine (Personalized, Naija-focused, Changes Daily)
            import random
            from datetime import datetime
            
            # Determine niche
            niche_key = "general"
            try:
                brand = BrandIdentity.objects.get(user=request.user)
                niche_lower = brand.niche.lower()
                if any(x in niche_lower for x in ["retail", "shop", "boutique", "store", "physical", "sale", "wear", "fabric", "shoe"]):
                    niche_key = "retail"
                elif any(x in niche_lower for x in ["property", "real estate", "land", "agent", "house", "rent"]):
                    niche_key = "property"
                elif any(x in niche_lower for x in ["service", "consult", "agency", "freelance", "class", "teach", "salon", "barber"]):
                    niche_key = "service"
            except:
                pass
                
            fallback_pool = {
                "retail": [
                    {
                        "quote": "Abeg, customer relationship no be by mouth, na by follow-up. Make sure you check up on those who asked for prices yesterday!",
                        "actions": [
                            "Post 3 of your fast-selling inventory items on WhatsApp Status with clear prices.",
                            "Review your stock records in inventory manager and mark items below 5 units as low stock.",
                            "Send a gentle follow-up text to the client who promised payment today using Invoice module."
                        ]
                    },
                    {
                        "quote": "Market no dey wait for person. If you no put your products out there, another person go sell to your customers today.",
                        "actions": [
                            "Update your Public Storefront catalog with new product photos.",
                            "Calculate your gross margin for your top 3 selling items in inventory manager.",
                            "Send a quick 'Thank you' discount code to your top customer from last week."
                        ]
                    },
                    {
                        "quote": "Better soup na money make am. Invest time in writing clear, attractive product descriptions today.",
                        "actions": [
                            "Generate product captions using Content Studio for your WhatsApp Status catalog.",
                            "Do a quick audit of unpaid customer invoices in Gbege Book.",
                            "Run a discount alert on WhatsApp for items that have spent over 30 days in stock."
                        ]
                    }
                ],
                "property": [
                    {
                        "quote": "Land no dey rot. Every listing you promote today is seed sown for a major commission tomorrow. Keep pushing, boss!",
                        "actions": [
                            "Record a 60-second video walkthrough of your active listing for TikTok/Instagram.",
                            "Update your property status in your catalog (Available/Sold).",
                            "Follow up with the lead who did inspection last weekend."
                        ]
                    },
                    {
                        "quote": "Trust na key for real estate. Ensure your public agent catalog looks premium and verified.",
                        "actions": [
                            "Post high-res neighborhood details on your WhatsApp status.",
                            "Reach out to 2 local agency partners for co-listing updates.",
                            "Check active property leads in your Lead Inbox."
                        ]
                    }
                ],
                "service": [
                    {
                        "quote": "Your expertise is your market value. Don't sell yourself cheap, but deliver double value to retain your clients.",
                        "actions": [
                            "Share a helpful tip/tutorial related to your industry on social media.",
                            "Review client feedback and optimize your service delivery roadmap.",
                            "Follow up with clients who have pending retainer invoices."
                        ]
                    },
                    {
                        "quote": "A single satisfied client can refer you to ten others. Service quality is your best advertisement in Naija.",
                        "actions": [
                            "Draft a short testimonial request message to send to your last client.",
                            "Review your weekly available slots and post them on WhatsApp status.",
                            "Organize your client communication template using Sales Closer."
                        ]
                    }
                ],
                "general": [
                    {
                        "quote": "No food for lazy man, but wisdom na the key. Work smart today by letting AI handle your copy while you focus on sales!",
                        "actions": [
                            "Post today's top product/service on WhatsApp status with a strong hook.",
                            "Review your cash inflow and outflow for the past 7 days.",
                            "Resolve at least 1 pending customer query in your Lead Inbox."
                        ]
                    },
                    {
                        "quote": "Small steps every day na lead to big success. Don't look at where you dey, look at where you dey go.",
                        "actions": [
                            "Generate a fresh marketing script in the Content Studio.",
                            "Update your business details and profile logo.",
                            "Check for active SME grant opportunities on the Find Funding board."
                        ]
                    },
                    {
                        "quote": "Business na exchange of value. Make sure your customers feel the premium touch in your delivery today.",
                        "actions": [
                            "Send a personalized feedback request to a recent buyer.",
                            "Audit your inventory and clear out zero-demand items.",
                            "Follow up on invoices that have exceeded their due dates."
                        ]
                    }
                ]
            }
            
            # Seed based on date + user ID so it changes daily per user
            seed_val = datetime.now().date().toordinal() + request.user.id
            random.seed(seed_val)
            
            niche_list = fallback_pool.get(niche_key, fallback_pool["general"])
            selected = random.choice(niche_list)
            
            return Response({
                "quote": selected["quote"],
                "author": "SmartBiz Coach",
                "theme": "DYNAMIC_ACTION_PLAN",
                "actions": selected["actions"]
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
            system_prompt = (
                "You are Antigravity, a highly professional Digital Marketing Strategist, Brand Consultant, and Growth Architect "
                "for Nigerian MSMEs on the SmartBiz Coach platform. You speak with clear business acumen, confidence, and local context "
                "(incorporating mild Nigerian professional phrasing and terms like 'bagging the sale', 'Naira cash-liquidity', 'nudge', 'market validation'). "
                f"User Brand Context: {brand_context}. "
                "You know all about the SmartBiz Coach platform tools and can guide users on using them to succeed:\n"
                "- Brand Builder: For custom brand identities (colors, taglines, elevator pitch, logo prompts).\n"
                "- Content Studio: AI post writer (Instagram/WhatsApp status), Video scripts, and Premium Image Background Editor "
                "with eye-dropper color sampling, manual eraser brush, and drag-and-scale product placement to create viral flyers.\n"
                "- Invoice Generator: Bill clients instantly with customized NGN/USD invoices and sync outstanding status directly.\n"
                "- Gbege Book (Debtor Tracker): Log debtor installments (Cash/POS/Transfer) in a visual ledger, link catalog products "
                "with auto-deduct stock toggles, and use AI reminder nudges with escalating tone (Polite -> Firm -> Strict).\n"
                "- Product Manager: Track inventory value, catalog items, and view staff audit logs.\n"
                "- Broadcast HQ: Send campaign blasts to targeted contacts filtered by tag and schedule them for future releases.\n"
                "- Find Funding: Connect user profiles to active Nigerian grants, microloans, and incubator options.\n"
                "- Compliance: Guide on CAC business name search, registrations, TIN setup, and bank compliance.\n"
                "Provide actionable, premium marketing strategies, growth insights, and clear product guidance to help users scale."
            )
            messages.append({
                "role": "system", 
                "content": system_prompt
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
        context = request.data.get('context') or request.data.get('content_type') # Map both
        image = request.data.get('image') or request.data.get('image_base_64') or request.data.get('image_base64')
        mime_type = request.data.get('mimeType') or request.data.get('image_mime_type') or request.data.get('mime_type')
        trends = request.data.get('trends') or request.data.get('trend_names') or []
        
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
        goal_input = request.data.get('goal') or request.data.get('niche') or 'Brand Awareness'
        goal_mapping = {
            'SALES': 'Increase Direct Product Sales & Conversions',
            'BRAND AWARENESS': 'Grow Brand Authority & Trust',
            'ENGAGEMENT': 'Engage Community, Spark Conversations & Gather Reviews'
        }
        goal = goal_mapping.get(str(goal_input).upper().strip(), str(goal_input))
        
        brand_context = get_brand_context(request.user)
        prompt = f"""
        {brand_context}
        CAMPAIGN GOAL: {goal}
        
        Create a 7-day social media content plan for this specific business tailored to the CAMPAIGN GOAL above.
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
        script_data = request.data.get('script') or {}
        visual_style = request.data.get('visualStyle') or request.data.get('visual_style', 'Professional Cinematic')
        
        title = script_data.get('title', '')
        hook = script_data.get('hook', '')
        body = script_data.get('body', '')
        cta = script_data.get('callToAction') or script_data.get('cta', '')
        
        prompt = f"""
        Generate a step-by-step visual storyboard for a video script based on these details:
        Title: {title}
        Hook: {hook}
        Body: {body}
        CTA: {cta}
        
        Visual Style: {visual_style}
        
        For each scene in the video, provide:
        1. "visual": A description of what is shown on screen (camera angle, actor action, visual style '{visual_style}').
        2. "audio": The precise words spoken by the narrator/voiceover during this scene.
        
        Return a JSON list of 3-5 objects with keys: visual, audio.
        """
        
        try:
            import tempfile
            import os
            import base64
            from gtts import gTTS
            
            # Step 1: Generate storyboard using Gemini
            storyboard = gemini_utils.generate_json_content(prompt)
            
            # Fallback if storyboard is invalid or contains errors
            if not isinstance(storyboard, list) or len(storyboard) == 0 or (isinstance(storyboard, dict) and 'error' in storyboard):
                storyboard = [
                    {"visual": f"Open scene showing a high-impact hook with title text overlay: '{title}'", "audio": hook},
                    {"visual": "Cut to mid-shot demonstrating the core benefits and value proposition", "audio": body},
                    {"visual": f"End card showing a clear call to action: '{cta}'", "audio": cta}
                ]
            
            # Step 2: Combine narration audio for TTS
            spoken_text = " ".join([scene.get('audio', '') for scene in storyboard if scene.get('audio')])
            if not spoken_text.strip():
                spoken_text = f"{hook} {body} {cta}"
            
            # Step 3: Generate Audio using gTTS
            tts = gTTS(text=spoken_text, lang='en', tld='com.ng', slow=False)
            
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                temp_name = f.name
                
            tts.save(temp_name)
            
            # Step 4: Encode audio to base64
            with open(temp_name, "rb") as audio_file:
                audio_b64 = base64.b64encode(audio_file.read()).decode('utf-8')
                
            os.remove(temp_name)
            
            # Deduct credits
            deduct_credits(request.user, 'video_script')
            
            return Response({
                'storyboard': storyboard,
                'audio_base64': audio_b64,
                'spoken_text': spoken_text,
                'message': "Video storyboard and voiceover generated successfully!"
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class GenerateDebtReminderView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from billing.utils import check_usage_gatekeeper
        allowed, remaining_credits = check_usage_gatekeeper(request.user, 'debt_reminder', 2)
        if not allowed:
            return Response({"error": "Insufficient credits. Your free daily limit is exhausted.", "credits": remaining_credits}, status=402)

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
        prompt = """
        Generate 3 current trending topics, challenges, pop culture memes, or events that are popular in Nigeria right now (Naija-focused).
        For each topic, provide:
        1. A catchy title (e.g. "Fuel Scarcity Survival hacks", "New Afrobeats Trend", "Naira Exchange Rate humour").
        2. A category (e.g. Pop Culture, Economy, Seasonal, News, Entertainment).
        3. An estimated volume of posts/tweets (e.g. "120K Posts", "85K TikToks").
        
        Return JSON list of 3 objects with keys: id (e.g. t1, t2, t3), title, category, volume.
        """
        try:
            content = gemini_utils.generate_json_content(prompt)
            if isinstance(content, list) and len(content) > 0 and 'error' not in content:
                for idx, item in enumerate(content):
                    if 'id' not in item:
                        item['id'] = f"t{idx+1}"
                return Response(content[:3])
            raise Exception("Gemini JSON invalid or contains error")
        except Exception as e:
            # Fallback to rich, daily-seeded Naija topics
            import random
            from datetime import datetime
            seed_val = datetime.now().date().toordinal()
            random.seed(seed_val)
            
            trends_pool = [
                {"id": "t1", "title": "Fuel Prices & transport hacks", "category": "Economy", "volume": "140K Posts"},
                {"id": "t2", "title": "New Afrobeats Dance Challenge", "category": "Entertainment", "volume": "95K TikToks"},
                {"id": "t3", "title": "Naira Exchange Adjustments", "category": "Finance", "volume": "85K Posts"},
                {"id": "t4", "title": "Detty December & Holiday Prep", "category": "Seasonal", "volume": "220K Posts"},
                {"id": "t5", "title": "Lagos Traffic Chronicles", "category": "Pop Culture", "volume": "60K Posts"},
                {"id": "t6", "title": "CAC Registration updates for MSMEs", "category": "Business", "volume": "45K Search"},
                {"id": "t7", "title": "Odogwu Bitters memes & trends", "category": "Pop Culture", "volume": "110K Posts"},
                {"id": "t8", "title": "ASUU & Education Calendar", "category": "News", "volume": "80K Posts"},
                {"id": "t9", "title": "FinTech funding in Lagos", "category": "Tech", "volume": "30K Posts"},
                {"id": "t10", "title": "WhatsApp catalog features", "category": "Business/Tech", "volume": "55K volume"},
                {"id": "t11", "title": "Solar Energy & power alternatives", "category": "Infrastructure", "volume": "115K Posts"},
                {"id": "t12", "title": "Japa wave & talent search", "category": "Culture", "volume": "90K Posts"},
                {"id": "t13", "title": "Ankara local fashion showcase", "category": "Fashion", "volume": "70K Posts"},
                {"id": "t14", "title": "Delivery Logistics price changes", "category": "Logistics", "volume": "40K Posts"},
                {"id": "t15", "title": "Nigerian Food Inflation hacks", "category": "Lifestyle", "volume": "130K Posts"}
            ]
            daily_trends = random.sample(trends_pool, 3)
            return Response(daily_trends)


class GenerateSalesScriptView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        from billing.utils import check_usage_gatekeeper
        allowed, remaining_credits = check_usage_gatekeeper(request.user, 'sales_script', 3)
        if not allowed:
            return Response({"error": "Insufficient credits. Your free daily limit is exhausted.", "credits": remaining_credits}, status=402)

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
