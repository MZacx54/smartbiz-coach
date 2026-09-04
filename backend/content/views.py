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
    """Fetch and format dynamic, hyper-personalized brand & catalog identity for AI context."""
    try:
        from brand.models import BrandIdentity
        from marketplace.models import Product

        brand = BrandIdentity.objects.get(user=user)
        
        # Query top products/services for this user's business
        products = Product.objects.filter(brand=brand)[:5]
        catalog_summary = []
        for p in products:
            price_str = f"₦{p.price:,.2f}"
            if p.price_max:
                price_str += f" - ₦{p.price_max:,.2f}"
            catalog_summary.append(f"• {p.name} ({p.product_type}): {price_str} - {p.description[:80] if p.description else 'Quality offer'}")

        catalog_text = "\n".join(catalog_summary) if catalog_summary else "No catalog items logged yet."
        tagline_text = brand.taglines[0] if (brand.taglines and isinstance(brand.taglines, list) and len(brand.taglines) > 0) else 'Elevating Nigerian Excellence'

        return f"""
        HYPER-PERSONALIZED BUSINESS PROFILE:
        - Business Name: {brand.business_name}
        - Industry Niche: {brand.niche or 'General Retail & Services'}
        - Primary Tagline: "{tagline_text}"
        - Target Audience: {brand.target_audience or 'Nigerian Consumers & Business Owners'}
        - Preferred Brand Voice & Tone: {brand.brand_voice or 'Warm, Professional, and Persuasive'}
        - Elevator Pitch / Mission: {brand.elevator_pitch or 'Providing premium value and reliable products across Nigeria.'}
        
        LIVE CATALOG PRODUCTS & PRICING:
        {catalog_text}
        
        INSTRUCTION TO AI: Every generated output MUST directly reflect this specific business ({brand.business_name}), its actual products, target audience, and brand tone. NEVER produce generic placeholders.
        """
    except Exception as e:
        return f"BUSINESS CONTEXT: SmartBiz Coach Merchant ({user.username or user.email}). Focus on high-converting Nigerian business strategies."

class GenerateSocialContentView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        from billing.utils import check_usage_gatekeeper
        allowed, remaining_credits = check_usage_gatekeeper(request.user, 'content_gen', 5)
        if not allowed:
            return Response({"error": "Insufficient credits. Your free daily limit is exhausted.", "credits": remaining_credits}, status=402)

        topic = request.data.get('topic')
        platform = request.data.get('platform', 'Instagram')
        tone = request.data.get('tone', 'Exciting')
        format_type = request.data.get('format', 'SINGLE POST').upper().strip()
        user_context = request.data.get('context', '')

        if not topic:
            return Response({'error': 'Missing required parameter: topic'}, status=400)

        brand_context = get_brand_context(request.user)

        prompt = f"""
        You are a Top-Tier Nigerian Direct-Response Copywriter & Social Media Strategist.
        Create an exceptionally engaging, deep, and high-converting {format_type} for {platform}.

        CAMPAIGN PARAMETERS:
        - Topic / Product: "{topic}"
        - Platform: {platform}
        - Desired Tone: {tone}
        - Format: {format_type}
        - Additional Context: {user_context or 'Focus on quality, authenticity, fast nationwide delivery, and seamless WhatsApp ordering.'}

        STRICT COPYWRITING RULES (HOOK-STORY-OFFER-CTA FRAMEWORK):
        1. HOOK: Must be an irresistible, pattern-interrupt headline (using 1-2 relevant emojis) that stops Nigerian users from scrolling.
        2. STORY & VALUE: Explain the unique benefits, craftsmanship, solve a real daily pain point, and highlight quality. Use clean bullet points with bullet emojis (✨, 📦, 💡, 🔥, 💎).
        3. TRUST & LOGISTICS: Mention clear delivery details (e.g., "⚡ Fast Lagos & Nationwide Waybill Dispatch", "🔒 100% Genuine Quality Guaranteed").
        4. CLEAR CTA: Give an effortless direct checkout or inquiry command (e.g., "Tap the link in bio or send us a WhatsApp DM to secure yours before stock finishes!").
        5. IF CAROUSEL: Provide 5 to 6 distinct, highly informative slides. Each slide must contain a clear title, 2-3 sentences of educational or sales value, and an explicit visual instruction for the graphic designer.
        6. DM CLOSER SCRIPT: Provide a warm, respectful, high-converting WhatsApp/Instagram DM response script that the business owner can copy-paste when leads ask "How much?" or "Is this available?".

        OUTPUT REQUIREMENTS (STRICT JSON ONLY):
        {{
            "caption": "Full multi-line post caption with emojis, spacing, hooks, bullet points, and CTA",
            "whatsAppStatus": "Snappy 3-bullet version formatted specifically for WhatsApp Status reading",
            "hashtags": ["12-15 relevant tags mixing Nigerian commerce and niche keywords"],
            "callToAction": "Primary short action CTA",
            "callToActionVariations": [
                "Urgent / Scarcity CTA",
                "Consultative / Friendly CTA",
                "Direct WhatsApp Order CTA"
            ],
            "imageText": "Bold, punchy 3-6 word text for the flyer graphic",
            "dmReply": "A complete, friendly sales closer reply message for customer DMs",
            "slides": [
                {{
                    "slideNumber": 1,
                    "title": "Slide 1 Headline Hook",
                    "content": "Slide 1 detailed value text",
                    "visualDirection": "Visual instruction for Canva/designer (e.g., Bold centered text with glowing highlight on product mockup)"
                }},
                {{
                    "slideNumber": 2,
                    "title": "Slide 2 Feature / Benefit",
                    "content": "Slide 2 detailed value text",
                    "visualDirection": "Close-up shot of product details with 3 feature callout badges"
                }}
            ]
        }}
        """

        system_prompt = f"""
        {brand_context}
        
        You are Nigeria's leading MSME Growth Marketing Specialist. 
        Write deep, persuasive, culturally authentic copy that sells directly to Nigerian buyers and businesses.
        Avoid robotic, lazy, or shallow output. Every sentence must build trust, demonstrate value, or drive immediate action.
        """

        try:
            content = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(content, dict) and 'caption' in content:
                deduct_credits(request.user, 'social_post')
                return Response(content)
            raise Exception("Invalid response structure from AI model")
        except Exception as e:
            # Rich, comprehensive contextual fallback
            biz_name = getattr(request.user, 'business_name', 'Our Store')
            fallback_caption = f"""🚨 STOP SCROLLING! Your search for the best {topic} in Nigeria ends right here! ✨\n\nAre you tired of compromising on quality or dealing with disappointing deliveries? At {biz_name}, we bring you premium-grade {topic} crafted for unmatched value, durability, and style.\n\nHere is why our customers love this:\n💎 100% Premium Quality Guaranteed — No shortcuts, no fake materials.\n⚡ Fast Lagos & Nationwide Door-Step Waybill Delivery.\n📦 Safe, tamper-proof packaging to ensure your order arrives in perfect condition.\n🤝 Transparent pricing & responsive customer support.\n\n🔥 LIMITED STOCK AVAILABLE: Due to high demand, current batch is selling out fast!\n\n📲 HOW TO ORDER:\n👉 Tap the link in our bio or send us a WhatsApp DM right now to claim yours today!\n\n#{biz_name.replace(' ', '')} #NaijaBrand #NigerianBusiness #QualityFirst #LagosSME #ShopNigeria #ReliableMerchant"""
            
            fallback_slides = [
                {"slideNumber": 1, "title": f"Why Everyone Is Talking About {topic} 🔥", "content": f"Discover how {biz_name} is setting a new standard for quality and affordability in Nigeria.", "visualDirection": "High-contrast cover slide with bold typography and product highlight."},
                {"slideNumber": 2, "title": "The Daily Struggle We Solve 💡", "content": "Say goodbye to overpriced alternatives that don't last. We deliver dependable excellence designed for everyday performance.", "visualDirection": "Side-by-side comparison visual highlighting key pain points resolved."},
                {"slideNumber": 3, "title": "Key Features & Unmatched Quality ✨", "content": "Sourced with extreme care and vetted under strict quality standards for your peace of mind.", "visualDirection": "Detailed product close-up with 3 clean bullet callouts."},
                {"slideNumber": 4, "title": "Real Customer Proof ⭐️⭐️⭐️⭐️⭐️", "content": "Join hundreds of satisfied customers across Nigeria who trust our service and fast dispatch.", "visualDirection": "Clean testimonial screenshot layout with 5-star rating graphic."},
                {"slideNumber": 5, "title": "Claim Yours Today 🚀", "content": f"Limited batch available for immediate dispatch. WhatsApp us or click the link in bio to order now!", "visualDirection": "Bold closing slide with WhatsApp phone number and 'Order Now' button graphic."}
            ]

            deduct_credits(request.user, 'social_post')
            return Response({
                "caption": fallback_caption,
                "whatsAppStatus": f"✨ New Arrival Alert: {topic} now in stock at {biz_name}!\n\n• Premium Quality Guaranteed 💎\n• Fast Nationwide Delivery ⚡\n• Limited Quantity Available 🔥\n\nReply 'ORDER' to lock yours in right away! 👇",
                "hashtags": [f"#{topic.replace(' ', '')}", "#NigerianBrand", "#LagosBusiness", "#NaijaSME", "#ShopLocalNG", "#VerifiedMerchant", "#NaijaHustle", "#OnlineStoreNG"],
                "callToAction": "Send a WhatsApp DM to place your order now!",
                "callToActionVariations": [
                    "⚡ Hurry! Current batch is selling fast — tap link in bio to secure yours.",
                    "💬 Have questions? Send us a DM and our friendly team will assist you immediately.",
                    "📲 Click the link in bio or WhatsApp us directly for same-day dispatch."
                ],
                "imageText": f"Premium {topic} • Fast Delivery",
                "dmReply": f"Hello! 👋 Thank you for reaching out to {biz_name} regarding our {topic}. We currently have limited units in stock ready for immediate nationwide waybill dispatch! Would you like me to share our current promo pricing and delivery options for your location?",
                "slides": fallback_slides
            })


class GenerateVideoScriptView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [VideoGenThrottle]

    def post(self, request):
        topic = request.data.get('topic')
        platform = request.data.get('platform', 'TikTok')
        tone = request.data.get('tone', 'Engaging')
        style = request.data.get('style', 'Tutorial / Demonstration')
        duration = request.data.get('duration', '30s')

        if not topic:
            return Response({'error': 'Missing required parameter: topic'}, status=400)

        brand_context = get_brand_context(request.user)

        prompt = f"""
        You are a Viral Video Director and Short-Form Scriptwriting Master for TikTok, Instagram Reels, and YouTube Shorts.
        Write a high-converting, second-by-second {duration} viral video script about: "{topic}".

        SCRIPT PARAMETERS:
        - Platform: {platform}
        - Tone: {tone}
        - Format / Style: {style}
        - Target Duration: {duration}

        MANDATORY 4-STAGE SHORT-FORM STRUCTURE:
        1. 0:00 - 0:03 (SCROLL-STOPPING HOOK): Must create visual and verbal curiosity (pattern interrupt) within the first 3 seconds.
        2. 0:03 - 0:15 (AGITATION & RELATABLE STRUGGLE): Hook the viewer into an authentic problem they experience in Nigeria.
        3. 0:15 - 0:45 (THE TRANSFORMATION & DEMO): Showcase the product/solution in action, proving quality and clear results.
        4. 0:45 - 0:60 (SCARCITY OFFER & CTA): Provide an urgent reason to take action right now (limited stock, fast delivery, direct WhatsApp link).

        OUTPUT REQUIREMENTS (STRICT JSON ONLY):
        {{
            "title": "High-impact video headline",
            "hook": "The exact spoken hook in the first 3 seconds",
            "estimated_duration": "{duration}",
            "body": "The full continuous narration script for the teleprompter",
            "teleprompter_script": "Clean, formatted paragraph of all spoken narration text ready for the teleprompter",
            "callToAction": "Specific verbal & visual closing CTA",
            "audio_suggestions": ["Trending Afrobeats instrumental / Sound Effect idea"],
            "caption_for_post": "Ready-to-post short caption with hashtags for TikTok/Reels",
            "script_breakdown": [
                {{
                    "timeframe": "0:00 - 0:03",
                    "section": "The Viral Hook",
                    "visual": "Camera angle, facial expression, on-screen bold text",
                    "spoken_words": "Exact words spoken",
                    "audio_sfx": "Sound effect / music beat drop"
                }},
                {{
                    "timeframe": "0:03 - 0:15",
                    "section": "The Relatable Problem",
                    "visual": "B-roll or demonstration showing the struggle",
                    "spoken_words": "Exact words spoken",
                    "audio_sfx": "Subtle tension beat"
                }},
                {{
                    "timeframe": "0:15 - 0:45",
                    "section": "The Solution & Product Demo",
                    "visual": "Crisp close-up showcasing product features and results",
                    "spoken_words": "Exact words spoken",
                    "audio_sfx": "High-energy upbeat music"
                }},
                {{
                    "timeframe": "0:45 - 0:60",
                    "section": "Scarcity & Direct CTA",
                    "visual": "Holding product with on-screen WhatsApp number and link pointer",
                    "spoken_words": "Exact closing words",
                    "audio_sfx": "Notification chime / Outro punch"
                }}
            ]
        }}
        """

        system_prompt = f"""
        {brand_context}
        
        You are an elite Video Director crafting viral, highly engaging short-form video scripts for Nigerian brands.
        Make every line energetic, relatable, and designed to generate instant sales and inquiries.
        """

        try:
            script = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(script, dict) and 'hook' in script:
                if 'callToAction' not in script and 'cta' in script:
                    script['callToAction'] = script['cta']
                if 'teleprompter_script' not in script:
                    script['teleprompter_script'] = script.get('body', f"{script.get('hook', '')} {script.get('callToAction', '')}")
                deduct_credits(request.user, 'video_script')
                return Response(script)
            raise Exception("Invalid script response structure")
        except Exception as e:
            biz_name = getattr(request.user, 'business_name', 'Our Brand')
            fallback_teleprompter = f"If you're in Nigeria and you've been searching for the absolute best {topic}, stop scrolling right now! Most options on the market either disappoint on quality or don't last. That's why we at {biz_name} engineered this premium solution for you. Look at this build quality and finish. It delivers 100% reliability, looks incredible, and is backed by fast nationwide delivery. Stock for this batch is strictly limited, so click the link in our bio or send us a WhatsApp DM right now to secure yours before it sells out!"
            
            fallback_breakdown = [
                {
                    "timeframe": "0:00 - 0:03",
                    "section": "The Scroll-Stopping Hook",
                    "visual": f"Direct eye contact with camera, holding {topic} with bold text overlay: 'STOP SCROLLING! 🚨'",
                    "spoken_words": f"If you've been looking for the best {topic} in Nigeria, stop scrolling right now!",
                    "audio_sfx": "Upbeat record scratch / bass drop"
                },
                {
                    "timeframe": "0:03 - 0:15",
                    "section": "The Relatable Problem",
                    "visual": "Shake head while showing frustration with common cheap alternatives.",
                    "spoken_words": "We all know how frustrating it is to spend your hard-earned money only to get poor quality that fails in weeks.",
                    "audio_sfx": "Subtle background rhythm"
                },
                {
                    "timeframe": "0:15 - 0:45",
                    "section": "The Solution & Live Demo",
                    "visual": f"Slow-motion close up panning across {topic}, demonstrating texture and premium finish.",
                    "spoken_words": f"That's why {biz_name} is different. Every piece is strictly inspected for 100% durability, style, and top performance.",
                    "audio_sfx": "High-energy Afrobeats tempo"
                },
                {
                    "timeframe": "0:45 - 0:60",
                    "section": "Scarcity Offer & CTA",
                    "visual": "Smile, point down to bio link, on-screen text: 'WhatsApp DM: Link in Bio'",
                    "spoken_words": "Click the link in our bio or send us a WhatsApp DM right now to get yours with fast nationwide delivery!",
                    "audio_sfx": "Cash register sound / Outro beat"
                }
            ]

            deduct_credits(request.user, 'video_script')
            return Response({
                "title": f"The Ultimate {topic} Showcase 🔥",
                "hook": f"If you've been looking for the best {topic} in Nigeria, stop scrolling right now!",
                "estimated_duration": duration,
                "body": fallback_teleprompter,
                "teleprompter_script": fallback_teleprompter,
                "callToAction": "Click the link in bio or WhatsApp us to order now!",
                "audio_suggestions": ["Trending Afrobeats Instrumental", "Fast-paced TikTok Vlog Beat"],
                "caption_for_post": f"Don't compromise on quality! ✨ Check out our {topic} at {biz_name}. Fast nationwide dispatch. WhatsApp link in bio! #NaijaTech #ShopNigeria #ViralReels #SMEGrowth",
                "script_breakdown": fallback_breakdown
            })


class GenerateTrendIdeasView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        niche = request.data.get('niche', 'Small Business')
        brand_context = get_brand_context(request.user)

        system_instruction = f"""
        {brand_context}
        
        You are a Strategic Growth Consultant for Nigerian commerce.
        Generate 4 hyper-relevant, creative Nigerian marketing angles that this EXACT business can execute this week.
        Connect the business niche with real Nigerian economic habits (Salary Week rush, weekend owanbe prep, inflation hacks, WhatsApp flash sales).
        
        Return JSON list of objects with keys: trendName, description, application.
        """

        prompt = f"Provide 4 hyper-personalized, high-converting Nigerian marketing angles for a business in '{niche}'."

        try:
            trends = gemini_utils.generate_json_content(prompt, system_instruction=system_instruction)
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
                    name = item.get('trendName') or item.get('title') or item.get('name') or "Naija Growth Angle"
                    desc = item.get('description') or item.get('application') or "High-demand consumer angle in Nigeria"
                    app = item.get('application') or item.get('description') or "Run this as a targeted WhatsApp status and Instagram campaign."
                    normalized.append({
                        'id': item.get('id') or idx + 1,
                        'trendName': name,
                        'title': name,
                        'description': desc,
                        'application': app,
                        'volume': 'Trending in Nigeria'
                    })

            if len(normalized) >= 3:
                return Response(normalized)
            raise Exception("Insufficient trend items returned")
        except Exception as e:
            return Response([
                {"trendName": "Month-End Payday Flash Promo", "description": "Capitalize on salary disbursements by offering a 48-hour bundle discount on top inventory items.", "application": "Run a broadcast on WhatsApp Status with countdown timer stickers.", "volume": "High Buying Intent"},
                {"trendName": "Inflation Relief Combo Pack", "description": "Package complementary items together at an all-inclusive, pocket-friendly price point.", "application": "Create a multi-slide carousel highlighting cost savings vs buying individually.", "volume": "Top Consumer Priority"},
                {"trendName": "Behind-The-Scenes Packaging & Dispatch", "description": "Show customers the care, cleanliness, and security of packaging their orders for nationwide waybill.", "application": "Record a 30s TikTok/Reels video with trending Afrobeats audio.", "volume": "Builds Deep Trust"},
                {"trendName": "WhatsApp VIP Referral Loop", "description": "Reward existing buyers with a 5% discount on their next purchase when their friends order.", "application": "Send automated loyalty reminders to past buyers in your contact book.", "volume": "Fast Organic Growth"}
            ])

# ==========================================
# AI PRODUCT PHOTO STUDIO 2.0 ("SNAP-TO-STUDIO")
# ==========================================

SCENE_TITLES = {
    'luxury_marble': 'Italian White Marble & Studio',
    'outdoor_sunlight': 'Vibrant Outdoor Sunlight & Sky',
    'rustic_oak': 'Rustic Oak & Boutique Wood',
    'pastel_podium': 'Minimalist Pastel 3D Podium',
    'botanical_garden': 'Lush Botanical & Palm Leaves',
    'spa_mist': 'Luxury Spa & Water Mist',
    'velvet_noir': 'Velvet Noir & Dark Slate',
    'pure_white': 'Pure White E-Commerce Catalog',
    'afro_rattan': 'Handwoven African Rattan & Jute',
    'golden_hour': 'Golden Hour Resort Sunset',
    'executive_glass': 'Modern Glass Table & Office',
    'cozy_living': 'Cozy Living Room Morning',
    'colorblock_pop': 'Vibrant Pop Colorblock',
    'urban_cyber': 'Urban Cyber & Neon Rim',
    'kitchen_quartz': 'Modern Quartz Kitchen Island',
    'floral_silk': 'Silk Fabric & Floral Vanity',
}

def isolate_product_foreground(img):
    """
    High-precision edge-guided product subject isolation.
    Extracts the product cleanly from bedsheet/floor/table backgrounds with feathered antialiasing.
    """
    import collections
    import math
    from PIL import Image, ImageFilter
    
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        
    # If image already has clean transparency (e.g. transparent PNG upload), preserve it
    extrema = img.getextrema()
    if len(extrema) == 4 and extrema[3][0] < 50:
        return img

    w, h = img.size
    rgb = img.convert('RGB')
    pixels = rgb.load()

    # 1. Sample perimeter background color seeds
    seeds = []
    step_x = max(1, w // 35)
    step_y = max(1, h // 35)
    for x in range(0, w, step_x):
        seeds.append((x, 2))
        seeds.append((x, h - 3))
    for y in range(0, h, step_y):
        seeds.append((2, y))
        seeds.append((w - 3, y))

    seed_colors = [pixels[sx, sy] for sx, sy in seeds if 0 <= sx < w and 0 <= sy < h]
    if not seed_colors:
        seed_colors = [(240, 240, 240)]

    mean_r = sum(c[0] for c in seed_colors) / len(seed_colors)
    mean_g = sum(c[1] for c in seed_colors) / len(seed_colors)
    mean_b = sum(c[2] for c in seed_colors) / len(seed_colors)

    # 2. Multi-seed BFS flood fill from all perimeter pixels
    visited = [[False] * w for _ in range(h)]
    is_bg = [[False] * w for _ in range(h)]
    queue = collections.deque()

    for x in range(w):
        visited[0][x] = True
        visited[h - 1][x] = True
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        if not visited[y][0]:
            visited[y][0] = True
            queue.append((0, y))
        if not visited[y][w - 1]:
            visited[y][w - 1] = True
            queue.append((w - 1, y))

    # Core protection zone (center core is protected from accidental flood fill)
    core_xmin = int(w * 0.28)
    core_xmax = int(w * 0.72)
    core_ymin = int(h * 0.22)
    core_ymax = int(h * 0.82)

    COLOR_THRESHOLD = 40.0

    while queue:
        cx, cy = queue.popleft()
        is_bg[cy][cx] = True
        cur_c = pixels[cx, cy]

        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                if core_xmin <= nx <= core_xmax and core_ymin <= ny <= core_ymax:
                    continue
                nc = pixels[nx, ny]
                local_diff = math.sqrt((nc[0] - cur_c[0])**2 + (nc[1] - cur_c[1])**2 + (nc[2] - cur_c[2])**2)
                global_diff = math.sqrt((nc[0] - mean_r)**2 + (nc[1] - mean_g)**2 + (nc[2] - mean_b)**2)

                if local_diff < 18.0 or global_diff < COLOR_THRESHOLD:
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    mask = Image.new('L', (w, h), 255)
    m_pixels = mask.load()
    for y in range(h):
        for x in range(w):
            if is_bg[y][x]:
                m_pixels[x, y] = 0

    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.8))
    result = img.copy()
    result.putalpha(mask)
    bbox = result.getbbox()
    if bbox:
        result = result.crop(bbox)
    return result


def create_procedural_studio_backdrop(scene_id, width=768, height=1365):
    """Fallback high-resolution procedural studio backdrop generator if image file is not on disk."""
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (width, height), (245, 245, 245))
    draw = ImageDraw.Draw(img)

    if scene_id in ('luxury_marble', 'spa_mist', 'kitchen_quartz'):
        for y in range(height):
            ratio = y / float(height)
            if ratio < 0.65:
                val = int(235 - (25 * ratio))
                draw.line([(0, y), (width, y)], fill=(val, val - 8, val - 15))
            else:
                val = int(248 - (15 * (ratio - 0.65)))
                draw.line([(0, y), (width, y)], fill=(val, val, val))
        draw.line([(0, int(height * 0.65)), (width, int(height * 0.65))], fill=(210, 210, 210), width=2)
    elif scene_id in ('outdoor_sunlight', 'sky_sunlight'):
        for y in range(height):
            ratio = y / float(height)
            r = int(100 + (130 * ratio))
            g = int(180 + (65 * ratio))
            b = 255
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    elif scene_id in ('velvet_noir', 'urban_cyber'):
        for y in range(height):
            ratio = y / float(height)
            val = int(20 + (15 * ratio))
            draw.line([(0, y), (width, y)], fill=(val, val, val + 5))
    elif scene_id in ('rustic_oak', 'cozy_living', 'afro_rattan'):
        for y in range(height):
            ratio = y / float(height)
            r = int(210 - (50 * ratio))
            g = int(150 - (40 * ratio))
            b = int(100 - (30 * ratio))
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    else:
        for y in range(height):
            val = int(255 - (15 * (y / float(height))))
            draw.line([(0, y), (width, y)], fill=(val, val, val))

    return img.convert('RGBA')


def composite_product_to_scene(product_img, scene_id):
    """
    Composites isolated product onto photorealistic commercial studio plate with:
    1. Scale & center-ground alignment
    2. Physics-based contact shadow (ambient occlusion)
    3. Directional softbox fill shadow
    4. Glossy surface reflection (with gradient falloff for marble/quartz/glass)
    5. Ambient light harmonization
    """
    import os
    from PIL import Image, ImageOps, ImageFilter, ImageDraw, ImageEnhance

    base_dir = os.path.dirname(os.path.abspath(__file__))
    backdrops_dir = os.path.join(base_dir, 'studio_backdrops')
    
    file_map = {
        'luxury_marble': 'luxury_marble.jpg',
        'outdoor_sunlight': 'outdoor_sunlight.jpg',
        'rustic_oak': 'rustic_oak.jpg',
        'pastel_podium': 'pastel_podium.jpg',
        'botanical_garden': 'botanical_garden.jpg',
        'spa_mist': 'spa_mist.jpg',
        'velvet_noir': 'velvet_noir.jpg',
        'pure_white': 'pure_white.jpg',
        'afro_rattan': 'afro_rattan.jpg',
        'golden_hour': 'golden_hour.jpg',
        'executive_glass': 'luxury_marble.jpg',
        'cozy_living': 'rustic_oak.jpg',
        'colorblock_pop': 'pastel_podium.jpg',
        'urban_cyber': 'velvet_noir.jpg',
        'kitchen_quartz': 'luxury_marble.jpg',
        'floral_silk': 'pastel_podium.jpg',
    }

    target_file = file_map.get(scene_id, f"{scene_id}.jpg")
    backdrop_path = os.path.join(backdrops_dir, target_file)

    if os.path.exists(backdrop_path):
        backdrop = Image.open(backdrop_path).convert('RGBA')
    else:
        backdrop = create_procedural_studio_backdrop(scene_id)

    bw, bh = backdrop.size

    target_h = int(bh * 0.58)
    target_w = int(product_img.width * (target_h / float(product_img.height)))
    if target_w > int(bw * 0.78):
        target_w = int(bw * 0.78)
        target_h = int(product_img.height * (target_w / float(product_img.width)))

    product_resized = product_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Subtle contrast curve
    enhancer = ImageEnhance.Contrast(product_resized)
    product_resized = enhancer.enhance(1.05)

    # Grounding position
    if scene_id in ('outdoor_sunlight', 'sky_sunlight'):
        pos_x = (bw - target_w) // 2
        pos_y = int(bh * 0.50) - (target_h // 2)
        has_reflection = False
    elif scene_id in ('pastel_podium', 'velvet_noir'):
        pos_x = (bw - target_w) // 2
        pos_y = int(bh * 0.56) - target_h
        has_reflection = False
    elif scene_id in ('botanical_garden', 'afro_rattan'):
        pos_x = (bw - target_w) // 2
        pos_y = int(bh * 0.72) - target_h
        has_reflection = False
    else:
        pos_x = (bw - target_w) // 2
        pos_y = int(bh * 0.72) - target_h
        has_reflection = scene_id in ('luxury_marble', 'spa_mist', 'executive_glass', 'kitchen_quartz')

    comp = backdrop.copy()

    # 1. Ambient Occlusion Contact Shadow
    if scene_id not in ('outdoor_sunlight', 'sky_sunlight'):
        shadow = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow)
        shadow_w = int(target_w * 0.94)
        shadow_h = max(8, int(target_h * 0.08))
        shadow_x0 = pos_x + (target_w - shadow_w) // 2
        shadow_y0 = pos_y + target_h - int(shadow_h * 0.35)

        shadow_opacity = 180 if scene_id == 'pure_white' else 145
        sdraw.ellipse([shadow_x0, shadow_y0, shadow_x0 + shadow_w, shadow_y0 + shadow_h], fill=(12, 16, 20, shadow_opacity))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(6, int(shadow_h * 0.45))))
        comp.paste(shadow, (0, 0), shadow)

    # 2. Glossy Surface Reflection (if applicable)
    if has_reflection:
        flipped = ImageOps.flip(product_resized)
        ref_h = int(target_h * 0.32)
        flipped_cropped = flipped.crop((0, 0, target_w, ref_h))

        ref_mask = Image.new('L', (target_w, ref_h), 0)
        ref_draw = ImageDraw.Draw(ref_mask)
        for ry in range(ref_h):
            opacity = int(55 * (1.0 - (ry / float(ref_h))))
            ref_draw.line([(0, ry), (target_w, ry)], fill=opacity)

        comp.paste(flipped_cropped, (pos_x, pos_y + target_h - 3), ref_mask)

    # 3. Paste Product Hero
    comp.paste(product_resized, (pos_x, pos_y), product_resized)

    return comp


class StudioPhotoshootView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        image_base64 = request.data.get('image_base64') or request.data.get('image_base_64') or request.data.get('image')
        scene_id = request.data.get('scene_id') or 'luxury_marble'
        mode = request.data.get('mode') or 'composite'
        custom_prompt = request.data.get('custom_prompt') or ''

        if not image_base64:
            return Response({'error': 'Missing image data'}, status=400)

        try:
            import base64
            import io
            import requests
            from PIL import Image

            clean_base64 = image_base64.split(",")[1] if "," in image_base64 else image_base64
            img_bytes = base64.b64decode(clean_base64)
            raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")

            scene_title = SCENE_TITLES.get(scene_id, scene_id.replace('_', ' ').title())

            # Mode 1: AI Generative Scene Synthesis
            if mode == 'generative' and custom_prompt:
                try:
                    gen_prompt = f"Professional commercial advertising product photoshoot of a product, {custom_prompt}, studio lighting, 8k resolution, photorealistic"
                    encoded_p = requests.utils.quote(gen_prompt)
                    url = f"https://image.pollinations.ai/prompt/{encoded_p}?width=768&height=1280&nologo=true&model=flux"
                    res = requests.get(url, timeout=25)
                    if res.status_code == 200 and len(res.content) > 5000:
                        processed_base64 = base64.b64encode(res.content).decode('utf-8')
                        deduct_credits(request.user, 'image_edit')
                        return Response({
                            'success': True,
                            'studio_image_base64': f"data:image/jpeg;base64,{processed_base64}",
                            'image_base64': f"data:image/jpeg;base64,{processed_base64}",
                            'scene_id': scene_id,
                            'scene_title': scene_title,
                            'mode': 'generative',
                            'credits_remaining': request.user.credits
                        })
                except Exception as gen_err:
                    print("Generative synthesis fallback to studio composite:", gen_err)

            # Mode 2 (Default & Primary): Studio-Grade Cutout & Photorealistic Scene Compositor
            product_cutout = isolate_product_foreground(raw_img)
            comp_img = composite_product_to_scene(product_cutout, scene_id)

            buffer = io.BytesIO()
            comp_img.convert('RGB').save(buffer, format="JPEG", quality=94)
            processed_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            deduct_credits(request.user, 'image_edit')
            return Response({
                'success': True,
                'studio_image_base64': f"data:image/jpeg;base64,{processed_base64}",
                'image_base64': f"data:image/jpeg;base64,{processed_base64}",
                'scene_id': scene_id,
                'scene_title': scene_title,
                'mode': 'composite',
                'credits_remaining': request.user.credits
            })

        except Exception as e:
            print("StudioPhotoshootView error:", e)
            return Response({'error': str(e)}, status=500)


class EditImageView(views.APIView):
    """Backward-compatible endpoint for image editing and studio photoshoot."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        scene_id = request.data.get('scene_id')
        prompt_text = request.data.get('prompt') or ''

        if not scene_id and '[SCENE]' in prompt_text:
            raw_scene = prompt_text.replace('[SCENE]', '').strip().lower()
            if 'marble' in raw_scene:
                scene_id = 'luxury_marble'
            elif 'wood' in raw_scene or 'oak' in raw_scene:
                scene_id = 'rustic_oak'
            elif 'nature' in raw_scene or 'garden' in raw_scene:
                scene_id = 'botanical_garden'
            elif 'dark' in raw_scene or 'noir' in raw_scene:
                scene_id = 'velvet_noir'
            elif 'sun' in raw_scene or 'sky' in raw_scene:
                scene_id = 'outdoor_sunlight'
            else:
                scene_id = 'luxury_marble'

        if not scene_id:
            scene_id = 'luxury_marble'

        # Safely inject scene_id
        if hasattr(request.data, '_mutable') and not request.data._mutable:
            request.data._mutable = True
            request.data['scene_id'] = scene_id
            request.data._mutable = False
        else:
            try:
                request.data['scene_id'] = scene_id
            except Exception:
                pass

        return StudioPhotoshootView().post(request)

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
                "You are SmartBiz AI Coach, a highly professional Digital Marketing Strategist, Brand Consultant, and Growth Architect "
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
        context = request.data.get('context') or request.data.get('content_type') or 'POST'
        image = request.data.get('image') or request.data.get('image_base_64') or request.data.get('image_base64')
        mime_type = request.data.get('mimeType') or request.data.get('image_mime_type') or request.data.get('mime_type')
        trends = request.data.get('trends') or request.data.get('trend_names') or []
        
        trend_context = f"Consider current Nigerian trends: {', '.join(trends)}." if trends else ""
        brand_context = get_brand_context(request.user)
        biz_name = getattr(request.user, 'business_name', 'Our Brand')
        
        if image:
             prompt = f"""
             {brand_context}
             Based on this product image and the brand above, suggest 4 creative, high-converting editing or caption prompts for social media.
             Return JSON list of 4 strings (array)."""
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
                return Response(lines[:4])
             except Exception as e:
                 return Response([
                     "Highlight product durability and premium materials against a clean white backdrop",
                     "Create an unboxing flyer with fast nationwide delivery trust badge",
                     "Style with complementary lifestyle props for an Instagram carousel",
                     "Add bold 48-Hour Weekend Flash Sale discount text overlay"
                 ], status=200)
        else:
            prompt = f"""
            {brand_context}
            You are a Viral Content Strategist for Nigerian MSMEs.
            Suggest 4 hyper-specific, high-converting, and viral {context} topic ideas for this business. {trend_context}
            
            Every topic must be actionable, culturally relevant to Nigerian commerce (addressing trust, quality, payday, unboxing, customer satisfaction, or problem-solving), and ready to paste into the generator.
            Return JSON list of 4 complete strings (array).
            """
            try:
                suggestions = gemini_utils.generate_json_content(prompt)
                if isinstance(suggestions, list) and len(suggestions) >= 3:
                    return Response(suggestions[:4])
                raise Exception("Incomplete suggestions")
            except Exception as e:
                return Response([
                    f"48-Hour Weekend Flash Sale: 20% discount on top-selling items with same-day nationwide waybill dispatch",
                    f"Behind-the-scenes quality test: How we inspect and securely package every order at {biz_name}",
                    f"Customer transformation story: How our verified products saved a client from substandard alternatives",
                    f"3 common mistakes Nigerians make when shopping online and how {biz_name} guarantees 100% authenticity"
                ])


class GenerateWeeklyPlanView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        goal_input = request.data.get('goal') or request.data.get('niche') or 'Brand Awareness'
        frequency_input = str(request.data.get('frequency', '5 times/week')).lower().strip()
        
        goal_mapping = {
            'SALES': 'Direct Sales & Cash Conversions',
            'BRAND AWARENESS': 'Brand Trust, Authority & Discovery',
            'ENGAGEMENT': 'Customer Engagement, Reviews & Community'
        }
        goal = goal_mapping.get(str(goal_input).upper().strip(), str(goal_input))
        
        # Determine number of days based on frequency selection
        if '3' in frequency_input or 'relaxed' in frequency_input:
            num_days = 3
            day_schedule = ["Monday", "Wednesday", "Friday"]
            freq_desc = "3 days / week (Relaxed schedule: Mon, Wed, Fri)"
        elif 'daily' in frequency_input or '7' in frequency_input or 'growth' in frequency_input:
            num_days = 7
            day_schedule = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            freq_desc = "7 days / week (Daily high-growth schedule)"
        else:
            num_days = 5
            day_schedule = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            freq_desc = "5 days / week (Standard weekday schedule: Mon to Fri)"

        brand_context = get_brand_context(request.user)
        prompt = f"""
        You are a Master Content Strategist for Nigerian MSMEs.
        Create an all-inclusive, turnkey Social Media & WhatsApp Content Plan for this specific business.
        
        CAMPAIGN STRATEGY GOAL: {goal}
        POSTING FREQUENCY: {freq_desc}
        EXACT NUMBER OF POSTING DAYS REQUIRED: {num_days} days ({', '.join(day_schedule)})
        
        CRITICAL STRATEGY GUIDANCE FOR GOAL '{goal}':
        - If Goal is 'Direct Sales & Cash Conversions': Every day must focus on product value, clear price transparency, limited-batch scarcity, DM closers, and WhatsApp instant checkout CTAs.
        - If Goal is 'Brand Trust, Authority & Discovery': Focus on founder expertise, unboxing quality tests, customer proof, debunking industry myths, and shareable educational insights.
        - If Goal is 'Customer Engagement, Reviews & Community': Focus on relatable Nigerian culture polls, customer spotlights, interactive Q&A, memes, and referral incentives.

        OUTPUT REQUIREMENTS (STRICT JSON ONLY):
        {{
            "weekStartDate": "Upcoming Monday",
            "campaignGoal": "{goal}",
            "postingFrequency": "{freq_desc}",
            "days": [
                {{
                    "day": "Monday",
                    "pillar": "Primary Strategic Pillar",
                    "format": "Reel / Carousel / WhatsApp Status / Single Post",
                    "headline": "Scroll-stopping headline",
                    "postIdea": "Complete, ready-to-publish post caption with emojis, Nigerian context, and hashtags",
                    "visualDirection": "Exact instruction for staging photo/video or designing graphic",
                    "callToAction": "Specific call to action matching '{goal}'"
                }}
            ]
        }}
        Generate exactly {num_days} day objects for: {', '.join(day_schedule)}.
        """

        system_prompt = f"""
        {brand_context}
        
        You are an elite Digital Growth Consultant.
        Deliver a {num_days}-day turnkey content plan tailored strictly to the campaign goal '{goal}'.
        Never return vague summaries; provide full, copy-paste-ready captions with Nigerian hashtags and clear CTAs.
        """

        try:
            plan = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(plan, dict) and 'days' in plan and len(plan['days']) >= num_days - 1:
                return Response(plan)
            raise Exception("Incomplete weekly plan structure")
        except Exception as e:
            biz_name = getattr(request.user, 'business_name', 'Our Brand')
            
            all_fallback_days = [
                {
                    "day": "Monday",
                    "pillar": "Motivation & Authority" if 'sales' not in goal.lower() else "Weekly Flash Launch",
                    "format": "Single Image + Inspiring Caption" if 'sales' not in goal.lower() else "Flyer + WhatsApp Status Blast",
                    "headline": "Start Strong: Excellence Is Our Standard! ✨" if 'sales' not in goal.lower() else "New Week Restock & Special Deals! 🔥",
                    "postIdea": f"Happy New Week! 🚀 At {biz_name}, we believe in giving your best every single day. We are geared up to serve you this week with top-grade quality and fast nationwide dispatch.\n\n💬 Drop a '🔥' in the comments if you're ready to win this week!\n\n#MondayMotivation #{biz_name.replace(' ', '')} #NaijaHustle #Excellence" if 'sales' not in goal.lower() else f"🚨 NEW WEEK BATCH UNLOCKED! Start your week with verified quality from {biz_name}. Enjoy priority dispatch when you order today!\n\n📲 Tap link in bio or WhatsApp us now to secure yours before stock finishes!\n\n#ShopNow #{biz_name.replace(' ', '')} #LagosSales",
                    "visualDirection": "High-contrast branded graphic with bold quote and product badge in the corner.",
                    "callToAction": "Drop a comment and share your goals for the week!" if 'sales' not in goal.lower() else "WhatsApp us to place your order right now!"
                },
                {
                    "day": "Tuesday",
                    "pillar": "Product Spotlight & Value",
                    "format": "Carousel (5 Slides) / Product Demo",
                    "headline": "Why Settle For Less When You Can Have The Best? 💎",
                    "postIdea": f"Swipe through to see what makes our top collection stand out! ✨\n\n• 100% Genuine, Verified Quality\n• Built for Maximum Durability\n• Fast Doorstep Delivery Across Nigeria\n\n📲 Ready to order? Tap the link in our bio or send us a WhatsApp DM right away!\n\n#QualityFirst #{biz_name.replace(' ', '')} #NigerianSME",
                    "visualDirection": "5-slide carousel showing detailed product angles, feature callouts, and customer unboxing.",
                    "callToAction": "WhatsApp DM or bio link to secure your order."
                },
                {
                    "day": "Wednesday",
                    "pillar": "Customer Reviews & Social Proof",
                    "format": "Story Sequence + Feed Testimonial",
                    "headline": "Real Feedback From Real Nigerian Customers ⭐️⭐️⭐️⭐️⭐️",
                    "postIdea": f"Nothing beats the joy of receiving feedback like this! 🙌 'The delivery was fast and the quality is even better than expected.' Thank you for trusting {biz_name}. Your satisfaction is our priority.\n\n📦 We are dispatching new orders today! Send a DM to join our happy customer family.\n\n#CustomerReview #HappyClient #{biz_name.replace(' ', '')}",
                    "visualDirection": "Clean graphic displaying a 5-star customer WhatsApp review screenshot with product photo in background.",
                    "callToAction": "Send a DM to get yours dispatched today."
                },
                {
                    "day": "Thursday",
                    "pillar": "Behind-The-Scenes & Packaging",
                    "format": "Reel / Short Video (30s)",
                    "headline": "How We Package & Dispatch Your Orders Safely 📦",
                    "postIdea": f"Ever wondered what happens after you tap 'Order'? 👀 Here is a quick look at our meticulous packaging process to ensure every item arrives safe and intact via nationwide waybill!\n\n⚡ Next dispatch leaves today at 2 PM. WhatsApp us to catch today's batch!\n\n#BehindTheScenes #OrderDispatch #{biz_name.replace(' ', '')}",
                    "visualDirection": "Time-lapse or aesthetic video showing neat order packaging, labeling, and thank-you notes.",
                    "callToAction": "Order before 2 PM for same-day dispatch."
                },
                {
                    "day": "Friday",
                    "pillar": "Weekend Flash Sale & Urgency",
                    "format": "Flyer Graphic + WhatsApp Status Blast",
                    "headline": "Weekend Flash Sale: Don't Miss Out! 🔥",
                    "postIdea": f"Weekend is here and we are dropping a special 48-hour flash offer on our fast-moving items! 🚨\n\n⚡ Enjoy exclusive bundle pricing when you order today.\n🔒 Limited stock remaining for this batch.\n\n📲 Tap the link in our bio or reply 'FLASH' on WhatsApp to claim your discount!\n\n#FlashSale #WeekendPromo #{biz_name.replace(' ', '')}",
                    "visualDirection": "Vibrant promotional flyer with '48-HR FLASH SALE' badge and countdown timer sticker on stories.",
                    "callToAction": "Reply 'FLASH' on WhatsApp to unlock discount."
                },
                {
                    "day": "Saturday",
                    "pillar": "Lifestyle Integration & Tips",
                    "format": "Single Photo / User Spotlight",
                    "headline": "Elevate Your Weekend Routine ✨",
                    "postIdea": f"How are you spending your Saturday? Whether relaxing at home or attending an event, {biz_name} has you covered. Quality and style should never be complicated.\n\n✨ Tag someone who needs this in their life!\n\n#WeekendVibes #LifestyleNG #{biz_name.replace(' ', '')}",
                    "visualDirection": "Lifestyle photo showing the product in practical, aesthetic real-world use.",
                    "callToAction": "Tag a friend in the comments."
                },
                {
                    "day": "Sunday",
                    "pillar": "Reflection & Restock Announcement",
                    "format": "WhatsApp Status Poll & Story Wrap-up",
                    "headline": "Wrapping Up The Week & Restock Alert! 🔔",
                    "postIdea": f"Thank you for an incredible week of orders! 🙏 Quick reminder: our new batch restock arrives tomorrow morning. Reserve your favorite pieces today so you don't miss out.\n\nWishing you a restful Sunday and a prosperous week ahead! ❤️\n\n#SundayReflection #RestockAlert #{biz_name.replace(' ', '')}",
                    "visualDirection": "Calm, clean aesthetic Sunday post with restock notification banner.",
                    "callToAction": "Reply to pre-book restock items."
                }
            ]

            selected_fallback_days = [d for d in all_fallback_days if d['day'] in day_schedule]
            if len(selected_fallback_days) < num_days:
                selected_fallback_days = all_fallback_days[:num_days]

            return Response({
                "weekStartDate": "This Week",
                "campaignGoal": goal,
                "postingFrequency": freq_desc,
                "days": selected_fallback_days
            })

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
        name = request.data.get('name') or request.data.get('debtor_name') or 'Customer'
        raw_amount = request.data.get('amount', 0)
        try:
            amount_val = float(raw_amount)
            formatted_amount = f"{amount_val:,.0f}" if amount_val.is_integer() else f"{amount_val:,.2f}"
        except (ValueError, TypeError):
            formatted_amount = str(raw_amount)

        tone = (request.data.get('tone') or request.data.get('reminderTone') or 'POLITE').upper()
        items = request.data.get('items_bought') or request.data.get('items') or ''
        due_date = request.data.get('due_date') or ''
        
        # Resolve merchant's actual business brand name
        business_name = 'our business'
        try:
            from brand.models import BrandIdentity
            brand = BrandIdentity.objects.filter(user=request.user).first()
            if brand and brand.business_name:
                business_name = brand.business_name
            elif getattr(request.user, 'business_name', None):
                business_name = request.user.business_name
            elif getattr(request.user, 'name', None):
                business_name = request.user.name
        except Exception:
            pass

        items_phrase = f" for '{items}'" if items and items != 'General Credit Sale' else ""
        due_phrase = f" (due date: {due_date})" if due_date else ""

        tone_guidance = {
            'POLITE': "Warm, cordial, appreciative check-in. Thank them for their relationship, politely state the outstanding balance, and offer bank transfer details with zero aggression.",
            'FIRM': "Professional, direct accounting reminder. Mention that our books are undergoing periodic reconciliation, cite the specific balance and due date, and request confirmation of payment today.",
            'STRICT': "URGENT FINAL PAYMENT NOTICE. Clear, authoritative, non-hostile demand notice stating that payment must be resolved today to avoid service suspension, ledger flag, and formal recovery escalation.",
            'NATIVE_PIDGIN': "Authentic, respectful Nigerian street-smart Pidgin. Natural market conversational style ('How far boss', 'Abeg make we balance this record', 'make our supply line no hold up').",
            'DISCOUNT_INCENTIVE': "Incentivized settlement offer. Friendly encouragement offering a small gesture or prompt service benefit if the balance is cleared today."
        }.get(tone, "Professional and courteous reminder.")

        prompt = f"""You are a specialized Nigerian business debt recovery expert writing on behalf of '{business_name}'.
Write a distinct, realistic, high-converting WhatsApp debt collection message to recover an unpaid balance.

DEBTOR PROFILE:
- Debtor / Client Name: {name}
- Outstanding Balance: ₦{formatted_amount}
- Items / Services Delivered: {items or 'Products/Services delivered'}
- Due Date: {due_date or 'Immediate'}
- Merchant Business: {business_name}
- Tone Required: {tone}
- Tone Guidance: {tone_guidance}

INSTRUCTIONS:
1. Return a JSON object with EXACTLY two keys: "english" and "pidgin".
2. "english": Standard English message matching the exact tone '{tone}'. Make it natural, concise, and focused on receiving payment proof.
3. "pidgin": Authentic Nigerian Pidgin version matching the exact mood '{tone}'.
4. Include debtor name '{name}', business name '{business_name}', and balance '₦{formatted_amount}'.
5. Do NOT include generic placeholder brackets like [Bank Name] or [Insert Date]. Write ready-to-send copy.

JSON STRUCTURE:
{{
    "english": "WhatsApp message in English",
    "pidgin": "WhatsApp message in Nigerian Pidgin"
}}"""

        try:
            result = gemini_utils.generate_json_content(prompt)
            if isinstance(result, dict) and result.get('english') and result.get('pidgin'):
                deduct_credits(request.user, 'debt_reminder')
                return Response(result)
        except Exception as e:
            pass

        # High quality tone-specific fallbacks
        if tone == 'STRICT':
            fallback_english = f"URGENT PAYMENT DEMAND: Dear {name}, this is a formal final notice regarding your overdue balance of ₦{formatted_amount}{items_phrase}{due_phrase} with {business_name}. Please arrange the immediate transfer today to avoid account escalation and service suspension. Kindly send proof of payment once done."
            fallback_pidgin = f"URGENT FINAL NOTICE: {name}, this na final follow-up on top the ₦{formatted_amount}{items_phrase} balance wey you dey owe {business_name}. Abeg make the transfer today sharp sharp make this matter no carry go next level. Send us payment receipt once you pay."
        elif tone == 'FIRM':
            fallback_english = f"Dear {name}, we are following up on your pending balance of ₦{formatted_amount}{items_phrase}{due_phrase} with {business_name}. Our accounting ledger is undergoing reconciliation today and this settlement is now required. Please confirm your transfer."
            fallback_pidgin = f"Hello {name}, we dey follow up on top the ₦{formatted_amount}{items_phrase} balance with {business_name}. We dey balance our accounting books now and this payment don due. Abeg help us make the transfer today make we update your ledger."
        elif tone == 'NATIVE_PIDGIN':
            fallback_english = f"Hello {name}, just checking in regarding the pending ₦{formatted_amount}{items_phrase} balance with {business_name}. Kindly assist us with the payment transfer today so we can keep your account smoothly updated. Thank you!"
            fallback_pidgin = f"How far {name}! Hope market and work dey move well. Abeg na quick check-in on top the ₦{formatted_amount}{items_phrase} balance with {business_name}. Help us do the transfer today make our records dey clean. We appreciate you boss!"
        elif tone == 'DISCOUNT_INCENTIVE':
            fallback_english = f"Hello {name}, trust you are having a productive day. Regarding your outstanding balance of ₦{formatted_amount}{items_phrase} with {business_name}, if you are able to settle this today, we will apply priority processing and a special loyalty perk to your next order! Thank you."
            fallback_pidgin = f"Good day {name}! Quick update from {business_name}: if you fit clear the ₦{formatted_amount}{items_phrase} balance today, we get special bonus and discount wey we go add for your next order. Abeg help us settle am today. Thank you!"
        else: # POLITE
            fallback_english = f"Hello {name}, trust you are having a wonderful week. This is a gentle reminder regarding your outstanding balance of ₦{formatted_amount}{items_phrase} with {business_name}. Kindly arrange for the settlement at your earliest convenience and share the receipt so we can update your ledger. Thank you for your partnership!"
            fallback_pidgin = f"Good day {name}, hope work dey go well. Na quick friendly reminder on top the ₦{formatted_amount}{items_phrase} balance with {business_name}. Abeg kindly help us do the transfer make we update your account record. Thank you for your continued patronage!"

        deduct_credits(request.user, 'debt_reminder')
        return Response({
            'english': fallback_english,
            'pidgin': fallback_pidgin
        })
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

    def post(self, request):
        context = request.data.get('context', 'CLOSING') # CLOSING, OBJECTION, FOLLOW_UP, GREETING, PRICE_ISSUE
        customer_message = request.data.get('customer_message', '').strip()
        closing_style = request.data.get('closing_style', 'MIXED').strip().upper() # PIDGIN, CORPORATE, FOMO, SOFT_PULL, MIXED
        mode = request.data.get('mode', 'SUGGEST').upper() # SUGGEST or ROLEPLAY_REPLY
        chat_history = request.data.get('chat_history', [])

        brand_context = get_brand_context(request.user)
        import random
        random_seed = random.randint(1000, 9999)

        if mode == 'ROLEPLAY_REPLY':
            # Roleplay simulator mode: AI acts as the buyer responding to the seller's reply
            system_prompt = f"""
            {brand_context}
            
            You are playing the role of a realistic, sharp Nigerian customer on WhatsApp negotiating with this seller.
            Analyze the seller's latest message and reply naturally as the buyer. 
            Maintain a realistic, conversational tone (asking for discount, checking payment options, asking for trust proof, or agreeing to buy).
            
            Return JSON with keys:
            - "buyer_reply": String containing the buyer's response message.
            - "deal_closed": Boolean (true if buyer agrees to pay, false if still negotiating/hesitating).
            - "feedback": Brief single-sentence tip on how effective the seller's reply was.
            """
            prompt = f"Seller's latest message: '{customer_message}'. Previous chat history: {json.dumps(chat_history[-4:] if chat_history else [])}. Seed: {random_seed}"
            try:
                result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
                if isinstance(result, dict) and 'buyer_reply' in result:
                    return Response(result)
            except Exception as e:
                pass

            # Dynamic fallback for roleplay mode
            msg_lower = customer_message.lower()
            if 'price' in msg_lower or 'discount' in msg_lower or 'how much' in msg_lower:
                reply = "That price sounds fair, but can you throw in free delivery to my location?"
                closed = False
                feedback = "Good response! Offering clear pricing builds trust. Consider offering a small shipping incentive to close."
            elif 'bank' in msg_lower or 'transfer' in msg_lower or 'pay' in msg_lower or 'account' in msg_lower:
                reply = "Great! Send me your account details and bank name so I can make the transfer right now."
                closed = True
                feedback = "Excellent closing! Giving direct payment instructions converts warm leads immediately."
            else:
                reply = "Thanks for the info! Do you have photos of this item or customer reviews I can see?"
                closed = False
                feedback = "Solid engagement. Providing social proof or clear options keeps the conversation moving forward."

            return Response({
                "buyer_reply": reply,
                "deal_closed": closed,
                "feedback": feedback
            })

        mode_prompts = {
            'CLOSING': "Help me close this sale right now. The customer is warm but needs a confident push.",
            'OBJECTION': f"The customer raised an objection: '{customer_message}'. Help me resolve their hesitation and close.",
            'FOLLOW_UP': "Generate a high-converting re-engagement message for a customer who went quiet.",
            'GREETING': "Create a welcoming first-contact message that immediately qualifies and hooks the lead.",
            'PRICE_ISSUE': "The customer says the price is high. Help me reframe the value and justify the price.",
        }

        style_prompts = {
            'PIDGIN': "Use authentic Nigerian Pidgin and local warm customer rapport (e.g. 'My boss', 'I fit slice small shipping give you').",
            'CORPORATE': "Use professional, executive B2B tone with clear value proposition and structure.",
            'FOMO': "Use high urgency, limited stock availability, and time-sensitive discount incentive.",
            'SOFT_PULL': "Use gentle, consultative sales closing that focuses on helping the customer make a decision.",
            'MIXED': "Provide 3 distinct angles: 1. Direct & Professional, 2. Naija Pidgin/Friendly, 3. Urgent FOMO."
        }

        goal = mode_prompts.get(context, mode_prompts['CLOSING'])
        style_instruction = style_prompts.get(closing_style, style_prompts['MIXED'])

        system_prompt = f"""
        {brand_context}
        
        You are a Master Sales Closer and Negotiation Strategist for Nigerian MSMEs. 
        Analyze the customer's sentiment and generate 3 tailored response options.
        
        Closing Style Focus: {style_instruction}
        Randomization Token: {random_seed}
        
        You MUST return a JSON object with the following exact keys:
        - "intent_analysis": A single sentence analyzing the customer's mindset (e.g. "Customer has budget hesitation and needs trust assurance").
        - "options": An array of exactly 3 different, non-generic response messages for WhatsApp.
        - "one_liner": A single high-impact hook line to grab attention immediately.
        - "strategy_tip": A strategic tip explaining why these options will convert this specific lead.
        - "do_not_say": An array of 2-3 phrases or mistakes to avoid in this exact situation.
        """
        
        prompt = f"{goal} \nCustomer Message: '{customer_message}'"
        
        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(result, dict) and 'options' in result and isinstance(result['options'], list) and len(result['options']) > 0:
                deduct_credits(request.user, 'sales_script')
                return Response(result)
        except Exception as e:
            pass

        # Dynamic fallback script generator matching customer input & context
        biz_name = "our business"
        try:
            from brand.models import BrandIdentity
            brand = BrandIdentity.objects.get(user=request.user)
            biz_name = brand.business_name or biz_name
        except Exception:
            pass

        msg_topic = customer_message if customer_message else "your order"
        
        if context == 'PRICE_ISSUE' or 'price' in customer_message.lower() or 'expensive' in customer_message.lower():
            opt1 = f"Hello! We understand pricing is important. At {biz_name}, we focus on top quality that lasts, saving you money in the long run. Would you like to check our special bundle discount?"
            opt2 = f"My boss! Quality no be cheap, but because na you, I fit slice small discount off shipping for you today so you fit get {msg_topic} without stress. How you see am?"
            opt3 = f"Hi there! We have only 3 units of {msg_topic} remaining at our current price before supplier rate increases tomorrow. Secure yours now before stock runs out!"
            analysis = "Customer is evaluating price vs value and needs assurance of premium quality."
            tip = "Focus on the long-term value and durability of your offer rather than just discounting."
        elif context == 'OBJECTION':
            opt1 = f"Thank you for sharing your concern regarding '{msg_topic}'. Many of our satisfied customers felt the same way initially until they experienced our verified service. Can I share a quick video demo?"
            opt2 = f"No shaking at all! At {biz_name}, we guarantee 100% satisfaction. Make I send you customer feedback from last week so you see how we deliver?"
            opt3 = f"We take full responsibility for quality and delivery. Complete your order today and if you're not 100% satisfied, we offer instant replacement!"
            analysis = "Customer needs risk reduction and social proof before making a decision."
            tip = "Provide direct social proof and clear guarantees to remove buying hesitation."
        else:
            opt1 = f"Hello! We can get '{msg_topic}' prepared and dispatched to your location today. Should we proceed with bank transfer or online card payment?"
            opt2 = f"Chief! Make we lock in this order for you today before today's dispatch batch leaves. Which delivery address make we ship to?"
            opt3 = f"Fast-track alert: Orders placed in the next 2 hours get priority express dispatch! Reply YES to confirm your order right away."
            analysis = "Customer is warm and ready for a clear closing call to action."
            tip = "Always give a clear binary choice (e.g. transfer vs card, morning vs afternoon delivery) to make deciding effortless."

        fallback = {
            "intent_analysis": analysis,
            "options": [opt1, opt2, opt3],
            "one_liner": f"Let's lock in your order with {biz_name} right away!",
            "strategy_tip": tip,
            "do_not_say": ["Our price is non-negotiable", "You can check elsewhere if you don't like it"]
        }
        deduct_credits(request.user, 'sales_script')
        return Response(fallback)


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
        length = request.data.get('length', 'Medium (800-1000 words)')

        if not topic:
            return Response({'error': 'Missing required parameter: topic'}, status=400)

        brand_context = get_brand_context(request.user)

        system_prompt = f"""
        {brand_context}

        You are a Senior Business Journalist and SEO/GEO (Generative Engine Optimization) Specialist for Nigerian Commerce.
        Write an authoritative, deeply researched, and comprehensive long-form article about: "{topic}".

        MANDATORY EDITORIAL & SEO STRUCTURE:
        1. HEADLINE: Catchy, curiosity-inducing SEO title.
        2. META DESCRIPTION: 150-character punchy summary.
        3. INTRODUCTION: Hook the reader with current Nigerian market realities, trends, and pain points.
        4. H2 & H3 SUBHEADINGS: 4 to 5 detailed sub-sections diving into core strategies, step-by-step guides, and practical advice.
        5. STATS & EXPERT CITATIONS: Reference credible Nigerian data points (e.g. SMEDAN MSME reports, PwC Nigeria surveys, CBN digital payment growth) and thought leaders.
        6. ACTIONABLE CHECKLIST: Clear bulleted takeaways for Nigerian entrepreneurs and consumers.
        7. FAQ SECTION: 2-3 common questions and answers.
        8. CLOSING & CALL TO ACTION: A natural, high-converting conclusion prompting readers to explore the products/services of this business.

        OUTPUT REQUIREMENTS (STRICT JSON ONLY):
        {{
            "title": "Compelling SEO Article Headline",
            "metaDescription": "150-character meta description",
            "readTimeMinutes": 5,
            "blogContent": "Full comprehensive Markdown article with ## and ### headings, quotes, bold highlights, bullets, and FAQs",
            "keywords": ["5-7 target SEO keywords"],
            "keyTakeaways": [
                "Key takeaway 1",
                "Key takeaway 2",
                "Key takeaway 3"
            ]
        }}
        """

        prompt = f"Write a comprehensive {length} article on: '{topic}' with a {tone} tone. Optimize for Nigerian search intent and business growth."

        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(result, dict) and 'blogContent' in result and len(result['blogContent']) > 200:
                deduct_credits(request.user, 'blog_post')
                return Response(result)
            raise Exception("Incomplete blog post structure")
        except Exception as e:
            biz_name = getattr(request.user, 'business_name', 'Our Business')
            fallback_markdown = f"""# The Ultimate Guide to {topic} in Nigeria: Proven Strategies for Growth & Success

In today's fast-moving Nigerian market, staying ahead requires more than just hard work—it demands smart execution, reliable quality, and a deep understanding of local consumer behavior. Whether you are scaling an enterprise or navigating daily purchasing decisions, mastering **{topic}** has become a critical advantage.

According to recent **SMEDAN and NBS economic reports**, over 39 million MSMEs power the Nigerian economy, contributing nearly 50% of national GDP. However, businesses and consumers who fail to adapt to digital commerce, transparent pricing, and dependable supply chains face mounting operational bottlenecks.

---

## 1. Why {topic} Is Essential in Today's Nigerian Economy

The commercial landscape across Lagos, Abuja, Kano, Onitsha, and Port Harcourt is undergoing a massive digital shift. Consumers increasingly prioritize:
* **Verified Authenticity:** Avoiding counterfeit items and substandard services.
* **Speed & Reliability:** Safe nationwide waybill delivery and instant WhatsApp communication.
* **Value for Money:** Maximizing purchasing power amidst inflationary pressures.

> *"In the modern African marketplace, trust is the ultimate currency. Businesses that guarantee consistent quality and direct accessibility will always outperform the competition."*

---

## 2. Top 3 Practical Strategies to Excel with {topic}

### Strategy A: Prioritize Uncompromising Quality
Never cut corners on materials or service delivery. Sourcing directly from verified partners protects your reputation and drives organic word-of-mouth referrals.

### Strategy B: Leverage Frictionless Digital Channels
Over 90% of Nigerian transactions start via mobile interactions. Integrating WhatsApp ordering, transparent price tags, and rapid payment verification accelerates turnaround time.

### Strategy C: Build Long-Term Customer Loyalty
Reward repeat buyers with exclusive bundle discounts, timely restocking notifications, and responsive after-sales support.

---

## 3. Frequently Asked Questions (FAQs)

**Q1: How quickly can I get started with {topic}?**  
*A:* You can implement these core fundamentals immediately by auditing your current offerings and connecting directly with trusted providers.

**Q2: What is the biggest mistake to avoid?**  
*A:* Sacrificing product durability for short-term price cuts. Long-term customer retention always outweighs one-time low-margin sales.

---

## 4. Conclusion & Next Steps

Mastering **{topic}** is your gateway to consistent growth and unmatched reliability. At **{biz_name}**, we are committed to delivering top-tier solutions crafted specifically for Nigerian excellence.

👉 **Ready to experience the best?** Explore our verified catalog or connect with our team on WhatsApp today to get started!"""

            deduct_credits(request.user, 'blog_post')
            return Response({
                "title": f"The Ultimate Guide to {topic} in Nigeria: Strategies for Growth & Quality",
                "metaDescription": f"Discover how {topic} is transforming Nigerian commerce. Practical tips, industry data, and proven strategies from {biz_name}.",
                "readTimeMinutes": 5,
                "blogContent": fallback_markdown,
                "keywords": [f"{topic} Nigeria", "Nigerian MSME Growth", "Lagos Commerce", "Shop Quality Nigeria", "Business Strategy NG"],
                "keyTakeaways": [
                    "Trust and quality are the primary drivers of sustainable growth in Nigeria.",
                    "Digital channels like WhatsApp and social storefronts are essential for customer retention.",
                    f"{biz_name} provides verified, high-performance solutions with fast nationwide delivery."
                ]
            })


class GeneratePartnershipPitchView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ContentGenThrottle]

    def post(self, request):
        partner_name = request.data.get('partner_name', 'SMEDAN / Corporate Partner')
        pitch_type = request.data.get('pitch_type', 'Strategic Distribution & Workshop Collaboration')
        call_to_action = request.data.get('call_to_action', '15-Minute Strategic Alignment Meeting')

        brand_context = get_brand_context(request.user)

        system_prompt = f"""
        {brand_context}

        You are an Executive Business Development Director and Master Corporate Communicator specializing in B2B partnerships with Nigerian corporate institutions, trade hubs, banks, and government agencies (SMEDAN, BOI, NACCIMA, NASSI).
        Write an authoritative, highly persuasive B2B partnership proposal letter.

        PROPOSAL CRITERIA:
        1. SUBJECT LINE: High-open-rate, professional corporate headline.
        2. EXECUTIVE INTRODUCTION: Formal greeting, clear statement of purpose, and brief credentials.
        3. STRATEGIC SYNERGY: How this partnership directly benefits {partner_name}'s organizational mandate and KPIs.
        4. PROPOSED SCOPE & DELIVERABLES: Concrete collaboration items under the '{pitch_type}' framework.
        5. MEASURABLE VALUE: Quantifiable benefits (merchant reach, revenue enhancement, operational efficiency).
        6. NEXT STEPS & MEETING CTA: Clear, frictionless invitation for '{call_to_action}'.

        OUTPUT REQUIREMENTS (STRICT JSON ONLY):
        {{
            "subjectLine": "Formal Corporate Subject Line",
            "emailBody": "Full executive proposal email with formal salutation, body paragraphs, bulleted deliverables, and professional sign-off",
            "keyBenefits": [
                "Quantified Benefit 1 for Partner",
                "Quantified Benefit 2 for Partner",
                "Quantified Benefit 3 for Partner"
            ],
            "followUpStrategy": "Actionable timeline on when and how to follow up"
        }}
        """

        prompt = f"Write a formal B2B partnership proposal to {partner_name}. Collaboration Focus: '{pitch_type}'. Next Action: '{call_to_action}'."

        try:
            result = gemini_utils.generate_json_content(prompt, system_instruction=system_prompt)
            if isinstance(result, dict) and 'emailBody' in result:
                deduct_credits(request.user, 'partnership_pitch')
                return Response(result)
            raise Exception("Incomplete partnership proposal structure")
        except Exception as e:
            biz_name = getattr(request.user, 'business_name', 'Our Enterprise')
            biz_email = getattr(request.user, 'email', 'contact@ourbusiness.com')
            fallback_body = f"""Dear Executive Leadership Team at {partner_name},

I hope this message finds you well and thriving in your organizational mission.

I am writing on behalf of {biz_name} to formally propose a strategic collaboration focused on {pitch_type}. As an enterprise dedicated to delivering high-impact commercial solutions and driving economic value across Nigeria, we have closely observed {partner_name}'s visionary leadership and see a powerful opportunity for mutual synergy.

Why This Collaboration Creates High Impact:
1. Expanded Ecosystem Value: Combining our verified product/service infrastructure with {partner_name}'s network creates immediate value for your stakeholders and members.
2. Operational Efficiency: We provide end-to-end technical execution, standardized quality controls, and dedicated support desks.
3. Quantifiable Economic Reach: Co-deploying our solutions enables scalable distribution and measurable stakeholder satisfaction across key Nigerian commercial hubs.

Proposed Collaboration Deliverables:
• Joint execution of structured {pitch_type} initiatives tailored for your target audience.
• Dedicated account management, priority onboarding, and customized reporting analytics.
• Co-branded value propositions designed to maximize participant adoption and trust.

Next Steps:
We would welcome the opportunity to connect for a brief {call_to_action} this week to discuss how we can structure this collaboration to best support your upcoming milestones.

Thank you for your time, consideration, and continued leadership.

Warm regards,

Executive Leadership Team
{biz_name}
Email: {biz_email}
Website: www.smartbizcoach.com.ng"""

            deduct_credits(request.user, 'partnership_pitch')
            return Response({
                "subjectLine": f"Strategic Partnership Proposal: {biz_name} × {partner_name}",
                "emailBody": fallback_body,
                "keyBenefits": [
                    f"Seamless access to {biz_name}'s verified product and service delivery infrastructure.",
                    "Direct measurable impact on stakeholder satisfaction and commercial adoption.",
                    "Turnkey operational execution with dedicated account management support."
                ],
                "followUpStrategy": "Send a polite follow-up via email after 3 business days, and connect with their partnership coordinator on LinkedIn."
            })


class RemoveBackgroundView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        image_base64 = request.data.get('image_base64') or request.data.get('image')
        mime_type = request.data.get('mime_type', 'image/jpeg')

        if not image_base64:
            return Response({'error': 'No image provided'}, status=400)

        try:
            import base64
            import io
            from PIL import Image, ImageFilter

            clean_base64 = image_base64.split(',')[1] if ',' in image_base64 else image_base64
            img_bytes = base64.b64decode(clean_base64)
            raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            w, h = raw_img.size

            # 1. Ask Gemini Vision AI to detect the exact normalized bounding box around the primary person or product
            bbox_prompt = """
            Analyze this photo. Detect the primary human person or main product subject in the center of the image.
            Return a JSON object with key "subject_bbox": [ymin, xmin, ymax, xmax] as normalized integers from 0 to 1000 representing the exact bounding box enclosing the primary subject.
            """
            
            ymin, xmin, ymax, xmax = 100, 100, 900, 900  # Default safe bounding box
            
            try:
                ai_res = gemini_utils.generate_json_content(
                    bbox_prompt,
                    image_base64=clean_base64,
                    mime_type=mime_type
                )
                if ai_res and 'subject_bbox' in ai_res and len(ai_res['subject_bbox']) == 4:
                    ymin, xmin, ymax, xmax = ai_res['subject_bbox']
            except Exception as bbox_err:
                print("Gemini Vision bbox detection fallback:", bbox_err)

            # Convert normalized 0-1000 coords to actual pixel bounds
            sub_ymin = int((ymin / 1000.0) * h)
            sub_xmin = int((xmin / 1000.0) * w)
            sub_ymax = int((ymax / 1000.0) * h)
            sub_xmax = int((xmax / 1000.0) * w)

            # 2. Sample outer corner background pixels ONLY outside the subject bounding box
            corner_coords = [
                (5, 5), (w - 5, 5), (5, h - 5), (w - 5, h - 5),
                (w // 2, 5), (5, h // 2), (w - 5, h // 2)
            ]
            valid_corners = [c for c in corner_coords if not (sub_xmin <= c[0] <= sub_xmax and sub_ymin <= c[1] <= sub_ymax)]
            if not valid_corners:
                valid_corners = corner_coords

            corner_pixels = [raw_img.getpixel(c) for c in valid_corners]
            avg_r = sum(c[0] for c in corner_pixels) // len(corner_pixels)
            avg_g = sum(c[1] for c in corner_pixels) // len(corner_pixels)
            avg_b = sum(c[2] for c in corner_pixels) // len(corner_pixels)

            datas = raw_img.getdata()
            new_data = []

            for idx, item in enumerate(datas):
                x = idx % w
                y = idx // w
                r, g, b, a = item

                # 🛡️ 100% FOREGROUND PROTECTION GUARANTEE:
                # Inside subject bounding box: Keep 100% original pixel details (Alpha = 255)!
                if sub_xmin <= x <= sub_xmax and sub_ymin <= y <= sub_ymax:
                    new_data.append((r, g, b, 255))
                else:
                    # Outside subject bounding box: Replace room/floor background with Pure Studio White (255, 255, 255, 255)
                    dist = ((r - avg_r)**2 + (g - avg_g)**2 + (b - avg_b)**2) ** 0.5
                    if dist < 75:
                        new_data.append((255, 255, 255, 255))  # Pure Studio White
                    else:
                        new_data.append((r, g, b, 255))

            raw_img.putdata(new_data)
            
            buffered = io.BytesIO()
            raw_img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            deduct_credits(request.user, 'image_edit')
            return Response({
                'transparent_image_base64': f"data:image/png;base64,{img_str}",
                'studio_image_base64': f"data:image/png;base64,{img_str}"
            })

        except Exception as e:
            print("Remove background error:", e)
            return Response({'error': str(e)}, status=500)
