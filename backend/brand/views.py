import re
from rest_framework import generics, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BrandIdentity
from .serializers import BrandSerializer
class GenerateBrandView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        name = request.data.get('name')
        niche = request.data.get('niche')
        vibe = request.data.get('vibe')
        description = request.data.get('description', '')
        tone = request.data.get('tone', 'Corporate')

        from smartbiz_backend import gemini_utils
        
        prompt = f"""
        Generate a comprehensive brand identity for:
        Name: {name}
        Niche: {niche}
        Vibe: {vibe}
        Description: {description}
        Tone: {tone} (This affects policies and brand voice)

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
            "logoPrompt": "Detailed prompt for an AI icon generator based on this brand",
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
        Use Nigerian business context and Pidgin if tone is 'Street'. For fonts, use major Google Fonts like Inter, Playfair Display, Montserrat, etc.
        """
        
        try:
            brand_identity = gemini_utils.generate_json_content(prompt)
            return Response(brand_identity)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GenerateBrandLogoView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        prompt = request.data.get('prompt')
        
        # Use gemini_utils or gemini_proxy if updated.
        # Assuming we need to implement image gen logic.
        # For this demo/plan, we'll try to use gemini_utils if it supported image gen or just proxy logic.
        
        from smartbiz_backend import gemini_utils
        try:
            # Try to use Gemini
            model = gemini_utils.get_model('gemini-1.5-flash')
            # For real image gen, we'd use Vertex or a specific Image model if enabled, 
            # but standard Gemini can generate SVG code or detailed prompts.
            # We'll return an SVG data URI as a real "generated" asset for now.
            
            prompt_svg = f"Create a simple, modern SVG logo for {prompt}. Use clean shapes. Return ONLY the SVG code. No markdown or explanation."
            svg_code = gemini_utils.generate_text_content(prompt_svg)
            
            # Clean markdown if present
            svg_code = re.sub(r'```(svg)?\s*', '', svg_code)
            svg_code = re.sub(r'```\s*', '', svg_code).strip()
            
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
