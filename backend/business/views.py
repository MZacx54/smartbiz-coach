from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils
from content.views import deduct_credits

class GenerateBusinessPlanView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get('businessName')
        niche = request.data.get('niche')
        details = request.data.get('details')
        capital = request.data.get('startupCapital', 'Not Specified')
        employees = request.data.get('employeesCount', 'Not Specified')
        revenue_model = request.data.get('revenueModel', 'Not Specified')

        from brand.models import BrandIdentity
        # Retrieve BrandIdentity to enrich prompt with user's specific brand settings
        brand_context = ""
        try:
            brand = BrandIdentity.objects.get(user=request.user)
            brand_context = f"""
            Brand Profile Context:
            - Target Audience: {brand.target_audience}
            - Brand Voice/Vibe: {brand.brand_voice} (Style: {brand.vibe})
            - Elevator Pitch: {brand.elevator_pitch}
            - Business Bio: {brand.social_bio}
            - Taglines: {", ".join(brand.taglines) if isinstance(brand.taglines, list) else ""}
            """
        except Exception:
            brand_context = ""

        prompt = f"""Write a comprehensive, investor-ready, bank-quality business plan for "{name}" in the "{niche}" industry.
        {brand_context}
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
            
            # Handle list outputs or non-dict structures safely
            if not isinstance(plan, dict):
                raise Exception("Generative model failed to output a valid structured JSON dictionary.")

            if 'error' in plan:
                raise Exception(plan.get('error'))

            # Normalize keys to camelCase to ensure consistency for the frontend component
            normalized_plan = {}
            
            normalized_plan['executiveSummary'] = (
                plan.get('executiveSummary') or 
                plan.get('executive_summary') or 
                plan.get('ExecutiveSummary') or 
                plan.get('executiveSummaryText') or 
                ""
            )
            
            normalized_plan['marketAnalysis'] = (
                plan.get('marketAnalysis') or 
                plan.get('market_analysis') or 
                plan.get('MarketAnalysis') or 
                ""
            )
            
            normalized_plan['marketingStrategy'] = (
                plan.get('marketingStrategy') or 
                plan.get('marketing_strategy') or 
                plan.get('MarketingStrategy') or 
                ""
            )
            
            normalized_plan['financialProjection'] = (
                plan.get('financialProjection') or 
                plan.get('financial_projection') or 
                plan.get('FinancialProjection') or 
                plan.get('financialProjections') or 
                plan.get('financial_projections') or 
                ""
            )
            
            normalized_plan['operationalPlan'] = (
                plan.get('operationalPlan') or 
                plan.get('operational_plan') or 
                plan.get('OperationalPlan') or 
                ""
            )

            # Ensure we actually have content in the plan
            if not normalized_plan['executiveSummary'] and not normalized_plan['marketAnalysis']:
                raise Exception("The generated business plan content was empty or incomplete. Please try again.")

            # Credits are handled on success by the frontend to prevent charging for failed requests.
            return Response(normalized_plan)
        except Exception as e:
            return Response({'error': f"Business Plan Generation Failed: {str(e)}"}, status=500)

class FindGrantsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        profile = request.data.get('profile', {}) or request.data
        
        prompt = f"""Find highly relevant, real active or recurring funding opportunities (grants, low-interest government loans, equity, accelerators) for this Nigerian business profile:
        Name: {profile.get('businessName')}
        Location: {profile.get('location')} State, Nigeria
        Industry: {profile.get('industry')}
        Years Operational: {profile.get('yearsInBusiness')}
        Owner Gender: {profile.get('gender')}
        CAC Registration Status: {profile.get('cacRegistration', 'Unregistered')}
        Has Corporate Bank Account: {profile.get('hasCorporateAccount', 'No')}
        Target Funding Amount: {profile.get('targetAmount', 'Under ₦1M')}
        
        You MUST focus on real active or recurring opportunities in the Nigerian ecosystem, matching them intelligently:
        - FGN Presidential Grants & Loans Scheme (₦50k grants for nano businesses, ₦1M single-digit interest loans for MSMEs)
        - Lagos State Employment Trust Fund (LSETF) Loans (Highly active for Lagos-based businesses; requires CAC/Tax ID)
        - Tony Elumelu Foundation (TEF) Programme (₦2M / $5,000 equity-free seed capital; targets startups under 3 years)
        - SMEDAN Matching Fund Loan (Requires SMEDAN registration number, low-interest microfinance partner loans)
        - Bank of Industry (BOI) Micro-business and SME funds (Requires CAC, corporate accounts, and tax clearance)
        - NIRSAL MFB AGSMEIS / TCF Loans (Agriculture and SME sectors; requires certification or training)
        - Development Bank of Nigeria (DBN) SME loans (disbursed through commercial banks)
        - CcHUB / Lagos Innovates / Growth Lab Accelerators (targets tech, services, creative sectors)
        
        Provide 3-4 highly tailored opportunities. Evaluate their eligibility criteria strictly: if the user lacks a CAC registration or corporate bank account, explain this in 'matchReason' and 'eligibility_checklist' (indicating they must get registered first to qualify for programs requiring registration).
        
        Return a JSON list of objects matching this structure EXACTLY:
        [
            {{
                "id": "unique-id-1",
                "name": "Name of the Program",
                "provider": "Provider Name (e.g., Bank of Industry)",
                "amountRange": "e.g., ₦1,000,000 - ₦5,000,000",
                "matchScore": 85,
                "matchReason": "Detailed reason why this business matches based on location, CAC status, bank account, and amount range.",
                "requirements": ["Requirement 1 (e.g., CAC Certificate)", "Requirement 2", "Requirement 3"],
                "deadline": "e.g., October 30, 2026 or Rolling",
                "type": "GRANT or LOAN or EQUITY",
                "eligibility_checklist": ["CAC Registered (Yes/No status match)", "Corporate Account status match", "Sector Match"],
                "application_steps": ["Step 1: Get CAC certificate", "Step 2: Submit application on portal"],
                "is_currently_open": true
            }}
        ]
        """
        
        try:
            grants = gemini_utils.generate_json_content(prompt)
            # Credits are handled on success by the frontend to prevent charging for failed requests.
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
            if not health or 'error' in health or 'score' not in health:
                raise Exception("Invalid Gemini health score structure")
            deduct_credits(request.user, 'health_score')
            return Response(health)
        except Exception as e:
            # High-fidelity Local Analytical Engine Fallback
            score = 70
            strengths = []
            weaknesses = []
            recommendations = []
            
            # 1. Analyze Compliance
            cac_registered = compliance.get('cac_status') == 'REGISTERED' or compliance.get('business_reg_completed', False)
            has_tin = compliance.get('has_tin', False) or compliance.get('tin_obtained_completed', False)
            has_bank = compliance.get('has_corporate_account', False) or compliance.get('bank_account_completed', False)
            
            comp_score = 0
            if cac_registered:
                comp_score += 40
                strengths.append("Registered with Corporate Affairs Commission (CAC).")
            else:
                weaknesses.append("Business name not registered with CAC.")
                recommendations.append({
                    "title": "Register your Business Name with CAC",
                    "priority": "HIGH",
                    "impact": "Unlocks corporate banking, government grants, and pilot partnerships.",
                    "tool": "Compliance Portal"
                })
                
            if has_tin:
                comp_score += 30
                strengths.append("Tax Identification Number (TIN) obtained.")
            else:
                weaknesses.append("No Tax Identification Number (TIN) registered.")
                recommendations.append({
                    "title": "Apply for a Business TIN",
                    "priority": "MEDIUM",
                    "impact": "Required for formal contracts and corporate transactions.",
                    "tool": "Compliance Portal"
                })
                
            if has_bank:
                comp_score += 30
                strengths.append("Corporate business bank account active.")
            else:
                weaknesses.append("Operating without a corporate bank account.")
                recommendations.append({
                    "title": "Open a Corporate Bank Account",
                    "priority": "HIGH",
                    "impact": "Ensures separation of personal and business funds.",
                    "tool": "Compliance Portal"
                })
            
            # Adjust score based on compliance
            score += int((comp_score - 50) * 0.15)
            
            # 2. Analyze Stock/Inventory
            total_stock_value = sum(float(item.get('price', 0)) * float(item.get('quantity', 0)) for item in stock)
            
            if total_stock_value > 0:
                strengths.append(f"Healthy active inventory value of ₦{total_stock_value:,.2f}.")
                score += 5
                
                # Check for low stock items
                low_stock_items = [item.get('name') for item in stock if float(item.get('quantity', 0)) < 5]
                if low_stock_items:
                    weaknesses.append(f"{len(low_stock_items)} inventory items running low on stock.")
                    recommendations.append({
                        "title": f"Restock items: {', '.join(low_stock_items[:2])}",
                        "priority": "MEDIUM",
                        "impact": "Prevents stockouts and lost customer sales.",
                        "tool": "Inventory Catalog"
                    })
            else:
                weaknesses.append("No stock or inventory records found in catalog.")
                recommendations.append({
                    "title": "Add products to your Inventory Catalog",
                    "priority": "HIGH",
                    "impact": "Required to start generating invoices and tracking sales.",
                    "tool": "Inventory Catalog"
                })
                score -= 10
                
            # 3. Analyze Invoices & Debts
            total_debt_value = sum(float(d.get('amount', 0)) for d in debts if d.get('status') != 'PAID')
            
            if total_debt_value > 0:
                weaknesses.append(f"Outstanding customer debt of ₦{total_debt_value:,.2f} pending recovery.")
                recommendations.append({
                    "title": "Send debt reminders to customers",
                    "priority": "HIGH",
                    "impact": f"Recovers ₦{total_debt_value:,.2f} cash flow into the business.",
                    "tool": "Gbege Book (Debtors)"
                })
                score -= min(15, int(total_debt_value / 50000) + 2)
            elif len(debts) > 0:
                strengths.append("All customer debts settled; perfect record.")
                score += 10
                
            # Keep score within 15 - 95 bounds for fallbacks
            final_score = max(15, min(95, score))
            
            fallback_response = {
                "score": final_score,
                "metrics": {
                    "financial": max(20, min(98, score + 5)),
                    "compliance": max(10, min(100, int(comp_score))),
                    "branding": 75 if business_profile.get('brandVoice') else 40,
                    "operations": 85 if total_stock_value > 0 else 30
                },
                "strengths": strengths[:4],
                "weaknesses": weaknesses[:4],
                "recommendations": recommendations[:3]
            }
            
            return Response(fallback_response)

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
