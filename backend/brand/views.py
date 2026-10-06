import re
from rest_framework import generics, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BrandIdentity
from .serializers import BrandSerializer
from smartbiz_backend.throttles import BrandGenThrottle
from content.views import deduct_credits
class GenerateBrandView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [BrandGenThrottle]

    def post(self, request, *args, **kwargs):
        name = request.data.get('name')
        niche = request.data.get('niche')
        vibe = request.data.get('vibe')
        description = request.data.get('description', '')
        tone = request.data.get('tone', 'Corporate')
        
        # Pull dynamic owner contact & regulatory coordinates
        user_phone = getattr(request.user, 'phone', '') or ''
        user_email = getattr(request.user, 'email', '') or ''
        user_location = getattr(request.user, 'location', '') or 'Lagos, Nigeria'
        
        phone = request.data.get('phone') or user_phone
        email = request.data.get('email') or user_email
        address = request.data.get('address') or user_location
        cac_number = request.data.get('cac_number') or request.data.get('cacNumber') or ''
        tin_number = request.data.get('tin_number') or request.data.get('tinNumber') or ''
        smedan_number = request.data.get('smedan_number') or request.data.get('smedanNumber') or ''
        corporate_entity_type = request.data.get('corporate_entity_type') or request.data.get('corporateEntityType') or 'Registered Business Name (BN)'

        from smartbiz_backend import gemini_utils
        
        prompt = f"""
        Generate a comprehensive, premium, bank- and industry-ready corporate brand identity for:
        Company Legal Name: {name}
        Operating Niche/Sector: {niche}
        Entity Type: {corporate_entity_type}
        Brand Vibe: {vibe}
        Description: {description}
        Tone: {tone}
        Registered Location: {address}
        Owner Contact: {phone}

        This brand identity must meet the institutional standards expected by commercial banks (for corporate account opening & credit assessment), industry procurement departments, and federal funding facilities (BOI, SMEDAN, Tony Elumelu Foundation).

        Return a JSON object matching this structure EXACTLY:
        {{
            "businessName": "{name}",
            "niche": "{niche}",
            "vibe": "{vibe}",
            "colors": {{ "primary": "hex", "secondary": "hex", "accent": "hex" }},
            "fonts": {{ "primary": "FontName", "secondary": "FontName" }},
            "taglines": ["tagline1", "tagline2", "tagline3"],
            "socialBio": "...",
            "whatsappGreeting": "...",
            "elevatorPitch": "...",
            "brandVoice": "...",
            "targetAudience": "...",
            "mission": "Formal institutional mission statement outlining purpose, value creation, and quality commitment for corporate banks and grant boards.",
            "vision": "5-year growth, market leadership and regional expansion vision statement.",
            "coreValues": ["Integrity", "Excellence", "Customer Commitment", "Accountability"],
            "executiveBio": "A 2-3 sentence executive profile of the principal promoter / founder highlighting domain leadership and operational discipline.",
            "slaPolicy": "Formal Service Level Agreement stating response time (within 2 hours), delivery benchmarks (24-48 hrs), and service fulfillment standards.",
            "ndprCompliance": "Official data privacy, confidential transaction processing, and NDPR/customer data protection commitment statement.",
            "corporateEntityType": "{corporate_entity_type}",
            "logoPrompt": "Detailed prompt for an AI icon generator based on this corporate brand",
            "policies": {{ "payment": "...", "delivery": "...", "refund": "..." }},
            "trustBadgeText": "...",
            "whatsappContent": {{
                "stickerIdeas": ["idea1", "idea2"],
                "statusTemplates": ["template1", "template2"],
                "quickReplies": [{{ "shortcut": "/p", "message": "..." }}],
                "broadcastMessages": [{{ "title": "Promo", "message": "..." }}]
            }},
            "packaging": {{ "thankYouNote": "...", "unboxingTip": "..." }}
        }}
        Use professional Nigerian corporate business terminology. For fonts, use established Google Fonts like Montserrat, Outfit, Playfair Display, Inter, etc.
        """
        try:
            brand_identity = gemini_utils.generate_json_content(prompt)
            if not brand_identity or "error" in brand_identity:
                raise Exception(brand_identity.get("error", "AI generation returned error status"))
            
            # Merge with default fallback dictionary to ensure all keys are populated
            brand_identity = self.ensure_complete_brand(brand_identity, name, niche, vibe, tone, phone, email, address, cac_number, tin_number, smedan_number, corporate_entity_type)
            deduct_credits(request.user, 'brand_gen')
            return Response(brand_identity)
        except Exception as e:
            # Dynamic high-fidelity fallback engine
            print(f"Brand Generation fallback triggered: {e}")
            brand_identity = self.ensure_complete_brand({}, name, niche, vibe, tone, phone, email, address, cac_number, tin_number, smedan_number, corporate_entity_type)
            try:
                deduct_credits(request.user, 'brand_gen')
            except Exception:
                pass
            return Response(brand_identity)

    def ensure_complete_brand(self, ai_data, name, niche, vibe, tone, phone='', email='', address='', cac_number='', tin_number='', smedan_number='', corporate_entity_type='Registered Business Name (BN)'):
        if not isinstance(ai_data, dict):
            ai_data = {}
            
        niche_lower = niche.lower()
        if 'fashion' in niche_lower or 'beauty' in niche_lower or 'boutique' in niche_lower:
            primary = "#ec4899"
            secondary = "#10b981"
            accent = "#f59e0b"
            fonts = { "primary": "Playfair Display", "secondary": "Montserrat" }
        elif 'tech' in niche_lower or 'digital' in niche_lower or 'software' in niche_lower or 'repair' in niche_lower:
            primary = "#3b82f6"
            secondary = "#6366f1"
            accent = "#10b981"
            fonts = { "primary": "Outfit", "secondary": "Inter" }
        elif 'food' in niche_lower or 'catering' in niche_lower or 'restaurant' in niche_lower or 'bakery' in niche_lower:
            primary = "#ea580c"
            secondary = "#eab308"
            accent = "#15803d"
            fonts = { "primary": "Outfit", "secondary": "Plus Jakarta Sans" }
        else:
            primary = "#10b981"
            secondary = "#0f766e"
            accent = "#f59e0b"
            fonts = { "primary": "Montserrat", "secondary": "Inter" }

        taglines = [
            f"Premium {niche} tailored for your lifestyle.",
            f"The ultimate destination for quality {niche} in Nigeria.",
            f"Redefining value, elegance, and trust in {niche}."
        ]
        
        if tone.lower() == 'street':
            voice = "Friendly, authentic, street-smart Naija vibe."
            greeting = f"How far! Welcome to {name}. Wetin you de look for today?"
            elevator = f"We represent the best of {niche} straight from our heart to your doorstep. No stories, just pure quality."
            payment_policy = "Payment validates order. Pay online via Paystack or direct transfer to start delivery."
        else:
            voice = "Professional, authoritative, customer-focused."
            greeting = f"Welcome to {name}! How can we assist you with our {niche} products today?"
            elevator = f"At {name}, we are dedicated to providing premium quality {niche} services that meet international standards and satisfy your local needs."
            payment_policy = "Full payment is required upon placing the order. We accept transfers, cards, and secure online pay."

        default_mission = f"To provide standard-defining {niche} solutions with uncompromising integrity, superior craftsmanship, and customer value across Nigerian markets."
        default_vision = f"To be the foremost and most trusted {niche} commercial brand in West Africa, scaling sustainable SME operations and driving digital trade."
        default_bio = f"{name} was established to bridge critical quality and reliability gaps in the {niche} sector. Directed by visionary entrepreneurship with a deep commitment to regulatory compliance and client satisfaction."
        default_sla = "Official SLA: Inquiries acknowledged within 120 minutes. Order verification and dispatch within 24 hours. Formal dispute escalation resolved within 24 business hours."
        default_ndpr = "NDPR Privacy Statement: Customer personal records, transaction communications, and payment confirmations are processed strictly under Nigerian Data Protection Regulation (NDPR) confidentiality standards."

        # Helper to get value with fallback case-insensitively
        def get_val(keys, default):
            for k in keys:
                if k in ai_data and ai_data[k]:
                    return ai_data[k]
            return default

        # Colors merge
        ai_colors = ai_data.get("colors", {})
        if not isinstance(ai_colors, dict):
            ai_colors = {}
        colors = {
            "primary": ai_colors.get("primary") or ai_colors.get("primaryColor") or primary,
            "secondary": ai_colors.get("secondary") or ai_colors.get("secondaryColor") or secondary,
            "accent": ai_colors.get("accent") or ai_colors.get("accentColor") or accent
        }

        # Fonts merge
        ai_fonts = ai_data.get("fonts", {})
        if not isinstance(ai_fonts, dict):
            ai_fonts = {}
        fonts_dict = {
            "primary": ai_fonts.get("primary") or fonts["primary"],
            "secondary": ai_fonts.get("secondary") or fonts["secondary"]
        }

        # Taglines merge
        ai_taglines = ai_data.get("taglines")
        if not ai_taglines or not isinstance(ai_taglines, list):
            ai_taglines = taglines

        # Policies merge
        ai_policies = ai_data.get("policies", {})
        if not isinstance(ai_policies, dict):
            ai_policies = {}
        policies = {
            "payment": ai_policies.get("payment") or payment_policy,
            "delivery": ai_policies.get("delivery") or "Nationwide delivery. Orders within Lagos arrive in 24-48 hours. Interstate orders take 3-5 working days.",
            "refund": ai_policies.get("refund") or "Returns allowed within 3 days if items are unworn and in original condition. Exchange or store credit only."
        }

        # WhatsApp content merge
        ai_wa = ai_data.get("whatsappContent", {}) or ai_data.get("whatsapp_content", {})
        if not isinstance(ai_wa, dict):
            ai_wa = {}
        whatsapp_content = {
            "stickerIdeas": ai_wa.get("stickerIdeas") or ai_wa.get("sticker_ideas") or ["Thank you for your patronage!", "Order in progress...", "Customer is King 👑", "Paystack Secured"],
            "statusTemplates": ai_wa.get("statusTemplates") or ai_wa.get("status_templates") or [
                f"New Arrivals alert! 🚨 Check out our latest {niche} collection. Link in bio!",
                f"Wetin you de wait for? Order your favorite {niche} items today! 🛍️"
            ],
            "quickReplies": ai_wa.get("quickReplies") or ai_wa.get("quick_replies") or [
                { "shortcut": "/p", "message": "Here is our pricing structure and current catalog. Let us know what you want to order!" },
                { "shortcut": "/d", "message": "Delivery takes 24 hours in Lagos (N2,500) and 3-5 days outside Lagos (N4,500)." }
            ],
            "broadcastMessages": ai_wa.get("broadcastMessages") or ai_wa.get("broadcast_messages") or [
                { "title": "Mid-Month Promo", "message": f"Hello! Get 10% off all {niche} orders this week. Use code BIZ10!" }
            ]
        }

        # Packaging merge
        ai_pkg = ai_data.get("packaging", {})
        if not isinstance(ai_pkg, dict):
            ai_pkg = {}
        packaging = {
            "thankYouNote": ai_pkg.get("thankYouNote") or ai_pkg.get("thank_you_note") or f"Thank you for supporting {name}! We hope your order brings a smile to your face. Share the love on social media!",
            "unboxingTip": ai_pkg.get("unboxingTip") or ai_pkg.get("unboxing_tip") or "Unbox gently and tag us on Instagram for a chance to win a free gift voucher next month!"
        }

        return {
            "businessName": get_val(["businessName", "business_name"], name),
            "niche": get_val(["niche"], niche),
            "vibe": get_val(["vibe"], vibe),
            "colors": colors,
            "fonts": fonts_dict,
            "taglines": ai_taglines,
            "socialBio": get_val(["socialBio", "social_bio"], f"Official page of {name}. Offering premium {niche} with a {vibe} experience. Nationwide delivery from {address}. 🇳🇬"),
            "whatsappGreeting": get_val(["whatsappGreeting", "whatsapp_greeting"], greeting),
            "elevatorPitch": get_val(["elevatorPitch", "elevator_pitch"], elevator),
            "brandVoice": get_val(["brandVoice", "brand_voice"], voice),
            "targetAudience": get_val(["targetAudience", "target_audience"], f"Smart Nigerian consumers seeking premium {niche} products with exceptional customer care."),
            "mission": get_val(["mission"], default_mission),
            "vision": get_val(["vision"], default_vision),
            "coreValues": ai_data.get("coreValues") or ai_data.get("core_values") or ["Uncompromising Quality", "Institutional Integrity", "Customer Centricity", "Operational Transparency"],
            "executiveBio": get_val(["executiveBio", "executive_bio"], default_bio),
            "slaPolicy": get_val(["slaPolicy", "sla_policy"], default_sla),
            "ndprCompliance": get_val(["ndprCompliance", "ndpr_compliance"], default_ndpr),
            "corporateEntityType": corporate_entity_type or get_val(["corporateEntityType", "corporate_entity_type"], "Registered Business Name (BN)"),
            "phone": phone or get_val(["phone"], ""),
            "email": email or get_val(["email"], ""),
            "address": address or get_val(["address", "location"], "Lagos, Nigeria"),
            "location": address or get_val(["address", "location"], "Lagos, Nigeria"),
            "cacNumber": cac_number or get_val(["cacNumber", "cac_number"], ""),
            "tinNumber": tin_number or get_val(["tinNumber", "tin_number"], ""),
            "smedanNumber": smedan_number or get_val(["smedanNumber", "smedan_number"], ""),
            "logoPrompt": get_val(["logoPrompt", "logo_prompt"], f"A minimalist, professional corporate logo icon for {name} ({niche}), vector style, clean institutional badge"),
            "policies": policies,
            "trustBadgeText": get_val(["trustBadgeText", "trust_badge_text"], "Verified MSME Credentials & Guaranteed Quality"),
            "whatsappContent": whatsapp_content,
            "packaging": packaging
        }

class GenerateBrandLogoView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        prompt = request.data.get('prompt')
        
        from smartbiz_backend import gemini_utils
        try:
            import random
            archetypes = [
                "geometric clean vector style icon",
                "flat modern abstract shape graphic",
                "clean corporate emblem badge design",
                "minimalist monogram symbol",
                "sleek line art circular logo",
                "negative-space iconic graphic style",
                "creative modern border badge style"
            ]
            style = random.choice(archetypes)
            prompt_svg = f"Create a simple, modern SVG logo for {prompt}. Style: {style}. Use clean shapes. Return ONLY the SVG code. No markdown or explanation. Ensure standard namespaces are included."
            svg_code = gemini_utils.generate_text_content(prompt_svg)
            
            # Clean conversational wrappers and extract strictly the SVG node
            svg_code = svg_code.replace("```xml", "").replace("```svg", "").replace("```", "").strip()
            svg_code = svg_code.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&quot;", '"')
            
            match = re.search(r'<svg.*?</svg>', svg_code, re.DOTALL | re.IGNORECASE)
            if match:
                svg_code = match.group(0)
            else:
                if '<svg' in svg_code.lower():
                    start_idx = svg_code.lower().find('<svg')
                    svg_code = svg_code[start_idx:]
                    if not svg_code.lower().endswith('</svg>'):
                        svg_code += '</svg>'
                else:
                    raise ValueError("No valid SVG content generated")
            
            import base64
            encoded_svg = base64.b64encode(svg_code.encode('utf-8')).decode('utf-8')
            return Response({'logoUrl': f"data:image/svg+xml;base64,{encoded_svg}"})
            
        except Exception as e:
            # Fallback to a generated SVG placeholder
            width = 400
            height = 400
            svg_content = f'''
            <svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f0f0f0"/>
                <circle cx="{width/2}" cy="{height/2}" r="150" fill="#4ade80" />
                <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">Logo for {prompt[:20]}...</text>
                <text x="50%" y="90%" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">AI Generation Unavailable</text>
            </svg>
            '''
            import base64
            encoded_svg = base64.b64encode(svg_content.encode('utf-8')).decode('utf-8')
            return Response({'logoUrl': f"data:image/svg+xml;base64,{encoded_svg}"})

class BrandListCreate(generics.ListCreateAPIView):
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BrandIdentity.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class BrandDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BrandIdentity.objects.filter(user=self.request.user)

class PublicStorefrontView(views.APIView):
    permission_classes = [] # Public view

    def get(self, request, slug):
        try:
            brand = BrandIdentity.objects.get(slug=slug)
            serializer = BrandSerializer(brand)
            return Response(serializer.data)
        except BrandIdentity.DoesNotExist:
            return Response({'error': 'Store not found'}, status=404)
