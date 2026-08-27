from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from smartbiz_backend import gemini_utils
from content.views import deduct_credits

class GenerateBusinessPlanView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get('businessName') or request.data.get('business_name') or request.data.get('name') or getattr(request.user, 'business_name', '') or 'SmartBiz Enterprise'
        niche = request.data.get('niche') or 'Commercial MSME'
        details = request.data.get('details') or ''
        capital = request.data.get('startupCapital') or request.data.get('capital') or '₦1,000,000 - ₦5,000,000'
        employees = request.data.get('employeesCount') or request.data.get('employees') or '1-3 employees'
        revenue_model = request.data.get('revenueModel') or request.data.get('revenue_model') or 'Direct retail & service sales'
        location = request.data.get('location') or getattr(request.user, 'location', 'Lagos, Nigeria')

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

Return a valid JSON object matching this structure EXACTLY:
{{
    "executiveSummary": "Comprehensive Executive Summary containing:\\n1.1 Enterprise Overview & Problem Statement\\n1.2 The Innovation & Unique Value Proposition (UVP)\\n1.3 Target Market & Demographic Potential\\n1.4 Revenue Model & Commercial Engine\\n1.5 Capital Requirement & Fund Allocation\\n1.6 3-Year Strategic Growth & Financial Summary",
    "marketAnalysis": "Exhaustive Market Analysis containing:\\n2.1 Nigerian Industry Overview & Growth Drivers\\n2.2 Target Customer Personas & Demand Patterns (B2C & B2B)\\n2.3 Market Sizing in Naira (TAM, SAM, SOM estimates)\\n2.4 Competitive Advantage & Competitor Comparison Matrix\\n2.5 Barriers to Entry & Strategic Defensive Moats",
    "marketingStrategy": "Actionable Marketing & Sales Strategy containing:\\n3.1 Omnichannel Customer Acquisition (WhatsApp Community Commerce, TikTok/Instagram Reels, Micro-influencers, Local B2B)\\n3.2 CAC vs. LTV Economics & Pricing Strategy\\n3.3 Sales Pipeline & Daily Conversion SOPs\\n3.4 Customer Retention, Loyalty Loops & Referral Incentives",
    "operationalPlan": "Complete Operational & Execution Plan containing:\\n4.1 Daily Operating Workflow & Standard Operating Procedures (SOPs)\\n4.2 Supply Chain Resilience & Direct Wholesale Sourcing (FX Hedging)\\n4.3 Logistics, Dispatch Delivery & Interstate Waybill Partnerships\\n4.4 Power & Infrastructure Resilience (Solar Inverter + Hybrid Fuel Setup for 100% Uptime)\\n4.5 Technology Stack & Automated Digital Operations\\n4.6 Staffing Plan, Key Roles & Governance",
    "financialProjection": "Detailed 3-Year Financial Model (All figures in NGN) containing:\\n5.1 Startup Capital Expenditure (CAPEX) & Initial Working Capital Table\\n5.2 3-Year Projected Income Statement (Year 1, Year 2, Year 3: Revenue, COGS, Gross Profit, OPEX, EBITDA, Net Profit)\\n5.3 Monthly Cash Flow & Working Capital Runway (Year 1 Month-by-Month)\\n5.4 Break-Even Analysis & Margin Sensitivities\\n5.5 Return on Investment (ROI) & Payback Horizon for Grant Providers & Investors",
    "swotAnalysis": "Comprehensive 4-Quadrant SWOT Matrix containing:\\n6.1 In-Depth Strengths (Internal Core Competencies)\\n6.2 Weaknesses & Internal Mitigation Measures\\n6.3 Market Opportunities & Growth Vectors\\n6.4 External Macroeconomic Threats & Defensive Strategy\\n6.5 Strategic Action Matrix (Markdown Table)",
    "riskMitigation": "Robust Risk Mitigation & Institutional Compliance containing:\\n7.1 Inflation & Currency Devaluation Shielding Protocol\\n7.2 Regulatory & Tax Compliance Roadmap (CAC, TIN, FIRS, State IRS)\\n7.3 Supply Disruption & Critical Inventory Buffer Strategy\\n7.4 Business Continuity & Emergency Protocols\\n7.5 Grant & Institutional Funding Alignment (iDICE, BOI, LSETF, TEF readiness)"
}}

CRITICAL: The output MUST be a valid JSON dictionary. Inside the text values, NEVER use unescaped double quotes (\"). If you need quotes inside the text, use single quotes (') instead.
"""
        
        try:
            plan = gemini_utils.generate_json_content(prompt)
            
            # Handle list outputs or non-dict structures safely
            if isinstance(plan, dict) and 'error' not in plan:
                normalized_plan = {
                    'executiveSummary': plan.get('executiveSummary') or plan.get('executive_summary') or plan.get('ExecutiveSummary') or "",
                    'marketAnalysis': plan.get('marketAnalysis') or plan.get('market_analysis') or plan.get('MarketAnalysis') or "",
                    'marketingStrategy': plan.get('marketingStrategy') or plan.get('marketing_strategy') or plan.get('MarketingStrategy') or "",
                    'financialProjection': plan.get('financialProjection') or plan.get('financial_projection') or plan.get('FinancialProjection') or plan.get('financialProjections') or "",
                    'operationalPlan': plan.get('operationalPlan') or plan.get('operational_plan') or plan.get('OperationalPlan') or "",
                    'swotAnalysis': plan.get('swotAnalysis') or plan.get('swot_analysis') or plan.get('SwotAnalysis') or "",
                    'riskMitigation': plan.get('riskMitigation') or plan.get('risk_mitigation') or plan.get('RiskMitigation') or ""
                }
                if len(normalized_plan['executiveSummary']) > 150 and len(normalized_plan['marketAnalysis']) > 150:
                    return Response(normalized_plan)
        except Exception as e:
            print(f"Business plan generation error: {e}")

        # Exhaustive investor-grade fallback plan tailored with deep Nigerian economic modeling
        fallback_plan = {
            "executiveSummary": f"""1.1 ENTERPRISE OVERVIEW & PROBLEM STATEMENT
{name} is a high-growth commercial enterprise established to capture strong, unmet market demand within Nigeria's burgeoning {niche} sector. In today's volatile economic landscape, consumers and commercial buyers face persistent pain points: unpredictable product quality, opaque pricing structures, unreliable fulfillment timelines, and poor customer service. {name} directly solves these vulnerabilities by institutionalizing standardized procurement, transparent tiered pricing, rapid digital fulfillment, and dedicated relationship management.

1.2 THE INNOVATION & UNIQUE VALUE PROPOSITION (UVP)
Operating from {location}, {name} combines direct-to-consumer digital channels with robust local fulfillment networks. Unlike traditional informal market traders, {name} delivers:
- Verified product authenticity and batch-level quality control.
- Seamless WhatsApp-first social commerce with instant catalog browsing, real-time inventory visibility, and digital invoicing.
- High-efficiency dispatch and waybill fulfillment with same-day local delivery and 48-hour nationwide transit.
- Flexible payment reconciliation via instant bank transfer and verified escrow gateways.

1.3 TARGET MARKET & DEMOGRAPHIC POTENTIAL
The enterprise targets two primary revenue cohorts:
1. Urban Middle-Class Consumers & Professionals: Seeking premium, reliable goods with zero hassle.
2. B2B Commercial Buyers & Retail Resellers: Requiring steady wholesale replenishment with guaranteed margins and predictable delivery schedules.

1.4 BUSINESS MODEL & COMMERCIAL REVENUE DRIVERS
{name} operates a multi-stream revenue model centered around {revenue_model}. Core monetization channels include:
- Direct Retail Sales: High-margin retail commerce driven by social proof and digital marketing.
- Wholesale & Bulk Distribution: Volume-discounted orders providing predictable baseline cash flow.
- Value-Added Service & Custom Packaging: Premium customized orders generating incremental gross margins.

1.5 CAPITAL REQUIREMENT & RESOURCE ALLOCATION
To scale operations, expand inventory reserves, and solidify market leadership, {name} is deployed with an initial capitalization base of {capital}. Capital is allocated rigorously across four strategic pillars:
- 45% Working Capital & Inventory Stocking: Sourcing high-demand inventory directly from tier-1 manufacturers to secure wholesale volume discounts.
- 25% Logistics, Power & Operational Infrastructure: Installing a hybrid solar inverter system (to eliminate diesel generator downtime) and establishing dispatch logistics hubs.
- 20% Omnichannel Marketing & Customer Acquisition: Scaling hyper-targeted social media campaigns, influencer partnerships, and localized activations.
- 10% Regulatory Compliance, Quality Assurance & Emergency Buffer: Maintaining CAC, TIN, and operational contingency reserves.

1.6 3-YEAR STRATEGIC GROWTH & FINANCIAL SUMMARY
Over the next 36 months, {name} is projected to achieve:
- Year 1 Gross Revenue: ₦18,500,000 (Net Margin: 28%)
- Year 2 Gross Revenue: ₦42,000,000 (Net Margin: 33%)
- Year 3 Gross Revenue: ₦85,000,000 (Net Margin: 36%)
- Break-even milestone achieved by Month 4 of operations, with full capital payback anticipated within 14 months.""",

            "marketAnalysis": f"""2.1 NIGERIAN SECTOR OVERVIEW & MACRO DYNAMICS
Nigeria's {niche} industry is undergoing a structural transition driven by rapid urbanization, an expanding tech-savvy youth demographic, and widespread smartphone penetration exceeding 85% in major urban commercial centers. Despite macroeconomic headwinds such as inflation and foreign exchange volatility, consumer spending on essential and lifestyle goods remains resilient, with buyers increasingly shifting toward trusted, digitally enabled merchants who guarantee quality and prompt delivery.

2.2 TARGET CUSTOMER PERSONAS & DEMOGRAPHICS
{name} has segmented its market into three distinct buyer personas:
1. 'The Digital Professional' (Ages 24–45, 60% of volume): Urban salaried professionals and tech workers who value convenience, speed, and trusted digital communication. They prioritize effortless ordering via WhatsApp and fast door-to-door delivery.
2. 'The Value-Seeking Family Shopper' (Ages 30–55, 25% of volume): Household decision-makers focused on durability, transparent pricing, and bulk discount incentives.
3. 'The SME / Corporate Reseller' (Commercial accounts, 15% of volume): Small boutique owners and business operators who require reliable wholesale supply, consistent quality, and formal tax/invoicing documentation.

2.3 MARKET SIZING (TAM, SAM, SOM) IN NIGERIAN NAIRA
- Total Addressable Market (TAM): Estimated at ₦450 Billion nationally across Nigeria's broader {niche} ecosystem.
- Serviceable Available Market (SAM): Estimated at ₦45 Billion, encompassing accessible urban markets in Lagos, Abuja, Port Harcourt, Kano, and Ibadan with active logistics networks.
- Serviceable Obtainable Market (SOM): Targeted at ₦120 Million over the next 3 years by capturing a dominant 0.25% market share in primary operating zones through superior branding and customer retention.

2.4 COMPETITIVE LANDSCAPE & ADVANTAGE MATRIX
The local market is currently characterized by three tiers of competition:
- Informal Open-Market Traders: Low prices but plagued by inconsistent quality, zero after-sales support, and manual, friction-heavy payment methods.
- Large Retail Conglomerates: Established brand recognition but hindered by high overheads, slow customer response times, and premium price markups.
- {name}'s Competitive Edge: Combines the agility and competitive pricing of independent traders with the institutional reliability, standardized packaging, digital speed, and professional customer care of major corporations.

2.5 ENTRY BARRIERS & DEFENSIVE MOATS
- Direct Supplier Relationships: Securing preferential wholesale pricing directly from factory importers and primary producers.
- Proprietary Customer Community: Building an engaged WhatsApp and social media audience with high switching costs driven by personalized service and loyalty rewards.
- Agile Digital Infrastructure: Utilizing automated order capture, debtor tracking, and inventory sync to operate at 40% lower overhead than brick-and-mortar competitors.""",

            "marketingStrategy": f"""3.1 OMNICHANNEL CUSTOMER ACQUISITION STRATEGY
{name} executes a multi-pronged digital and localized marketing framework designed to maximize organic reach and maintain low customer acquisition costs:
1. WhatsApp Community Commerce: Daily curated status updates, flash sales, private VIP broadcast groups, and 1-on-1 personalized follow-ups to turn social contacts into repeat buyers.
2. High-Converting Short-Form Video (TikTok & Instagram Reels): Product unboxings, customer testimonials, behind-the-scenes quality checks, and educational lifestyle content designed for viral organic discovery.
3. Strategic Influencer & Micro-Creator Endorsements: Collaborating with trusted niche creators in {location} to drive authentic social proof and instant credibility.
4. Local B2B Outreach & Commercial Activations: Direct distribution of branded flyers, corporate catalogs, and introductory trial packages in high-traffic business districts.

3.2 UNIT ECONOMICS & CAC VS. LTV OPTIMIZATION
- Estimated Customer Acquisition Cost (CAC): ₦1,200 – ₦2,500 per paying customer via targeted digital channels.
- Average Order Value (AOV): ₦18,500 – ₦45,000 across product categories.
- Projected Customer Lifetime Value (LTV): ₦125,000 over 12 months based on a conservative 4.2x annual repurchase frequency.
- LTV-to-CAC Ratio: 50:1, demonstrating outstanding marketing ROI and highly profitable unit economics.

3.3 CONVERSION FUNNEL & DAILY SALES PIPELINE
- Stage 1 (Awareness): Targeted reels, paid meta ads, and word-of-mouth driving traffic to the digital storefront.
- Stage 2 (Engagement): Automated instant WhatsApp greeting with product catalogs, pricing tiers, and active promotional vouchers.
- Stage 3 (Checkout): Seamless invoice generation with verified bank payment details and automated order confirmation.
- Stage 4 (Fulfillment & Review): Dispatch tracking notification followed by an automated review/feedback request within 48 hours.

3.4 CUSTOMER RETENTION, LOYALTY LOOPS & REFERRALS
- 'Refer-a-Friend' Incentive: Providing a 5% discount on the referrer's next purchase and a ₦1,000 voucher for new referred buyers.
- VIP Priority Access: Exclusive first-look access to new inventory arrivals and seasonal clearance discounts for repeat customers.
- Proactive Relationship Management: Automated birthday and milestone greetings coupled with customized restock reminders.""",

            "operationalPlan": f"""4.1 DAILY OPERATIONAL WORKFLOW & STANDARD OPERATING PROCEDURES
{name} operates with streamlined, documented SOPs to ensure flawless daily execution:
- Morning Shift (08:00 - 10:00): Inventory audit, reconciliation of incoming stock, and review of overnight digital orders.
- Mid-Day Operations (10:00 - 15:00): Order processing, packaging in branded protective materials, quality inspection, and dispatch handover to courier partners.
- Afternoon/Evening (15:00 - 18:00): Customer support, delivery confirmation tracking, debtor ledger reconciliation, and daily financial balancing.

4.2 SUPPLY CHAIN RESILIENCE & SOURCING STRATEGY
To mitigate inflation and foreign exchange shocks, {name} maintains a diversified dual-sourcing model:
- Primary Tier: Long-term agreements with verified primary importers and local manufacturers with guaranteed 30-day price-lock commitments.
- Secondary Tier: Pre-vetted local distributor network in major wholesale commercial centers for rapid emergency restocks.
- Buffer Inventory: Maintaining a minimum 21-day safety stock on high-velocity SKUs to prevent stockouts during supplier lead-time spikes.

4.3 LOGISTICS, FULFILLMENT & WAYBILL PARTNERSHIPS
- Local Intra-City Deliveries: Exclusive SLAs with dedicated dispatch courier networks in {location} ensuring 2- to 4-hour express fulfillment.
- Interstate Transit: Strategic partnerships with established logistics providers (e.g., GIG Logistics, Speedaf, Peace Mass Transit) offering trackable waybill services across all 36 Nigerian states.

4.4 POWER & INFRASTRUCTURE CONTINUITY (100% UPTIME)
To eliminate downtime caused by national grid instability:
- Primary Power Backup: 3.5kVA Pure Sine Wave Solar Inverter installation equipped with lithium-ion batteries powering all computers, routers, lighting, and communication devices.
- Secondary Backup: Low-fuel consumption generator for peak machinery operation during extended rainy spells.
- Internet Redundancy: Dual high-speed 4G/5G mobile routers (MTN + Airtel) ensuring zero disruption to digital orders and customer messaging.

4.5 STAFFING STRUCTURE & KEY PERSONNEL
Operated by an agile team of {employees}:
- Managing Director / Founder: Strategic direction, supplier negotiations, marketing campaigns, and financial oversight.
- Operations & Fulfillment Lead: Packaging, inventory management, courier coordination, and quality control.
- Customer Care & Sales Associate: WhatsApp community management, order entry, and after-sales support.""",

            "financialProjection": f"""5.1 STARTUP CAPITAL EXPENDITURE (CAPEX) & WORKING CAPITAL
Total Capital Base: {capital}

| Expenditure Item | Allocation (₦) | Percentage | Purpose |
| :--- | :--- | :--- | :--- |
| **Initial Inventory Stocking** | ₦2,250,000 | 45% | Direct wholesale inventory procurement from Tier-1 suppliers |
| **Logistics & Packaging Setup** | ₦600,000 | 12% | Branded packaging, thermal barcode printers, weighing scales |
| **Solar Inverter & Power System** | ₦650,000 | 13% | 3.5kVA Solar Inverter + Lithium Battery for 24/7 uptime |
| **Marketing & Launch Campaigns** | ₦750,000 | 15% | Meta ads, TikTok influencer activations, launch promotions |
| **CAC Registration & Compliance** | ₦250,000 | 5% | CAC incorporation, TIN, corporate account setup |
| **Contingency Operating Reserve** | ₦500,000 | 10% | Emergency cash runway & working capital buffer |
| **TOTAL INITIAL DEPLOYMENT** | **₦5,000,000** | **100%** | **Comprehensive Launch & Growth Capitalization** |

5.2 3-YEAR PROJECTED INCOME STATEMENT (NGN)
- **Year 1**:
  - Gross Revenue: ₦18,500,000
  - Cost of Goods Sold (COGS - 55%): (₦10,175,000)
  - **Gross Profit (45%)**: ₦8,325,000
  - Operating Expenses (Rent, Logistics, Power, Staff, Ads): (₦3,145,000)
  - **Net Profit Before Tax (28%)**: **₦5,180,000**
- **Year 2**:
  - Gross Revenue: ₦42,000,000
  - Cost of Goods Sold (COGS - 52%): (₦21,840,000)
  - **Gross Profit (48%)**: ₦20,160,000
  - Operating Expenses: (₦6,300,000)
  - **Net Profit Before Tax (33%)**: **₦13,860,000**
- **Year 3**:
  - Gross Revenue: ₦85,000,000
  - Cost of Goods Sold (COGS - 50%): (₦42,500,000)
  - **Gross Profit (50%)**: ₦42,500,000
  - Operating Expenses: (₦11,900,000)
  - **Net Profit Before Tax (36%)**: **₦30,600,000**

5.3 MONTHLY CASH FLOW & BREAK-EVEN DYNAMICS
- Average Monthly Operating Expenses: ~₦260,000 – ₦350,000 in Year 1.
- Monthly Break-Even Sales Volume: ₦680,000 gross revenue.
- Projected Break-Even Month: Achieved by Month 4 of commercial operations.
- Full Capital Payback Period: Estimated at 14 months, providing an outstanding Internal Rate of Return (IRR) exceeding 65%.""",

            "swotAnalysis": f"""6.1 IN-DEPTH SWOT STRATEGIC ANALYSIS FOR {name}

### STRENGTHS (Internal Advantages)
- Agile Digital Sales Engine: High-converting WhatsApp community commerce and direct social selling with near-zero customer friction.
- Lean Operational Cost Structure: Operating without bloated retail rent overheads, enabling 15–20% higher net margins than traditional competitors.
- Uncompromising Quality Control: Direct sourcing protocols ensuring zero counterfeit products and top-tier customer trust.
- Verified Payment & Invoicing Infrastructure: Seamless digital invoices and instant bank reconciliation building strong commercial credibility.

### WEAKNESSES (Internal Improvement Areas)
- Early-Stage Brand Awareness: Initial market presence requires aggressive social proof and targeted acquisition campaigns.
- Reliance on Third-Party Couriers: Potential delivery delays caused by external logistics dispatch partners during peak rainy seasons.
- Working Capital Constraints on Bulk Stocking: Need to balance rapid stock turnover against bulk purchase volume discounts.

### OPPORTUNITIES (External Market Growth Vectors)
- B2B Corporate Supply & Wholesale Expansion: Supplying larger retail outlets, corporate offices, and institutional buyers in bulk.
- Interstate Geographic Scaling: Replicating {location} success across Abuja, Port Harcourt, and regional commerce hubs.
- Nigerian Grant & MSME Funding Access: Capitalizing on active funding programs (e.g. Bank of Industry, iDICE, LSETF, TEF) to acquire specialized equipment and bulk inventory.
- Digital Marketplace Dominance: Leveraging ecosystem listings to attract nationwide organic buyers.

### THREATS (External Macroeconomic Risks)
- Macroeconomic Inflation & Fuel Price Volatility: Escalating transport and delivery costs impacting margins.
- Foreign Exchange Fluctuation: Rising import replacement costs for raw materials and imported goods.
- Price Undercutting by Low-Quality Informal Traders: Competitors offering cheap counterfeit substitutes.

6.2 STRATEGIC SWOT ACTION MATRIX

| Strategy Type | Action Plan |
| :--- | :--- |
| **SO (Strengths + Opportunities)** | Leverage lean digital operations to bid aggressively on lucrative corporate wholesale contracts and apply for low-interest BOI expansion loans. |
| **ST (Strengths + Threats)** | Deploy dynamic cost-plus pricing algorithms with a 10–15% inflation cushion to preserve gross margins against sudden supplier price spikes. |
| **WO (Weaknesses + Opportunities)** | Use grant funding to secure volume-discounted container inventory and establish dedicated dispatch courier partnerships. |
| **WT (Weaknesses + Threats)** | Implement strict 100% upfront payment policies on customized orders to eliminate bad debts and maintain healthy operating cash flow. |""",

            "riskMitigation": f"""7.1 MACROECONOMIC INFLATION & FX SHIELDING PROTOCOL
- Dynamic Cost-Plus Pricing Buffer: Adjusting retail and wholesale price lists dynamically with a 10–15% floating margin buffer to absorb sudden supplier increases without eroding profitability.
- Fast Inventory Velocity: Maintaining a high inventory turnover cycle (<25 days) to ensure cash is never trapped in stagnant stock during inflationary surges.
- Bulk Pre-Orders: Locking in wholesale prices with upfront supplier deposits prior to anticipated currency devaluations.

7.2 REGULATORY & TAX COMPLIANCE ROADMAP
- CAC Corporate Registration: Formally registered under the Corporate Affairs Commission (CAC) with active status.
- Tax Identification Number (TIN): Fully linked with the Federal Inland Revenue Service (FIRS) and state revenue boards to ensure 100% compliance for corporate contracts and grant eligibility.
- Standard Financial Ledgers: Utilizing SmartBiz audit-ready bookkeeping (invoicing, stock tracking, expense logs) to satisfy bank loan conditions and institutional grant audits.

7.3 SUPPLY CHAIN DISRUPTIONS & INVENTORY PROTECTION
- Dual-Vendor Redundancy: No single supplier accounts for more than 40% of total procurement, preventing single-point failure bottlenecks.
- Safe Storage Protocols: Fire-rated, moisture-controlled, and digitally monitored warehouse inventory holding.
- Strict Debtor Limits: Enforcing strict credit thresholds via Gbege Book debt recovery nudges to keep outstanding receivables under 5% of monthly revenue.

7.4 GRANT & INSTITUTIONAL FUNDING ALIGNMENT
{name}'s operational and financial structure is directly aligned with top Nigerian intervention funds:
- **Bank of Industry (BOI) Micro-Enterprise Fund**: Eligible for single-digit concessionary asset financing.
- **iDICE (Investment in Digital and Creative Enterprises)**: Positioned for tech-enabled digital commerce scaling.
- **LSETF (Lagos State Employment Trust Fund)**: Tailored for local job creation and micro-expansion capital.
- **Tony Elumelu Foundation (TEF)**: Structured to meet all seed grant application and mentorship criteria."""
        }
        return Response(fallback_plan)

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
        
        try:
            grants = gemini_utils.generate_json_content(prompt)
            if isinstance(grants, list) and len(grants) > 0:
                deduct_credits(request.user, 'grant_search')
                return Response(grants)
            elif isinstance(grants, dict) and 'grants' in grants and isinstance(grants['grants'], list):
                deduct_credits(request.user, 'grant_search')
                return Response(grants['grants'])
        except Exception as e:
            pass

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
                "deadline": "March 31, 2026",
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
                    "Register your business for free on smedanregister.ng to get your SUIN code",
                    "Apply through participating microfinance banks with your SUIN",
                    "Undergo business site inspection and credit scoring",
                    "Loan disbursed at 9% single-digit annual interest rate"
                ],
                "portal_url": "https://smedanregister.ng",
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

        deduct_credits(request.user, 'grant_search')
        return Response(fallback_list)

class AnalyzeBusinessNameView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from billing.utils import check_usage_gatekeeper
        allowed, remaining_credits = check_usage_gatekeeper(request.user, 'name_check', 2)
        if not allowed:
            return Response({"error": "Insufficient credits. Your free daily limit is exhausted.", "credits": remaining_credits}, status=402)

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
