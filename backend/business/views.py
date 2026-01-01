from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils

class GenerateBusinessPlanView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get('businessName')
        niche = request.data.get('niche')
        details = request.data.get('details')

        prompt = f"""Write a mini business plan for "{name}" in the "{niche}" industry. 
        Specific details: {details}.
        Return JSON with keys: executiveSummary, marketAnalysis, marketingStrategy, financialProjection, operationalPlan.
        """
        
        try:
            plan = gemini_utils.generate_json_content(prompt)
            return Response(plan)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class FindGrantsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        profile = request.data.get('profile', {})
        
        prompt = f"""Find funding opportunities for this business profile:
        Name: {profile.get('businessName')}
        Location: {profile.get('location')}
        Industry: {profile.get('industry')}
        Years Operational: {profile.get('yearsInBusiness')}
        Owner Gender: {profile.get('gender')}
        
        Provide 3-4 relevant grants, loans, or accelerators.
        Return JSON list of objects with keys: id, name, provider, amountRange, matchScore, matchReason, requirements, deadline, type.
        """
        
        try:
            grants = gemini_utils.generate_json_content(prompt)
            return Response(grants)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class AnalyzeBusinessNameView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        name = request.data.get('name')
        
        prompt = f"""Analyze the business name "{name}" for registration with the Corporate Affairs Commission (CAC) in Nigeria.
        Return JSON with keys: probability (High/Medium/Low), reason, alternatives (array of strings).
        """
        
        try:
            analysis = gemini_utils.generate_json_content(prompt)
            return Response(analysis)
        except Exception as e:
             return Response({'error': str(e)}, status=500)

class AnalyzeNeighborhoodView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        location = request.data.get('location')
        
        prompt = f"""Analyze the neighborhood: "{location}" in Nigeria from a business perspective.
        Return JSON with keys: security, traffic, power, overallVibe.
        """
        
        try:
            analysis = gemini_utils.generate_json_content(prompt)
            return Response(analysis)
        except Exception as e:
            return Response({
                "security": "Moderate",
                "traffic": "Busy",
                "power": "Variable",
                "overallVibe": "Commercial"
            })

class SearchLocalVendorsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get('query')
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        # Text-based search simulation using Gemini's knowledge
        prompt = f"""Find 5 "{query}" in Nigeria (near coords {lat}, {lng} if possible, or general Lagos/Abuja key areas if not specific).
        Return JSON list of objects with keys: title, uri (fake or real if known), source (WEB/MAPS).
        """
        
        try:
            places = gemini_utils.generate_json_content(prompt)
            # Wrap to match frontend interface
            return Response({
                "text": f"Here are some {query} vendors:",
                "places": places
            })
        except Exception as e:
            # Fallback
            return Response({
                "text": "Found some vendors nearby.",
                "places": [
                    {"title": f"{query} Hub", "uri": "", "source": "MAPS"},
                    {"title": f"{query} Market", "uri": "", "source": "MAPS"}
                ]
            })
