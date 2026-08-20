import os
import json
import urllib.request
import urllib.error
import time
import hashlib

# Google Gemini defaults (Using Google's production Gemini 3.6 Flash & 3.5 Flash Lite engines)
DEFAULT_TEXT_MODEL = "gemini-3.6-flash"
DEFAULT_FAST_MODEL = "gemini-3.5-flash-lite"
DEFAULT_FALLBACK_MODEL = "gemini-3.6-flash"
DEFAULT_VISION_MODEL = "gemini-3.6-flash"

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

KEY_INDEX = 0

def get_gemini_api_keys():
    """
    Returns a list of all configured Gemini API keys from environment variables.
    """
    keys = []
    
    # Auto-load from .env if not yet loaded
    try:
        from pathlib import Path
        from dotenv import load_dotenv
        base_dir = Path(__file__).resolve().parent.parent
        load_dotenv(base_dir / '.env')
        load_dotenv(base_dir.parent / '.env')
        load_dotenv(base_dir.parent / '.env.local')
    except Exception:
        pass

    try:
        from django.conf import settings
        if getattr(settings, 'GEMINI_API_KEY', None):
            k = str(settings.GEMINI_API_KEY).strip()
            if k and k not in keys:
                keys.append(k)
    except Exception:
        pass

    raw_keys = os.environ.get("GEMINI_API_KEYS", "")
    if raw_keys:
        for k in raw_keys.split(","):
            k_clean = k.strip()
            if k_clean and k_clean not in keys:
                keys.append(k_clean)

    for env_var, val in os.environ.items():
        if env_var.startswith("GEMINI_API_KEY"):
            v = val.strip()
            if v and v not in keys:
                keys.append(v)

    return keys

def get_next_gemini_api_key(attempt_offset=0):
    global KEY_INDEX
    keys = get_gemini_api_keys()
    if not keys:
        return None
    index = (KEY_INDEX + attempt_offset) % len(keys)
    return keys[index]

def make_gemini_request(messages, model=DEFAULT_TEXT_MODEL, response_format=None, system_instruction=None):
    keys = get_gemini_api_keys()
    if not keys:
        raise Exception("Configuration Error: GEMINI_API_KEY not found in environment.")

    # 1. In-memory cache lookup (Bypass cache for dynamic generation prompts)
    cache_key = get_cache_key(messages, model, response_format, system_instruction)
    now = time.time()
    msg_str = str(messages).lower()
    is_dynamic = "trend" in msg_str or "concept" in msg_str or "caption" in msg_str or "topic" in msg_str or "script" in msg_str or "chat" in msg_str or "antigravity" in msg_str or "support" in msg_str or "debt" in msg_str or "nudge" in msg_str or "reminder" in msg_str or "debtor" in msg_str or "owe" in msg_str
    if not is_dynamic and cache_key in PROMPT_CACHE:
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
                                    clean_data = "".join(base64_data.split())
                                    parts.append({
                                        "inline_data": {
                                            "mime_type": mime_type,
                                            "data": clean_data
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

    max_retries = max(6, len(keys) * 2)
    backoff_delay = 1.5

    # Target model cascade: Try requested model (gemini-3.6-flash), fallback to 3.5-flash-lite, then 2.0-flash
    model_cascade = [model, DEFAULT_FAST_MODEL, DEFAULT_FALLBACK_MODEL]

    for attempt in range(max_retries):
        current_key = get_next_gemini_api_key(attempt_offset=attempt)
        active_model = model_cascade[attempt % len(model_cascade)]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={current_key}"

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                try:
                    candidate = result['candidates'][0]
                    text_response = candidate['content']['parts'][0]['text']
                    
                    # Update global index to working key for round-robin load balancing
                    global KEY_INDEX
                    KEY_INDEX = (KEY_INDEX + attempt) % len(keys)

                    # Cache successful response
                    PROMPT_CACHE[cache_key] = (time.time(), text_response)
                    return text_response
                except (KeyError, IndexError) as parse_err:
                    print(f"Gemini response structure unexpected: {result}")
                    raise Exception(f"Gemini API parse error: {parse_err}")
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode()
            if e.code == 429:
                if len(keys) > 1 and attempt < max_retries - 1:
                    print(f"Gemini API 429 on Key #{(KEY_INDEX + attempt) % len(keys) + 1}. Instant rotation to Key #{((KEY_INDEX + attempt + 1) % len(keys)) + 1}...")
                    # Immediately rotate and try again without sleep
                    continue

                if attempt < max_retries - 1:
                    print(f"Gemini API 429 Quota Exceeded. Waiting {backoff_delay:.1f}s before retry... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(min(backoff_delay, 10.0))
                    backoff_delay *= 1.5
                    continue
                else:
                    # Return graceful simulated fallback text instead of throwing hard 500 error
                    print("API Quota Exhausted and Retries Failed. Executing Local AI Fallback Engine.")
                    if response_format and response_format.get("type") == "json_object":
                        return get_dynamic_json_fallback(messages)
                    return get_dynamic_string_fallback(messages)
            
            print(f"Gemini API Error: {e.code} - {error_msg}")
            # If we hit an auth or bad key error, immediately rotate keys and try
            if (e.code == 400 or e.code == 403 or e.code == 401) and len(keys) > 1 and attempt < max_retries - 1:
                print(f"Gemini API error {e.code} on current key. Rotating to next key...")
                continue
            
            # Local fallback for standard auth / rate limit block
            if response_format and response_format.get("type") == "json_object":
                return get_dynamic_json_fallback(messages)
            return get_dynamic_string_fallback(messages)
        except Exception as exc:
            if attempt < max_retries - 1:
                print(f"Gemini request failed: {exc}. Rotating keys and retrying... (Attempt {attempt+1}/{max_retries})")
                time.sleep(0.2)
                continue
            
            if response_format and response_format.get("type") == "json_object":
                return get_dynamic_json_fallback(messages)
            return get_dynamic_string_fallback(messages)

def get_dynamic_string_fallback(messages):
    """
    Returns unique, context-aware text responses when non-JSON API fallback triggers.
    """
    import random
    msg_str = str(messages).lower()
    
    # 1. Chat Support / Advisory responses
    if "antigravity" in msg_str or "support" in msg_str or "help" in msg_str or "how to" in msg_str or "my business" in msg_str or "strategy" in msg_str:
        responses = [
            "Great question! To scale up your business quickly, focus on high-converting WhatsApp status updates, setting clear invoice payment terms, and using our Content Studio to publish daily product flyers. Let me know if you need help with a specific tool!",
            "To boost sales this week, try offering a limited-time bundle deal or running an automated debtor reminder in Gbege Book. How else can I assist your growth strategy today?",
            "Building customer trust is key! Make sure your brand profile logo is uploaded in Brand Builder and send custom professional invoices directly to clients. What specific challenge are you facing right now?",
            "I'm here to support you! You can explore our Find Funding board for active SME grant opportunities or generate viral video scripts in Content Studio. What area of your business should we optimize next?"
        ]
        return random.choice(responses)

    # 2. Debt recovery reminder response
    if "debt" in msg_str or "debtor" in msg_str or "owe" in msg_str or "nudge" in msg_str or "balance" in msg_str:
        return "Hello! Trust you are having a productive day. This is a friendly reminder regarding your outstanding balance. Kindly arrange for the settlement at your earliest convenience so we can balance our ledger. Thank you for your continued partnership!"
        
    return "Hello! Thank you for connecting with our business. Let us know how we can best assist you today."

def get_dynamic_json_fallback(messages):
    """
    Scans the prompt/messages context to return the correct JSON structure for the calling feature.
    """
    prompt_str = str(messages).lower()

    # 0. Debt Reminder Generator
    if "debt" in prompt_str or "debtor" in prompt_str or "nudge" in prompt_str or "owe" in prompt_str or "balance" in prompt_str:
        return json.dumps({
            "english": "Hello! Trust you are doing well. This is a gentle reminder regarding your outstanding balance. Kindly arrange for the settlement at your earliest convenience so we can update your payment ledger. Thank you for your cooperation!",
            "pidgin": "Good day! Hope work dey go well. Na gentle reminder on top the outstanding balance wey still dey pending. Abeg kindly help us do the transfer make we update your record. Thank you as you dey patronize us!"
        })

    # 0.1 Business Plan Generator
    if "business plan" in prompt_str or "executivesummary" in prompt_str or "financialprojection" in prompt_str or "swotanalysis" in prompt_str or "investor-ready" in prompt_str:
        return json.dumps({
            "executiveSummary": "This enterprise is strategically positioned to capture significant market share in the Nigerian MSME sector by delivering high-value, cost-effective products and services tailored for local consumers and businesses. With disciplined customer service, optimized digital distribution, and robust financial controls, the business aims for sustainable profitability and scalable operations.",
            "marketAnalysis": "Nigeria's dynamic commercial landscape offers strong demand for reliable, accessible solutions. Target demographics include urban consumers and growing small-to-medium enterprises. Key market drivers include population growth, digital adoption via WhatsApp and social media, and rising demand for reliable local brands.",
            "marketingStrategy": "Omni-channel marketing strategy leveraging targeted WhatsApp broadcast campaigns, engaging Instagram/TikTok short-form content, strategic influencer collaborations, and word-of-mouth customer referral incentives.",
            "financialProjection": "12-Month Financial Outline (NGN):\n- Projected Monthly Gross Revenue: ₦1,500,000 - ₦3,500,000\n- Average Gross Margin: 35% - 45%\n- Estimated Operating Expenses (OPEX): ₦600,000/month\n- Projected Break-even Timeline: Months 4 to 6\n- Estimated Year 1 Net Profit Margin: 25%",
            "operationalPlan": "Day-to-day operations prioritize lean inventory management, direct verified supplier relationships to minimize cost spikes, reliable dispatch logistics partnerships, and dedicated alternative solar/inverter power backup to ensure uninterrupted business continuity.",
            "swotAnalysis": "### SWOT Analysis\n\n| Category | Key Factors |\n| :--- | :--- |\n| **Strengths** | Direct customer relationships, low overhead agile structure, rapid digital ordering |\n| **Weaknesses** | Initial capital constraints, dependency on third-party dispatch couriers |\n| **Opportunities** | Untapped regional expansion across Nigerian states, corporate B2B bulk packages |\n| **Threats** | Macroeconomic inflation, fuel price volatility, foreign exchange fluctuations |",
            "riskMitigation": "1. Price Buffer Strategy: Maintain flexible pricing tied to supplier cost changes.\n2. Energy Resilience: Utilize low-power solar inverter solutions.\n3. Cash Flow Protection: Enforce strict payment terms and advance deposits on large orders."
        })
    
    # 1. Social post content creator
    if "caption" in prompt_str or "hashtags" in prompt_str or "carousel" in prompt_str or "social" in prompt_str:
        return json.dumps({
            "caption": "🚨 STOP SCROLLING! ✨ Upgrade your daily standard with premium verified quality! Are you tired of disappointing delivery and poor materials? We deliver dependable excellence designed for high performance.\n\n💎 100% Guaranteed Authenticity\n⚡ Fast Lagos & Nationwide Door-Step Waybill Dispatch\n🤝 Friendly 24/7 Customer Assistance\n\n📲 Tap the link in our bio or send us a WhatsApp DM right now to secure yours today!",
            "whatsAppStatus": "✨ New Stock Alert!\n• Premium Quality 💎\n• Fast Nationwide Delivery ⚡\n• Limited Quantity 🔥\n\nReply 'ORDER' to get yours now!",
            "hashtags": ["#NigerianBrand", "#LagosBusiness", "#NaijaSME", "#ShopLocalNG", "#VerifiedMerchant", "#NaijaHustle", "#OnlineStoreNG"],
            "callToAction": "Send a WhatsApp DM to place your order now!",
            "callToActionVariations": [
                "⚡ Hurry! Current batch is selling fast — tap link in bio to secure yours.",
                "💬 Have questions? Send us a DM and our friendly team will assist you immediately.",
                "📲 Click the link in bio or WhatsApp us directly for same-day dispatch."
            ],
            "imageText": "Premium Quality • Fast Delivery",
            "dmReply": "Hello! 👋 Thank you for reaching out to us. We currently have units in stock ready for immediate nationwide waybill dispatch! Would you like me to share our promo pricing and delivery options for your location?",
            "slides": [
                {"slideNumber": 1, "title": "Why Settle For Less? 🔥", "content": "Discover a new standard of quality and affordability in Nigeria.", "visualDirection": "High-contrast cover slide with bold typography and product highlight."},
                {"slideNumber": 2, "title": "The Problem We Solve 💡", "content": "Say goodbye to cheap alternatives that fail in weeks. We provide lasting value.", "visualDirection": "Clean side-by-side comparison visual."},
                {"slideNumber": 3, "title": "Premium Features ✨", "content": "Crafted with durable materials and strictly inspected for your satisfaction.", "visualDirection": "Detailed product close-up with 3 feature callouts."},
                {"slideNumber": 4, "title": "Customer Reviews ⭐️⭐️⭐️⭐️⭐️", "content": "Join hundreds of happy customers across Nigeria who trust our service.", "visualDirection": "Customer WhatsApp review graphic."},
                {"slideNumber": 5, "title": "Claim Yours Today 🚀", "content": "Tap link in bio or WhatsApp us to order before this batch finishes!", "visualDirection": "Bold closing slide with WhatsApp call to action button."}
            ]
        })
        
    # 2. Video Script generator
    if "script" in prompt_str or "hook" in prompt_str or "teleprompter" in prompt_str or "audio_suggestions" in prompt_str:
        teleprompter = "If you're in Nigeria and looking for the best quality and value, stop scrolling right now! Most options on the market either disappoint or don't last. That's why we engineered this premium solution for you. Look at this build quality and finish. It delivers 100% reliability, looks incredible, and is backed by fast nationwide delivery. Stock is strictly limited, so click the link in our bio or send us a WhatsApp DM right now to secure yours before it sells out!"
        return json.dumps({
            "title": "The Ultimate Quality Showcase 🔥",
            "hook": "If you've been looking for the best in Nigeria, stop scrolling right now!",
            "estimated_duration": "30s",
            "body": teleprompter,
            "teleprompter_script": teleprompter,
            "callToAction": "Click the link in bio or WhatsApp us to order now!",
            "audio_suggestions": ["Trending Afrobeats Instrumental", "Fast-paced TikTok Vlog Beat"],
            "caption_for_post": "Don't compromise on quality! ✨ Fast nationwide dispatch. WhatsApp link in bio! #NaijaTech #ShopNigeria #ViralReels #SMEGrowth",
            "script_breakdown": [
                {"timeframe": "0:00 - 0:03", "section": "The Viral Hook", "visual": "Direct eye contact with camera, holding product with bold text: 'STOP SCROLLING! 🚨'", "spoken_words": "If you've been looking for the best in Nigeria, stop scrolling right now!", "audio_sfx": "Upbeat bass drop"},
                {"timeframe": "0:03 - 0:15", "section": "The Relatable Problem", "visual": "Showing frustration with common poor quality alternatives.", "spoken_words": "We all know how frustrating it is to spend hard-earned money on items that fail quickly.", "audio_sfx": "Subtle background rhythm"},
                {"timeframe": "0:15 - 0:45", "section": "The Solution & Live Demo", "visual": "Slow-motion close up panning across product, demonstrating premium finish.", "spoken_words": "Every piece is strictly inspected for 100% durability, style, and top performance.", "audio_sfx": "High-energy Afrobeats tempo"},
                {"timeframe": "0:45 - 0:60", "section": "Scarcity & Direct CTA", "visual": "Smile, point down to bio link with WhatsApp overlay.", "spoken_words": "Click the link in our bio or send us a WhatsApp DM right now to get yours with fast nationwide delivery!", "audio_sfx": "Cash register sound / Outro punch"}
            ]
        })

    # 2.1 Weekly Content Plan
    if "weekly plan" in prompt_str or "7-day" in prompt_str or "content plan" in prompt_str:
        return json.dumps({
            "weekStartDate": "This Week",
            "campaignGoal": "Drive Direct Sales & Brand Discovery",
            "days": [
                {"day": "Monday", "pillar": "Motivation & Purpose", "format": "Single Image + Thought Leadership", "headline": "Start Strong: Excellence Is Our Standard! ✨", "postIdea": "Happy New Week! Consistency and quality drive success. We are ready to serve you with prompt nationwide delivery! Drop a '🔥' if you're ready to win this week!", "visualDirection": "Branded graphic with inspirational quote.", "callToAction": "Share your weekly goals below!"},
                {"day": "Tuesday", "pillar": "Product Spotlight & Value", "format": "Carousel (5 Slides)", "headline": "Why Settle For Less? 💎", "postIdea": "Swipe to explore what makes our collection unique! 100% Genuine Quality, Fast Nationwide Delivery. Tap link in bio to order!", "visualDirection": "5-slide carousel showing detailed product angles.", "callToAction": "WhatsApp DM or bio link to order."},
                {"day": "Wednesday", "pillar": "Customer Reviews & Social Proof", "format": "Story & Feed Testimonial", "headline": "Real Feedback From Real Nigerian Customers ⭐️⭐️⭐️⭐️⭐️", "postIdea": "Thank you for trusting our quality and fast dispatch! 'The delivery was fast and the quality is amazing.' Join our happy customer family today!", "visualDirection": "5-star customer review screenshot graphic.", "callToAction": "Send a DM to get yours dispatched."},
                {"day": "Thursday", "pillar": "Behind-The-Scenes & Packaging", "format": "Reel / Short Video (30s)", "headline": "How We Package & Dispatch Orders Safely 📦", "postIdea": "Take a look at our meticulous packaging process to ensure every item arrives safe and intact via nationwide waybill!", "visualDirection": "Short aesthetic video showing neat order packaging.", "callToAction": "Order before 2 PM for same-day dispatch."},
                {"day": "Friday", "pillar": "Weekend Flash Sale & Urgency", "format": "Flyer Graphic + WhatsApp Blast", "headline": "Weekend Flash Sale: Don't Miss Out! 🔥", "postIdea": "Special 48-hour flash offer on our top items! Limited stock remaining. Tap link in bio or reply 'FLASH' on WhatsApp to claim!", "visualDirection": "Vibrant promotional flyer with 48-HR FLASH SALE badge.", "callToAction": "Reply 'FLASH' on WhatsApp to unlock discount."},
                {"day": "Saturday", "pillar": "Lifestyle Integration & Tips", "format": "Single Photo / User Spotlight", "headline": "Elevate Your Routine ✨", "postIdea": "Quality and style should never be complicated. Tag someone who needs this in their life!", "visualDirection": "Lifestyle photo showing the product in practical use.", "callToAction": "Tag a friend in the comments."},
                {"day": "Sunday", "pillar": "Reflection & Restock Announcement", "format": "Story Wrap-up & Status Poll", "headline": "Wrapping Up The Week & Restock Alert! 🔔", "postIdea": "Thank you for an incredible week of orders! New restock arrives tomorrow morning. Pre-book your favorites now!", "visualDirection": "Clean Sunday post with restock notification banner.", "callToAction": "Reply to pre-book restock items."}
            ]
        })

    # 2.2 Blog Post generator
    if "blog" in prompt_str or "meta description" in prompt_str or "seo" in prompt_str or "geo" in prompt_str:
        return json.dumps({
            "title": "Proven Strategies for MSME Growth & Product Excellence in Nigeria",
            "metaDescription": "Discover how quality sourcing, digital channels, and customer trust drive sustainable business growth across Nigerian commercial hubs.",
            "readTimeMinutes": 5,
            "blogContent": "# Strategies for Business Growth & Customer Trust in Nigeria\n\nIn today's fast-moving Nigerian market, staying ahead requires smart execution, reliable quality, and a deep understanding of local consumer behavior.\n\nAccording to **SMEDAN and NBS reports**, over 39 million MSMEs power the Nigerian economy. Businesses that embrace digital channels like WhatsApp ordering and guarantee consistent quality outperform the competition.\n\n## 1. Prioritize Product Quality & Authenticity\nNever compromise on materials or service delivery. Sourcing directly from verified partners protects your reputation and drives organic word-of-mouth referrals.\n\n## 2. Leverage Frictionless Mobile Commerce\nOver 90% of Nigerian transactions initiate on mobile devices. Fast response times on WhatsApp, transparent pricing, and prompt dispatch build lasting loyalty.\n\n## 3. FAQs\n**Q: How quickly can I get started?**\n*A:* Audit your current customer journey and implement standardized order follow-ups today.\n\n## Conclusion\nConsistency and authentic value are the keys to long-term profitability. Connect with our team to experience verified quality today!",
            "keywords": ["Nigerian MSME Growth", "Lagos Commerce", "Shop Quality Nigeria", "Business Strategy NG", "WhatsApp Commerce"],
            "keyTakeaways": [
                "Trust and quality are the primary drivers of sustainable growth in Nigeria.",
                "Digital channels like WhatsApp are essential for customer retention.",
                "Standardized fulfillment ensures customer satisfaction."
            ]
        })

    # 2.3 Partnership Pitch generator
    if "partnership" in prompt_str or "proposal" in prompt_str or "pitch" in prompt_str or "synergy" in prompt_str:
        return json.dumps({
            "subjectLine": "Strategic Partnership Proposal: Joint Distribution & Value Creation",
            "emailBody": "Dear Executive Leadership Team,\n\nI hope this message finds you well.\n\nI am writing to formally propose a strategic collaboration to co-deploy high-impact commercial solutions. Combining our verified delivery infrastructure with your organizational network creates immediate value for your members and stakeholders.\n\nKey Strategic Synergy Points:\n1. Direct Ecosystem Access: Seamless integration with verified merchant and supply networks.\n2. Turnkey Execution: Standardized quality controls, dedicated account management, and prompt support.\n3. Measurable Impact: Quantifiable improvements in stakeholder adoption and operational efficiency.\n\nWe would welcome a brief 15-minute alignment call this week to discuss how we can support your upcoming milestones.\n\nWarm regards,\nExecutive Leadership Team",
            "keyBenefits": [
                "Seamless access to verified product and service delivery infrastructure.",
                "Direct measurable impact on stakeholder satisfaction.",
                "Turnkey operational execution with dedicated account management."
            ],
            "followUpStrategy": "Follow up via email in 3 business days, and connect with their partnership lead on LinkedIn."
        })

    # 3. Dynamic Marketing Trend Ideas Fallback
    if "trend" in prompt_str or "marketing concept" in prompt_str:
        vibe_ideas = [
            {"trendName": "Month-End Payday Flash Promo", "description": "Capitalize on salary disbursements by offering a 48-hour bundle discount on top inventory items.", "application": "Run a broadcast on WhatsApp Status with countdown timer stickers."},
            {"trendName": "Inflation Relief Combo Pack", "description": "Package complementary items together at an all-inclusive, pocket-friendly price point.", "application": "Create a multi-slide carousel highlighting cost savings vs buying individually."},
            {"trendName": "Behind-The-Scenes Packaging & Dispatch", "description": "Show customers the care, cleanliness, and security of packaging their orders for nationwide waybill.", "application": "Record a 30s TikTok/Reels video with trending Afrobeats audio."},
            {"trendName": "WhatsApp VIP Referral Loop", "description": "Reward existing buyers with a 5% discount on their next purchase when their friends order.", "application": "Send automated loyalty reminders to past buyers in your contact book."}
        ]
        return json.dumps({"trends": vibe_ideas})

    # 0.2 Product Inventory Snap & List Scanner Fallback
    if "product" in prompt_str or "inventory" in prompt_str or "retail selling price" in prompt_str or "category" in prompt_str or "listing" in prompt_str:
        return json.dumps({
            "name": "Premium Quality Verified Merchant Item",
            "price": 16500,
            "cost_price": 10500,
            "product_type": "PHYSICAL",
            "category": "General Goods",
            "description": "High-quality, durable inventory piece sourced for dependable performance and style. Guaranteed authentic with fast nationwide delivery and easy WhatsApp ordering."
        })

    # 4. Default fallback values
    return json.dumps({
        "options": [
            "Hello! Thanks for reaching out. How can I help you complete your order?",
            "Hey there! Let's get you set up with this order right away.",
            "Hurry! Grab yours now before stock runs out."
        ],
        "one_liner": "Let's close this order for you today!",
        "strategy_tip": "Keep the conversation flowing and make ordering as simple as possible.",
        "do_not_say": ["Please reply now", "Price is final"]
    })



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
        clean_b64 = image_base64
        if ";base64," in clean_b64:
            clean_b64 = clean_b64.split(";base64,")[1]
        clean_b64 = "".join(clean_b64.split())
        parts.append({
            "inline_data": {
                "mime_type": mime_type or "image/jpeg",
                "data": clean_b64
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
        clean_b64 = image_base64
        if ";base64," in clean_b64:
            clean_b64 = clean_b64.split(";base64,")[1]
        clean_b64 = "".join(clean_b64.split())
        parts.append({
            "inline_data": {
                "mime_type": mime_type or "image/jpeg",
                "data": clean_b64
            }
        })
    if audio_base64:
        clean_audio = "".join(audio_base64.split())
        parts.append({
            "inline_data": {
                "mime_type": mime_type or "audio/webm",
                "data": clean_audio
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
