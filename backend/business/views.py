import re
from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils
from smartbiz_backend.throttles import BusinessPlanThrottle
from billing.utils import reserve_ai_credits, refund_ai_credits
from billing.catalog import AI_CREDIT_COSTS

class GenerateBusinessPlanView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [BusinessPlanThrottle]

    def post(self, request):
        name = request.data.get('businessName') or request.data.get('business_name') or request.data.get('name') or getattr(request.user, 'business_name', '') or 'SmartBiz Enterprise'
        niche = request.data.get('niche') or 'Commercial MSME'
        details = request.data.get('details') or ''
        capital = request.data.get('startupCapital') or request.data.get('capital') or '₦1,000,000 - ₦5,000,000'
        employees = request.data.get('employeesCount') or request.data.get('employees') or '1-3 employees'
        revenue_model = request.data.get('revenueModel') or request.data.get('revenue_model') or 'Direct retail & service sales'
        location = request.data.get('location') or getattr(request.user, 'location', 'Lagos, Nigeria')

        cost = AI_CREDIT_COSTS.get('business_plan', 15)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, f'AI Business Plan ({str(name)[:40]})')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credits).", "credits": remaining}, status=402)

        from brand.models import BrandIdentity
        # Retrieve BrandIdentity to enrich prompt with user's specific brand settings
        brand_context = ""
        try:
            brand = BrandIdentity.objects.get(user=request.user)
            brand_context = f"""
            Brand Profile Context:
            - Business Location: {location}
            - Target Audience: {brand.target_audience}
            - Brand Voice/Vibe: {brand.brand_voice} (Style: {brand.vibe})
            - Elevator Pitch: {brand.elevator_pitch}
            - Business Bio: {brand.social_bio}
            - Taglines: {", ".join(brand.taglines) if isinstance(brand.taglines, list) else ""}
            """
        except Exception:
            brand_context = f"Business Location: {location}"

        prompt = f"""You are a senior investment banker and top-tier management consultant specializing in Nigerian MSMEs, bank lending (Bank of Industry, Commercial Banks), and competitive African grant programs (iDICE, Tony Elumelu Foundation, LSETF, SMEDAN).

Write an EXHAUSTIVE, HIGHLY PROFESSIONAL, INVESTOR-GRADE, BANK-READY Business Plan for "{name}" operating in the "{niche}" industry in {location}, Nigeria.

Enterprise Parameters:
- Business Name: {name}
- Industry / Niche: {niche}
- Operating Base: {location}
- Capital Base / Funding Target: {capital}
- Staffing Structure: {employees}
- Core Revenue Model: {revenue_model}
- Specific Business Focus & Unique Edge: {details}
{brand_context}

CRITICAL QUALITY STANDARDS:
1. Every section MUST be exhaustive, multi-paragraph, deeply analytical, and formatted with structured numerical sub-headings (e.g. 1.1, 1.2, 1.3).
2. Do NOT write brief summaries. Provide rich, detailed explanations, Nigerian market statistics, realistic monetary figures in Nigerian Naira (₦ / NGN), and concrete operational procedures.
3. Incorporate real Nigerian operating dynamics: inflation shielding, FX buffer strategies, solar/inverter power continuity, WhatsApp community social commerce, and CAC/TIN regulatory compliance.
4. For all tables, strictly output valid standard Markdown tables with pipes and hyphens (| Column 1 | Column 2 | ... |). Never mix bullet points into table headers.
5. STRICT ANTI-BREVITY DIRECTIVE: NEVER write phrases like '(Table omitted for brevity)' or '(Omitted for brevity)' and NEVER summarize tables into short bullet notes. You MUST write out:
   - All rows of Section 5.1 (CAPEX Table)
   - All rows of Section 5.2 (3-Year Income Statement Table)
   - The COMPLETE 12-Month Projected Cashflow Trajectory table in Section 5.3 containing all 12 rows (Month 01 to Month 12) plus the Full Year 1 Total row!
   - All rows of Section 5.4 (Key Credit Ratios Table)
   - In Section 6 (SWOT), write comprehensive, multi-sentence analytical paragraphs for 6.1 (Strengths), 6.2 (Weaknesses), 6.3 (Opportunities), and 6.4 (Threats) on separate lines, followed by the complete 6.5 Strategic Action Matrix table.
   - In Section 8, write the full 8.1 Proposed Facility Table and 8.2 DSCR Stress Test Table.
   - In Section 9, write out the complete formal legal declaration text under CAMA 2020.

Return a valid JSON object matching this structure EXACTLY:
{{{{
    "executiveSummary": "Comprehensive Executive Summary containing:
1.1 Enterprise Overview & Problem Statement
1.2 The Innovation & Unique Value Proposition (UVP)
1.3 Target Market & Demographic Potential
1.4 Revenue Model & Commercial Engine
1.5 Capital Requirement & Fund Allocation
1.6 3-Year Strategic Growth & Financial Summary",
    "marketAnalysis": "Exhaustive Market Analysis containing:
2.1 Nigerian Industry Overview & Growth Drivers
2.2 Target Customer Personas & Demand Patterns (B2C & B2B)
2.3 Market Sizing in Naira (TAM, SAM, SOM estimates)
2.4 Competitive Advantage & Competitor Comparison Matrix
2.5 Barriers to Entry & Strategic Defensive Moats",
    "marketingStrategy": "Actionable Marketing & Sales Strategy containing:
3.1 Omnichannel Customer Acquisition (WhatsApp Community Commerce, TikTok/Instagram Reels, Micro-influencers, Local B2B)
3.2 CAC vs. LTV Economics & Pricing Strategy
3.3 Sales Pipeline & Daily Conversion SOPs
3.4 Customer Retention, Loyalty Loops & Referral Incentives",
    "operationalPlan": "Complete Operational & Execution Plan containing:
4.1 Daily Operating Workflow & Standard Operating Procedures (SOPs)
4.2 Supply Chain Resilience & Direct Wholesale Sourcing (FX Hedging)
4.3 Logistics, Dispatch Delivery & Interstate Waybill Partnerships
4.4 Power & Infrastructure Resilience (Solar Inverter + Hybrid Fuel Setup for 100% Uptime)
4.5 Technology Stack & Automated Digital Operations
4.6 Staffing Plan, Key Roles & Governance",
    "financialProjection": "Detailed 3-Year Financial Model (All figures in NGN) containing:
5.1 Startup Capital Expenditure (CAPEX) & Initial Working Capital Table (Markdown table with Item | Allocation (NGN) | Percentage | Strategic Purpose)
5.2 3-Year Projected Income Statement Table (Markdown table with Metric | Year 1 (NGN) | Year 2 (NGN) | Year 3 (NGN) | 3-Yr CAGR)
5.3 12-Month Projected Cashflow Trajectory Table (Markdown table with Month | Inflow (NGN) | Outflow (NGN) | Net Cashflow (NGN) | Cumulative Cash (NGN))
5.4 Key Credit, Solvency & Investment Ratios Table (Markdown table with Credit Metric | Benchmark | Year 1 Projection | Year 2 Projection | Underwriting Assessment)
5.5 Break-Even Analysis & Capital Payback Horizon for Grant Providers & Lenders",
    "swotAnalysis": "Comprehensive 4-Quadrant SWOT Matrix containing:
6.1 In-Depth Strengths (Internal Core Competencies)
6.2 Weaknesses & Internal Mitigation Measures
6.3 Market Opportunities & Growth Vectors
6.4 External Macroeconomic Threats & Defensive Strategy
6.5 Strategic Action Matrix (Markdown Table with Strategy Type | Strategic Initiative | Execution Horizon | Expected Business Impact)",
    "riskMitigation": "Robust Risk Mitigation & Institutional Compliance containing:
7.1 Inflation & Currency Devaluation Shielding Protocol
7.2 Regulatory & Tax Compliance Roadmap (CAC, TIN, NRS / State IRS, NTA 2025 Small-Company Provisions)
7.3 Supply Disruption & Critical Inventory Buffer Strategy
7.4 Business Continuity & Emergency Protocols
7.5 Grant & Institutional Funding Alignment (iDICE, BOI, LSETF, TEF readiness)",
    "underwritingSummary": "Institutional Debt Underwriting & Credit Readiness containing:
8.1 Proposed Facility Structure & Terms Table (Markdown table with Facility Parameter | Proposed Term | Underwriting Justification)
8.2 Debt Service Coverage Ratio (DSCR) Stress Test Table (Markdown table with Scenario | Projected EBITDA | Annual Debt Service | DSCR Ratio | Underwriter Status)
8.3 Collateral, Stock Hypothecation & Promoter Security Structure
8.4 Socio-Economic Multiplier & Direct Employment Generation (Direct/Indirect jobs created)",
    "promoterDeclaration": "Promoter Statutory Attestation & Execution containing:
9.1 Statutory Declaration of Veracity and Solvency under CAMA 2020
9.2 Legal & Tax Compliance Attestation (NTA 2025 / CITA Small-Company Provisions, JTB/NRS TIN, SMEDAN SUIN)
9.3 Corporate Seal & Execution Sign-Off Block"
}}}}

CRITICAL: The output MUST be a valid JSON dictionary. Inside the text values, NEVER use unescaped double quotes ("). If you need quotes inside the text, use single quotes (') instead.
"""
        
        try:
            plan = gemini_utils.generate_json_content(
                prompt,
                user=request.user,
                feature='business_plan',
                max_output_tokens=16384,
                timeout=75,
            )
            if isinstance(plan, list) and plan and isinstance(plan[0], dict):
                plan = plan[0]
            if isinstance(plan, dict) and 'error' not in plan:
                normalized_plan = {
                    'executiveSummary': plan.get('executiveSummary') or plan.get('executive_summary') or plan.get('ExecutiveSummary') or "",
                    'marketAnalysis': plan.get('marketAnalysis') or plan.get('market_analysis') or plan.get('MarketAnalysis') or "",
                    'marketingStrategy': plan.get('marketingStrategy') or plan.get('marketing_strategy') or plan.get('MarketingStrategy') or "",
                    'operationalPlan': plan.get('operationalPlan') or plan.get('operational_plan') or plan.get('OperationalPlan') or "",
                    'financialProjection': plan.get('financialProjection') or plan.get('financial_projection') or plan.get('FinancialProjection') or plan.get('financialProjections') or "",
                    'swotAnalysis': plan.get('swotAnalysis') or plan.get('swot_analysis') or plan.get('SwotAnalysis') or "",
                    'riskMitigation': plan.get('riskMitigation') or plan.get('risk_mitigation') or plan.get('RiskMitigation') or "",
                    'underwritingSummary': plan.get('underwritingSummary') or plan.get('underwriting_summary') or plan.get('UnderwritingSummary') or "",
                    'promoterDeclaration': plan.get('promoterDeclaration') or plan.get('promoter_declaration') or plan.get('PromoterDeclaration') or ""
                }
                if len(normalized_plan['executiveSummary']) > 120 and len(normalized_plan['marketAnalysis']) > 120:
                    if not normalized_plan['promoterDeclaration']:
                        normalized_plan['promoterDeclaration'] = (
                            f"Promoter Declaration ({name}): Confirm business registration, annual Nigeria Revenue Service (NRS) filings, "
                            f"and verify NTA 2025 small-company eligibility with a certified tax adviser. Not legal or tax advice."
                        )
                    normalized_plan['credits'] = remaining
                    normalized_plan['credits_deducted_server'] = True
                    return Response(normalized_plan)
        except Exception as e:
            print(f"Business plan generation error: {e}")

        remaining = refund_ai_credits(request.user, reserved, 'Business Plan AI Unavailable')
        return Response({
            "error": "Business Plan AI generator is temporarily unavailable. Your BizCredits have been refunded—please retry in a moment.",
            "credits": remaining
        }, status=503)

class FindGrantsView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        profile = request.data.get('profile', {}) or request.data
        if not isinstance(profile, dict):
            profile = {}

        biz_name = profile.get('businessName') or getattr(request.user, 'business_name', '') or 'SME Business'
        location = profile.get('location') or 'Lagos'
        industry = profile.get('industry') or 'General Enterprise'
        cac_status = profile.get('cacRegistration', 'Unregistered')
        has_corp_account = profile.get('hasCorporateAccount', 'No')

        prompt = f"""Find highly relevant, real active or recurring funding opportunities (grants, low-interest government loans, equity, accelerators) for this Nigerian business profile:
        Name: {biz_name}
        Location: {location} State, Nigeria
        Industry: {industry}
        Years Operational: {profile.get('yearsInBusiness', '0-1 years')}
        Owner Gender: {profile.get('gender', 'Entrepreneur')}
        CAC Registration Status: {cac_status}
        Has Corporate Bank Account: {has_corp_account}
        Target Funding Amount: {profile.get('targetAmount', 'Under ₦1M')}
        
        You MUST focus on real active or recurring opportunities in the Nigerian ecosystem:
        - FGN Presidential Grants & Loans Scheme (₦50k grants for nano businesses, ₦1M single-digit interest loans for MSMEs)
        - Lagos State Employment Trust Fund (LSETF) Loans (Highly active for Lagos-based businesses; requires CAC/Tax ID)
        - Tony Elumelu Foundation (TEF) Programme (₦2M / $5,000 equity-free seed capital; targets startups under 3 years)
        - SMEDAN Matching Fund Loan (Requires SMEDAN registration number, low-interest microfinance partner loans)
        - Bank of Industry (BOI) Micro-business and SME funds (Requires CAC, corporate accounts, and tax clearance)
        - NIRSAL MFB AGSMEIS / TCF Loans (Agriculture and SME sectors; requires certification or training)
        
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
                "portal_url": "https://official-application-website.gov.ng",
                "is_currently_open": true
            }}
        ]
        """
        
        cost = AI_CREDIT_COSTS.get('grant_search', 3)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, 'AI Grant & Funding Matcher')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credits).", "credits": remaining}, status=402)

        try:
            grants = gemini_utils.generate_json_content(prompt, user=request.user, feature='grant_search')
            if isinstance(grants, list) and len(grants) > 0:
                return Response(grants)
            elif isinstance(grants, dict) and 'grants' in grants and isinstance(grants['grants'], list):
                return Response(grants['grants'])
        except Exception as e:
            pass

        refund_ai_credits(request.user, reserved, 'Grant Search Directory Fallback')

        # Dynamic fallback matching user profile
        is_cac = 'registered' in cac_status.lower() or 'yes' in cac_status.lower()
        is_lagos = 'lagos' in location.lower()
        
        fallback_list = [
            {
                "id": "fgn-presidential-grant",
                "name": "FGN Presidential Grants & MSME Loan Scheme",
                "provider": "Federal Government of Nigeria / Bank of Industry",
                "amountRange": "₦50,000 - ₦1,000,000",
                "matchScore": 95 if not is_cac else 90,
                "matchReason": f"Direct federal funding grant targeted at {industry} MSMEs in {location}. Nano businesses qualify without strict CAC requirements.",
                "requirements": ["NIN Number", "BVN Verification", "Valid Phone Number", "Proof of Business Location"],
                "deadline": "Rolling Batch Intake",
                "type": "GRANT",
                "eligibility_checklist": ["NIN & BVN Linked", "Active Business Operation", "Locational Verification"],
                "application_steps": [
                    "Visit the official FGN Presidential Intervention Portal (fedgrantandloan.gov.ng)",
                    "Select Grant Application for Nano Businesses or MSME Loan",
                    "Enter your NIN, BVN, and business location details",
                    "Submit verification documents for disbursement"
                ],
                "portal_url": "https://grant.fedgrantandloan.gov.ng/",
                "is_currently_open": True
            },
            {
                "id": "tef-entrepreneurship-fund",
                "name": "Tony Elumelu Foundation (TEF) Seed Capital",
                "provider": "Tony Elumelu Foundation",
                "amountRange": "₦2,500,000 ($5,000 USD)",
                "matchScore": 90,
                "matchReason": f"Equity-free seed capital and 12-week business mentorship designed for early-stage entrepreneurs in {industry}.",
                "requirements": ["Business under 3 years old", "Open to African entrepreneurs", "Completed TEF portal business training"],
                "deadline": "Annual Window (Jan 1 – March 31, Rolling Cohorts)",
                "type": "GRANT",
                "eligibility_checklist": ["Early Stage Business (< 3 yrs)", "Completed Online Training Module", "Business Pitch Submission"],
                "application_steps": [
                    "Create account on TEFConnect.com",
                    "Complete the online business management training course",
                    "Submit your business plan and 1-minute video pitch",
                    "Receive ₦2.5M seed capital upon qualification"
                ],
                "portal_url": "https://www.tefconnect.com",
                "is_currently_open": True
            },
            {
                "id": "smedan-matching-fund",
                "name": "SMEDAN Micro-Enterprise Matching Fund Loan",
                "provider": "SMEDAN / Microfinance Partner Banks",
                "amountRange": "₦250,000 - ₦2,000,000",
                "matchScore": 88 if is_cac else 75,
                "matchReason": f"Single-digit interest loan scheme (9% per annum) specifically matching registered MSMEs in {industry}.",
                "requirements": ["SMEDAN Registration Number (SUIN)", "Valid ID (NIN/Voters Card)", "Pass microfinance appraisal"],
                "deadline": "Open All Year",
                "type": "LOAN",
                "eligibility_checklist": ["SMEDAN Registered (SUIN)", "Viable Cashflow", "Microfinance Account"],
                "application_steps": [
                    "Register your business on the official SMEDAN portal (portal.smedan.gov.ng) to get your SUIN code",
                    "Apply through participating microfinance banks with your SUIN",
                    "Undergo business site inspection and credit scoring",
                    "Loan disbursed at 9% single-digit annual interest rate"
                ],
                "portal_url": "https://portal.smedan.gov.ng/signup",
                "is_currently_open": True
            }
        ]

        if is_lagos:
            fallback_list.append({
                "id": "lsetf-msme-loan",
                "name": "Lagos State Employment Trust Fund (LSETF) MSME Loan",
                "provider": "Lagos State Government",
                "amountRange": "₦500,000 - ₦5,000,000",
                "matchScore": 92,
                "matchReason": f"Specialized low-interest loan dedicated to growing Lagos-based enterprises in {industry}.",
                "requirements": ["Lagos Resident Card (LASSRA)", "CAC Certificate", "Tax Identification Number (TIN)"],
                "deadline": "Quarterly Batches",
                "type": "LOAN",
                "eligibility_checklist": ["Lagos Business Location", "LASSRA Registration", "CAC Certificate"],
                "application_steps": [
                    "Register on lsetf.ng portal",
                    "Upload CAC certificate, LASSRA ID, and tax clearance",
                    "Attend LSETF interview/pitch session",
                    "Access low-interest funding (5% interest per year)"
                ],
                "portal_url": "https://lsetf.ng",
                "is_currently_open": True
            })

        deduct_credits(request.user, 'grant_search')
        return Response(fallback_list)

class AnalyzeBusinessNameView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        cost = AI_CREDIT_COSTS.get('name_check', 2)
        allowed, remaining_credits, reserved = reserve_ai_credits(request.user, cost, 'AI Business Name Check')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credits).", "credits": remaining_credits}, status=402)

        name = request.data.get('business_name') or request.data.get('name') or request.data.get('businessName') or 'SmartBiz Enterprise'
        
        prompt = f"""Analyze the business name "{name}" for formal corporate registration guidance under CAMA 2020 in Nigeria (advisory only — verify live availability on the official CAC portal).
        Evaluate if it contains prohibited words (e.g., Federal, National, Chartered) or generic conflict risk.
        Return JSON structure EXACTLY:
        {{
            "probability": "High or Medium or Low",
            "reason": "Detailed legal and availability rationale for the CAC registry in Nigeria.",
            "alternatives": ["{name} Hub", "{name} Enterprise", "{name} Commercial Ventures"]
        }}
        """
        
        try:
            analysis = gemini_utils.generate_json_content(prompt, user=request.user, feature='name_check')
            if isinstance(analysis, dict) and 'probability' in analysis and 'reason' in analysis and 'error' not in analysis:
                return Response({
                    "probability": analysis.get('probability', 'High'),
                    "reason": analysis.get('reason', 'The name meets general CAC registration standards.'),
                    "alternatives": analysis.get('alternatives', [f"{name} Enterprise", f"{name} Global Ventures", f"{name} Commercial Hub"]),
                    "credits": remaining_credits,
                    "credits_deducted_server": True,
                })
        except Exception as e:
            print(f"AnalyzeBusinessNameView AI error: {e}")

        remaining_credits = refund_ai_credits(request.user, reserved, 'Name Check Local Fallback')

        # CAMA 2020 Heuristic Fallback Engine (refunds AI credits cleanly)
        forbidden_words = ['federal', 'national', 'state', 'chartered', 'police', 'military', 'ministry', 'government', 'commission', 'cooperative']
        has_forbidden = any(w in name.lower() for w in forbidden_words)
        
        if has_forbidden:
            prob = "Low"
            reason = f"'{name}' contains restricted statutory terms under Section 852 of CAMA 2020 that require special ministerial or institutional consent before reservation."
        elif len(name.strip().split()) == 1 and len(name.strip()) < 5:
            prob = "Medium"
            reason = f"'{name}' is short and single-worded, which carries a higher likelihood of existing trademark or business name conflict on the CAC portal. Adding a distinctive suffix is strongly advised."
        else:
            prob = "High"
            reason = f"'{name}' exhibits strong trade distinctiveness and complies with CAC Name Reservation criteria without conflicting with prohibited government designations."

        clean_base = name.strip().title()
        return Response({
            "probability": prob,
            "reason": reason,
            "alternatives": [
                f"{clean_base} Enterprise",
                f"{clean_base} Commercial Ventures",
                f"{clean_base} Global Hub"
            ]
        })

class AnalyzeNeighborhoodView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        location = request.data.get('location')
        if not location:
            return Response({"error": "Location is required."}, status=400)

        cost = AI_CREDIT_COSTS.get('neighborhood_analysis', 2)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, 'AI Neighborhood Analysis')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credits).", "credits": remaining}, status=402)

        prompt = f"""Analyze the neighborhood: "{location}" in Nigeria from a business perspective.
        Return JSON with keys: security, traffic, power, overallVibe.
        """
        
        try:
            analysis = gemini_utils.generate_json_content(prompt, user=request.user, feature='neighborhood_analysis')
            if isinstance(analysis, dict) and 'error' not in analysis:
                analysis['credits'] = remaining
                analysis['credits_deducted_server'] = True
                return Response(analysis)
        except Exception:
            pass
        remaining = refund_ai_credits(request.user, reserved, 'Neighborhood Analysis Unavailable')
        return Response({"error": "Neighborhood AI unavailable right now. Credits refunded.", "credits": remaining}, status=503)

class SearchLocalVendorsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get('query')
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        if not query:
            return Response({"error": "Search query is required."}, status=400)

        cost = AI_CREDIT_COSTS.get('vendor_search', 2)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, 'AI Local Vendor Search')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credits).", "credits": remaining}, status=402)

        prompt = f"""Suggest 5 well-known "{query}" hubs/markets in Nigeria (near coords {lat}, {lng} if provided, or major Nigerian commercial hubs).
        Never invent or fabricate fake URLs; leave uri empty ("") unless it is an exact, well-known official domain.
        Return JSON list of objects with keys: title, uri, source (WEB/MAPS).
        """
        
        try:
            places = gemini_utils.generate_json_content(prompt, user=request.user, feature='vendor_search')
            if isinstance(places, list):
                return Response({
                    "text": f"Suggested {query} markets & hubs:",
                    "places": places,
                    "credits": remaining,
                    "credits_deducted_server": True,
                })
        except Exception:
            pass
        remaining = refund_ai_credits(request.user, reserved, 'Local Vendor Search Unavailable')
        return Response({"error": "Vendor search AI unavailable. Credits refunded.", "credits": remaining}, status=503)

class BusinessHealthScoreView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        business_profile = request.data.get('businessProfile', {})
        debts = request.data.get('debts', [])
        stock = request.data.get('stock', [])
        invoices = request.data.get('invoices', [])
        compliance = request.data.get('compliance', {})

        cost = AI_CREDIT_COSTS.get('health_score', 5)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, 'AI Business Health Score')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credits).", "credits": remaining}, status=402)

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
            health = gemini_utils.generate_json_content(prompt, user=request.user, feature='health_score')
            if not health or 'error' in health or 'score' not in health:
                raise Exception("Invalid Gemini health score structure")
            health['credits'] = remaining
            health['credits_deducted_server'] = True
            return Response(health)
        except Exception as e:
            refund_ai_credits(request.user, reserved, 'Business Health Local Engine')
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

        try:
            cost_val = max(0.0, float(re.sub(r'[^\d.]', '', str(cost_price)) or 0))
        except (ValueError, TypeError):
            cost_val = 0.0
        if cost_val <= 0:
            return Response({"error": "Please provide a valid wholesale cost price greater than ₦0."}, status=400)

        try:
            raw_margin = float(target_margin)
        except (ValueError, TypeError):
            raw_margin = 30.0
        # True Gross Profit Margin (P - C)/P must stay strictly < 100%; clamp safely to [5%, 85%]
        target_margin_pct = max(5.0, min(85.0, raw_margin))

        cost_credits = AI_CREDIT_COSTS.get('pricing_assistant', 2)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost_credits, 'AI Pricing & Margin Assistant')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost_credits} credits).", "credits": remaining}, status=402)

        prompt = f"""Help a Nigerian business owner determine the optimal selling price for their product.
        Product Name: {product_name}
        Wholesale Cost Price: ₦{cost_val:,.2f}
        Competitor Price: {competitor_price}
        Target Gross Profit Margin: {target_margin_pct:.1f}% (using P = Cost / (1 - Margin))

        Calculate suggested prices based on gross margin, competitive pricing, and psychological pricing (without ever dropping at or below cost).
        Return JSON structure EXACTLY:
        {{
            "costPrice": {cost_val},
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
            pricing = gemini_utils.generate_json_content(prompt, user=request.user, feature='pricing_assistant')
            if isinstance(pricing, dict) and 'suggestedPrices' in pricing and 'marginPercentages' in pricing and 'error' not in pricing:
                pricing['credits'] = remaining
                pricing['credits_deducted_server'] = True
                return Response(pricing)
        except Exception as e:
            print(f"PricingAssistantView AI error: {e}")

        # Refund credits cleanly if AI failed, then compute deterministic gross margin pricing
        remaining = refund_ai_credits(request.user, reserved, 'Pricing Math Fallback')

        raw_margin_price = cost_val / (1.0 - (target_margin_pct / 100.0))
        if raw_margin_price < 200:
            margin_price = round(raw_margin_price, 2)
        elif raw_margin_price < 2000:
            margin_price = round(raw_margin_price, -1)
        else:
            margin_price = round(raw_margin_price, -2)
        margin_price = max(margin_price, round(cost_val * 1.05, 2))

        if margin_price >= 500 and margin_price % 100 == 0 and (margin_price - 50) > cost_val:
            psych_price = margin_price - 50
        else:
            psych_price = margin_price

        cleaned_comp = re.sub(r'[^\d.]', '', str(competitor_price or ''))
        try:
            comp_raw = float(cleaned_comp) if cleaned_comp else (margin_price * 0.98)
        except Exception:
            comp_raw = margin_price * 0.98
        comp_price = round(comp_raw, 2) if comp_raw < 200 else (round(comp_raw, -1) if comp_raw < 2000 else round(comp_raw, -2))

        fallback_pricing = {
            "costPrice": cost_val,
            "suggestedPrices": {
                "marginBased": margin_price,
                "competitive": comp_price,
                "psychological": psych_price
            },
            "marginPercentages": {
                "marginBased": round(((margin_price - cost_val) / max(0.01, margin_price)) * 100, 1),
                "competitive": round(((comp_price - cost_val) / max(0.01, comp_price)) * 100, 1),
                "psychological": round(((psych_price - cost_val) / max(0.01, psych_price)) * 100, 1)
            },
            "strategyExplanation": f"For {product_name or 'this product'}, a target gross margin of {target_margin_pct:.0f}% puts your safe selling price at ₦{margin_price:,.0f}. Psychological pricing at ₦{psych_price:,.0f} preserves profit while reducing buyer friction.",
            "tips": [
                "Bundle with a fast-moving companion item to boost average order value.",
                "Factor delivery and packaging expenses separately before offering discounts.",
                "Test anchored pricing on WhatsApp Status broadcasts before repricing your full catalog."
            ],
            "whatsappTemplate": f"✨ *{product_name or 'Special Item'}*\n💰 Price: ₦{psych_price:,.0f}\n⚡ Available for instant dispatch\n📲 Reply 'ORDER' to buy now!",
            "credits": remaining,
        }
        return Response(fallback_pricing)
