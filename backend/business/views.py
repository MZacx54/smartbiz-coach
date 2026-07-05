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
        capital = request.data.get('startupCapital', 'Not Specified')
        employees = request.data.get('employeesCount', 'Not Specified')
        revenue_model = request.data.get('revenueModel', 'Not Specified')

        prompt = f"""Write a comprehensive, investor-ready, bank-quality business plan for "{name}" in the "{niche}" industry.
        Specific details: {details}
        Startup Capital: {capital}
        Number of Employees: {employees}
        Revenue Model/Source: {revenue_model}
        
        Ensure you focus heavily on the Nigerian economic climate (inflation, power challenges, target audience purchasing power, and local marketing strategies like WhatsApp marketing/referrals).
        
        Return a JSON object matching this structure EXACTLY:
        {{
            "executiveSummary": "A detailed executive summary covering the business description, value proposition, and vision.",
            "marketAnalysis": "A deep analysis of the target market in Nigeria, competitor landscape, and estimation of TAM, SAM, SOM.",
            "marketingStrategy": "Actionable marketing strategy focusing on Nigerian channels (WhatsApp, Instagram, local markets, referrals).",
            "financialProjection": "A 12-month financial projection in Nigerian Naira (NGN), showing startup costs, estimated monthly revenue, gross margin, and break-even point.",
            "operationalPlan": "Details on day-to-day operations, sourcing suppliers/materials, logistics, power/generator alternatives, and staffing."
        }}
        """
        
        try:
            plan = gemini_utils.generate_json_content(prompt)
            # Deduct credits
            deduct_credits(request.user, 'business_plan')
            return Response(plan)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class FindGrantsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        profile = request.data.get('profile', {}) or request.data
        
        prompt = f"""Find highly relevant funding opportunities (grants, low-interest government loans, accelerators) for this Nigerian business profile:
        Name: {profile.get('businessName')}
        Location: {profile.get('location')}
        Industry: {profile.get('industry')}
        Years Operational: {profile.get('yearsInBusiness')}
        Owner Gender: {profile.get('gender')}
        
        You MUST focus on real active or recurring opportunities in the Nigerian ecosystem, such as:
        - Tony Elumelu Foundation (TEF) Entrepreneurship Programme
        - Bank of Industry (BOI) SME Loans
        - Lagos State Employment Trust Fund (LSETF)
        - CBN Creative Industry Financing Initiative (CIFI)
        - SMEDAN Grants/Loans
        - USAID/DFID Nigerian Agri-Grants
        - Youth Entrepreneurship Support (YES) Programme
        
        Provide 3-4 highly tailored opportunities.
        Return a JSON list of objects matching this structure EXACTLY:
        [
            {{
                "id": "unique-id-1",
                "name": "Name of the Program",
                "provider": "Provider Name (e.g., Bank of Industry)",
                "amountRange": "e.g., ₦5,000,000 - ₦10,000,000",
                "matchScore": 85,
                "matchReason": "Why this business matches (mention location/industry specificity).",
                "requirements": ["Requirement 1", "Requirement 2", "Requirement 3"],
                "deadline": "e.g., October 30, 2026 or Rolling",
                "type": "GRANT or LOAN or EQUITY",
                "eligibility_checklist": ["Checklist item 1", "Checklist item 2"],
                "application_steps": ["Step 1 description", "Step 2 description"],
                "is_currently_open": true
            }}
        ]
        """
        
        try:
            grants = gemini_utils.generate_json_content(prompt)
            # Deduct credits
            deduct_credits(request.user, 'grant_search')
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
        
        prompt = f"""Find 5 "{query}" in Nigeria (near coords {lat}, {lng} if possible, or general Lagos/Abuja key areas if not specific).
        Return JSON list of objects with keys: title, uri (fake or real if known), source (WEB/MAPS).
        """
        
        try:
            places = gemini_utils.generate_json_content(prompt)
            return Response({
                "text": f"Here are some {query} vendors:",
                "places": places
            })
        except Exception as e:
            return Response({
                "text": "Found some vendors nearby.",
                "places": [
                    {"title": f"{query} Hub", "uri": "", "source": "MAPS"},
                    {"title": f"{query} Market", "uri": "", "source": "MAPS"}
                ]
            })

class BusinessHealthScoreView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        business_profile = request.data.get('businessProfile', {})
        debts = request.data.get('debts', [])
        stock = request.data.get('stock', [])
        invoices = request.data.get('invoices', [])
        compliance = request.data.get('compliance', {})

        prompt = f"""Analyze this Nigerian business's data and calculate a business health score out of 100.
        Business Profile: {business_profile}
        Debts Owed to Business: {debts}
        Current Inventory Stock: {stock}
        Invoices Sent: {invoices}
        Compliance Checklist Status: {compliance}

        Analyze financial health (e.g. debt ratio to stock value, invoicing volume), operational readiness (inventory levels), brand readiness, and regulatory compliance.
        
        Return JSON structure EXACTLY:
        {{
            "score": 75,
            "metrics": {{
                "financial": 80,
                "compliance": 60,
                "branding": 70,
                "operations": 90
            }},
            "strengths": ["Strength 1", "Strength 2"],
            "weaknesses": ["Weakness 1", "Weakness 2"],
            "recommendations": [
                {{
                    "title": "Actionable title (e.g. Send WhatsApp Debt Reminders)",
                    "priority": "HIGH or MEDIUM or LOW",
                    "impact": "e.g., Will recover ₦20,000 in cash flow.",
                    "tool": "Gbege Book (Debtors)"
                }}
            ]
        }}
        """

        try:
            health = gemini_utils.generate_json_content(prompt)
            # Deduct credits
            deduct_credits(request.user, 'health_score')
            return Response(health)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class PricingAssistantView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_name = request.data.get('productName')
        cost_price = request.data.get('costPrice')
        competitor_price = request.data.get('competitorPrice', 'Not Specified')
        target_margin = request.data.get('targetMargin', 30)

        prompt = f"""Help a Nigerian business owner determine the optimal selling price for their product.
        Product Name: {product_name}
        Cost Price (to produce or buy wholesale): ₦{cost_price}
        Competitor Price: ₦{competitor_price}
        Target Profit Margin: {target_margin}%

        Calculate suggested prices based on margin, competitive pricing, and psychological pricing (e.g., ending in 900 or 950).
        Return JSON structure EXACTLY:
        {{
            "costPrice": {cost_price},
            "suggestedPrices": {{
                "marginBased": 0,
                "competitive": 0,
                "psychological": 0
            }},
            "marginPercentages": {{
                "marginBased": 0,
                "competitive": 0,
                "psychological": 0
            }},
            "strategyExplanation": "Detailed explanation of why these prices make sense in Nigeria, considering purchasing power and margin safety.",
            "tips": ["Tip 1", "Tip 2"],
            "whatsappTemplate": "Copy-pasteable WhatsApp catalog template: *Product*: {product_name}\\n*Price*: ₦..."
        }}
        """

        try:
            pricing = gemini_utils.generate_json_content(prompt)
            # Deduct credits
            deduct_credits(request.user, 'pricing_assistant')
            return Response(pricing)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
