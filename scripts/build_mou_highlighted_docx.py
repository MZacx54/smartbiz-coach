import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, hex_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color.replace('#', ''))
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_highlighted_mou_docx(output_path="docs/SmartBiz_Coach_NYE_MOU_v3.1_HIGHLIGHTED.docx"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = Document()

    for section in doc.sections:
        section.top_margin = Inches(0.65)
        section.bottom_margin = Inches(0.65)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)

    COLOR_DARK = RGBColor(6, 95, 70)          # Dark Emerald #065f46
    COLOR_SLATE_900 = RGBColor(15, 23, 42)    # Slate 900
    COLOR_SLATE_700 = RGBColor(51, 65, 85)    # Slate 700
    COLOR_MUTED = RGBColor(100, 116, 139)     # Slate 500

    logo_path = "public/logo-horizontal.png"
    if os.path.exists(logo_path):
        header_table = doc.add_table(rows=1, cols=2)
        header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        header_table.autofit = False
        
        cell_left = header_table.cell(0, 0)
        cell_left.width = Inches(2.5)
        p_logo = cell_left.paragraphs[0]
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(2.1))
        
        cell_right = header_table.cell(0, 1)
        cell_right.width = Inches(4.3)
        p_meta = cell_right.paragraphs[0]
        p_meta.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r1 = p_meta.add_run("OFFICIAL BILATERAL INSTRUMENT\n")
        r1.bold = True
        r1.font.size = Pt(8)
        r1.font.color.rgb = COLOR_DARK
        
        r2 = p_meta.add_run("DOCUMENT REF: SBC/NYE/MOU/2026/V3.1 (HIGHLIGHTED REVIEW DRAFT)\nEFFECTIVE DATE: OCTOBER 22, 2026\nJURISDICTION: FEDERAL REPUBLIC OF NIGERIA")
        r2.font.size = Pt(7)
        r2.font.color.rgb = COLOR_MUTED
        
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # Title Block
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(2)
    run_t = p_title.add_run("MEMORANDUM OF UNDERSTANDING (MOU)")
    run_t.bold = True
    run_t.font.size = Pt(16)
    run_t.font.color.rgb = COLOR_DARK

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(2)
    run_sub = p_sub.add_run("ON NATIONWIDE YOUTH MSME DIGITALIZATION, B2B COMMERCE & TECH-INNOVATOR ACCELERATION")
    run_sub.bold = True
    run_sub.font.size = Pt(9.5)
    run_sub.font.color.rgb = COLOR_SLATE_900

    p_sub2 = doc.add_paragraph()
    p_sub2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub2.paragraph_format.space_after = Pt(8)
    run_sub2 = p_sub2.add_run("BETWEEN\n")
    run_sub2.font.size = Pt(8.5)
    run_sub2.font.color.rgb = COLOR_MUTED
    
    run_p1 = p_sub2.add_run("SMARTBIZ COACH\n")
    run_p1.bold = True
    run_p1.font.size = Pt(9.5)
    run_p1.font.color.rgb = COLOR_DARK
    
    run_and = p_sub2.add_run("AND\n")
    run_and.font.size = Pt(8.5)
    run_and.font.color.rgb = COLOR_MUTED
    
    run_p2 = p_sub2.add_run("NACCIMA YOUTH ENTREPRENEURS (NYE)")
    run_p2.bold = True
    run_p2.font.size = Pt(9.5)
    run_p2.font.color.rgb = COLOR_DARK

    # Notice callout
    p_notice = doc.add_paragraph()
    p_notice.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_notice.paragraph_format.space_after = Pt(6)
    r_not = p_notice.add_run("[NOTE FOR REVIEW: Additions made by SmartBiz Coach in response to NYE V3 are highlighted in YELLOW below]")
    r_not.bold = True
    r_not.font.size = Pt(8)
    r_not.font.color.rgb = RGBColor(180, 83, 9)

    # Metadata Box
    meta_box = doc.add_table(rows=1, cols=4)
    meta_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_box.autofit = False
    col_widths = [Inches(1.7), Inches(1.8), Inches(1.8), Inches(1.5)]
    meta_items = [
        ("PARTIES INVOLVED", "SmartBiz Coach & NYE"),
        ("COMMERCIAL MODEL", "Partially Free (Hybrid Freemium)"),
        ("TECHNICAL SCOPE", "24 Integrated AI & POS Modules"),
        ("INITIAL DURATION", "Two (2) Years Renewable")
    ]
    for i, (label, val) in enumerate(meta_items):
        cell = meta_box.cell(0, i)
        cell.width = col_widths[i]
        set_cell_background(cell, "f8fafc")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        rl = p.add_run(f"{label}\n")
        rl.bold = True
        rl.font.size = Pt(7)
        rl.font.color.rgb = COLOR_DARK
        rv = p.add_run(val)
        rv.font.size = Pt(7.5)
        rv.font.color.rgb = COLOR_SLATE_700

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Parties Definitions
    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_after = Pt(4)
    p_intro.paragraph_format.line_spacing = 1.15
    r_intro = p_intro.add_run("THIS MEMORANDUM OF UNDERSTANDING is made and entered into this ")
    r_intro.font.size = Pt(8.5)
    r_intro.font.color.rgb = COLOR_SLATE_700
    r_date = p_intro.add_run("22nd day of October, 2026,")
    r_date.bold = True
    r_date.font.size = Pt(8.5)
    r_date.font.color.rgb = COLOR_SLATE_900

    parties_defs = [
        ("1. SMARTBIZ COACH", " (operating under registered web domains: smartbizcoach.com.ng and market.smartbizcoach.com.ng), an indigenous AI-powered business operating system, machine learning financial intelligence, and unified commerce technology company, having operational offices in Bauchi State and the Federal Capital Territory (FCT), Abuja, represented by its Founder & Chief Executive, ", "ZACHARIAH MESHACH", " (hereinafter referred to as the \"TECHNOLOGY PARTNER\") of the FIRST PART;"),
        ("2. NACCIMA YOUTH ENTREPRENEURS (NYE)", ", the apex organized private sector youth entrepreneurship and commercial arm of the Nigerian Association of Chambers of Commerce, Industry, Mines, and Agriculture (NACCIMA), having its National Secretariat at 28, Djibouti Crescent, Wuse 2, Abuja, Nigeria, represented by its National Coordinator, ", "AMB. DR. SAMEERA ABUBAKAR ABDULLAHI", " (hereinafter referred to as \"NYE\") of the SECOND PART.")
    ]

    for p_label, p_text1, p_name, p_text2 in parties_defs:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(p_label); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = COLOR_SLATE_900
        r = p.add_run(p_text1); r.font.size = Pt(8.5); r.font.color.rgb = COLOR_SLATE_700
        r = p.add_run(p_name); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = COLOR_SLATE_900
        r = p.add_run(p_text2); r.font.size = Pt(8.5); r.font.color.rgb = COLOR_SLATE_700

    p_col = doc.add_paragraph()
    p_col.paragraph_format.space_after = Pt(6)
    r = p_col.add_run("(SMARTBIZ COACH and NYE are individually referred to as a \"Party\" and collectively as the \"Parties\").")
    r.italic = True; r.font.size = Pt(8); r.font.color.rgb = COLOR_MUTED

    def add_sec_h(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title); r.bold = True; r.font.size = Pt(10.5); r.font.color.rgb = COLOR_DARK

    def add_subsec_h(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(7)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title); r.bold = True; r.font.size = Pt(9); r.font.color.rgb = COLOR_SLATE_900

    def add_p(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix); rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
        r = p.add_run(text); r.font.size = Pt(8); r.font.color.rgb = COLOR_SLATE_700

    def add_b(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix); rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
        r = p.add_run(text); r.font.size = Pt(8); r.font.color.rgb = COLOR_SLATE_700

    # 1. Recitals
    add_sec_h("1. RECITALS & BACKGROUND")
    add_p(" has engineered and operationalized a proprietary, mobile-first, offline-resilient Artificial Intelligence Business Operating System and Unified Commerce Engine (hosted at smartbizcoach.com.ng and market.smartbizcoach.com.ng). The platform integrates a 5-second point-of-sale (POS) retail day-book, offline Progressive Web App (PWA) cashbooks, phone camera barcode scanning, customer debt ledger recovery (\"Gbege Book\"), bankable AI business plan modeling, generative marketing studios, alternative machine learning credit scoring (SmartScore 300-850), and nationwide inter-state B2B wholesale trade infrastructure specifically calibrated for Nigerian market dynamics;", "A. WHEREAS SMARTBIZ COACH")
    add_p(" is the statutory organized private sector youth leadership body chartered to organize, accelerate, formalize, and represent youth-owned micro, small, and medium enterprises (MSMEs), commercial traders, industrial manufacturers, and service providers across the 36 States of the Federation and the Federal Capital Territory (FCT), operating under the auspices of NACCIMA Senior Chambers;", "B. WHEREAS NACCIMA YOUTH ENTREPRENEURS (NYE)")
    add_p(" Recognizing that youth employment, industrial self-reliance, technical fabrication, hardware innovations, and agro-allied manufacturing are critical to national economic revival, both Parties agree to prioritize the inclusion of youth manufacturers, technical fabricators, and engineering innovators into this digital transformation agenda, while facilitating institutional linkages to key federal technical agencies and industrial intervention programs;", "C. WHEREAS INDUSTRIAL & TECHNICAL INNOVATION PRIORITIZATION:")
    add_p(" following extensive technical validation and bilateral consultations, the Parties agree to enter into this MOU under the operational terms set forth herein.", "D. NOW THEREFORE,")

    # 2. Objectives
    add_sec_h("2. PURPOSE AND STRATEGIC OBJECTIVES")
    objs = [
        ("1. Digitalization & Formalization of Youth MSMEs: ", "Transitioning informal, unbanked youth enterprises into auditable, bankable businesses through localized offline POS bookkeeping, petty cash tracking, and financial discipline software."),
        ("2. Industrial & Technical Commercialization: ", "Catalyzing direct market linkages for engineering prototypes, indigenous hardware, renewable energy assemblies, and fabricated agro-machinery through verified seller seals and nationwide waybill logistics."),
        ("3. National B2B Commerce & Inter-State Trade: ", "Connecting NYE wholesalers, manufacturers, and verified artisans into a centralized National Market Square (market.smartbizcoach.com.ng) featuring verified merchant badges and direct Paystack bank settlement."),
        ("4. Alternative Credit Scoring & Capital Mobilization: ", "Deploying algorithmic cashflow verification (SmartScore 300-850) and cryptographic audit dossiers to de-risk micro-lending and connect members directly to Bank of Industry (BOI), SMEDAN, and commercial credit programs."),
        ("5. Nationwide Capacity Building & Digital Bootcamps: ", "Delivering zonal digital formalization masterclasses, financial literacy workshops, and technical onboarding clinics across all geopolitical zones of Nigeria.")
    ]
    for bp, t in objs:
        add_b(t, bold_prefix=bp)

    # 3. 24 Modules
    add_sec_h("3. SCOPE OF COLLABORATION & 24-MODULE PLATFORM ARCHITECTURE")
    add_p("The nationwide deployment encompasses SmartBiz Coach's comprehensive twenty-four (24) module ecosystem across five (5) operational pillars:")

    mod_data = [
        ("Category", "Module Name", "Core Technical Capabilities & Commercial Value"),
        ("A. Financial Operations, POS & Shop Security", 
         "1. Executive Telemetry Dashboard\n2. 5-Second POS Retail Cashbook\n3. Phone Camera Barcode Scanner\n4. Anti-Theft Apprentice Lock (4-PIN)\n5. Open-Market Offline PWA Mode\n6. 'Gbege Book' Debtor Ledger\n7. Invoices & Instant Receipts",
         "Live gross margin tracking; multi-tender cash & transfer recording; hardware-free camera barcode scanning; 4-digit cashier lock preventing apprentice snooping into financial margins; 100% offline transactions auto-synchronizing on connection; automated polite WhatsApp & SMS debt collection nudges; PDF bill generation."),
        ("B. Machine Learning Financial Intelligence",
         "8. SmartScore Credit Engine (300-850)\n9. Till Integrity Anomaly Engine\n10. Cryptographic Audit Dossier",
         "Algorithmic cashflow & repayment scoring replacing collateral requirements; Isolation Forest anomaly detection uncovering unrecorded cash leakage and phantom ledger edits; verifiable digital audit certificates shareable with loan officers at BOI, SMEDAN, DBN, and commercial banks."),
        ("C. Unified National Commerce & Logistics",
         "11. Central Market Square Subdomain\n12. Standalone WhatsApp Storefronts\n13. Direct Paystack Settlement\n14. State Logistics Rate Matrix\n15. Verified Customer Reviews & Trust",
         "High-visibility national multi-vendor directory (market.smartbizcoach.com.ng) spanning 4 pillars (Retail, Services, Real Estate, B2B Wholesale); instant branded storefronts (/store/:slug); direct split settlement into vendor bank accounts; 36-state waybill rate calculation and tracking; anti-fraud seller verification seals."),
        ("D. Generative AI Marketing & Creative",
         "16. AI Brand Builder & Logo Suite\n17. Vernacular Copywriter (5 Dialects)\n18. Snap-to-Studio 4K Photo Studio\n19. Marketing Agent & Broadcast HQ\n20. AI Objection Closer & Assistant",
         "Automated corporate identity and logo generation; native marketing captions in English, Pidgin, Hausa, Yoruba, and Igbo; instant AI product background replacement for professional catalog imagery; targeted SMS (Termii NGN 6) & WhatsApp broadcasts; conversational sales objection closing."),
        ("E. Capital Linkages & Governance",
         "21. AI Bankable Business Plan Engine\n22. Grant & Capital Matcher\n23. CAC Accredited Agent Legal Desk\n24. Institutional Executive Portal",
         "5-year financial models incorporating NGN inflation, CAPEX/OPEX amortization compliant with BOI & SMEDAN standards; algorithmic federal/state grant discovery; step-by-step CAC incorporation desk; macro analytics console for NYE executive oversight.")
    ]

    t_mod = doc.add_table(rows=len(mod_data), cols=3)
    t_mod.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_mod.autofit = False
    m_widths = [Inches(1.8), Inches(2.2), Inches(2.8)]

    for row_idx, row in enumerate(mod_data):
        for col_idx, cell_text in enumerate(row):
            c = t_mod.cell(row_idx, col_idx)
            c.width = m_widths[col_idx]
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            set_cell_margins(c, top=70, bottom=70, left=90, right=90)
            if row_idx == 0:
                set_cell_background(c, "065f46")
                r = p.add_run(cell_text); r.bold = True; r.font.size = Pt(7.5); r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "f8fafc" if row_idx % 2 == 1 else "ffffff"
                set_cell_background(c, bg)
                r = p.add_run(cell_text)
                if col_idx == 0: r.bold = True
                r.font.size = Pt(7)
                r.font.color.rgb = COLOR_SLATE_700

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 4. Partially Free Model & Table 4.1
    add_sec_h("4. PARTIALLY FREE (HYBRID FREEMIUM) COMMERCIAL FRAMEWORK")
    add_p("To guarantee widespread grassroots adoption across Nigerian markets while maintaining sovereign technical sustainability, SmartBiz Coach operates under an authentic Partially Free (Hybrid Freemium) architecture rather than an unsustainable 100% free claim:")

    free_items_left = (
        "- Unlimited POS Day-Book & Cashbook Entries (Cash, Transfer, Credit)\n"
        "- Phone Camera Barcode & QR Code Inventory Scanning\n"
        "- Anti-Theft Apprentice Shift Lock (4-Digit Owner PIN)\n"
        "- Open-Market Offline PWA Operations (Zero internet data required)\n"
        "- Petty Cash, Generator Fuel & Operational Expense Logging\n"
        "- Daily Automated WhatsApp Profit/Loss Telemetry Summary\n"
        "- Gbege Book Customer Debtor Tracking & WhatsApp Reminders\n"
        "- Public Storefront Catalog Listing & WhatsApp Direct Orders\n"
        "- Basic Market Square Listing on market.smartbizcoach.com.ng\n"
        "- No monthly software lockouts, mandatory license fees, or core POS subscriptions."
    )
    paid_items_right = (
        "- BOI/SMEDAN 5-Year Bankable Business Plan (PDF): 15 Credits (~NGN 150)\n"
        "- Snap-to-Studio 4K AI Product Background Removal: 2 Credits (~NGN 20/photo)\n"
        "- AI Brand Builder Kit & Commercial Logo Suite: 10 Credits (~NGN 100)\n"
        "- Marketplace VIP Promoted Listing (7-Day Spotlight): 20 Credits (~NGN 200)\n"
        "- Automated WhatsApp Sales Recovery & Reminders: 1 Credit (~NGN 10)\n"
        "- Marketing Agent Targeted SMS Broadcasts: Billed directly at NGN 6.00 per SMS segment via Termii GSM-7 gateway."
    )

    t_free = doc.add_table(rows=2, cols=2)
    t_free.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_free.autofit = False
    f_widths = [Inches(3.4), Inches(3.4)]

    h_titles = ["100% FREE CORE OPERATING UTILITIES (LIFETIME 0 CREDITS)", "MICRO-PRICED ADVANCED AI & COMPUTE (BIZCREDIT WALLET)"]
    for i, title in enumerate(h_titles):
        c = t_free.cell(0, i)
        c.width = f_widths[i]
        set_cell_background(c, "065f46" if i == 0 else "0f766e")
        set_cell_margins(c, top=80, bottom=80, left=90, right=90)
        p = c.paragraphs[0]
        r = p.add_run(title); r.bold = True; r.font.size = Pt(7.5); r.font.color.rgb = RGBColor(255, 255, 255)

    for i, content in enumerate([free_items_left, paid_items_right]):
        c = t_free.cell(1, i)
        c.width = f_widths[i]
        set_cell_background(c, "f8fafc")
        set_cell_margins(c, top=80, bottom=80, left=90, right=90)
        p = c.paragraphs[0]
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(content); r.font.size = Pt(7.5); r.font.color.rgb = COLOR_SLATE_700

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    add_subsec_h("Table 4.1: Unified BizCredit Wallet Packages for NYE Members")
    w_data = [
        ("Package Tier", "Cost (NGN) / Credits", "Effective Unit Rate", "Featured Entitlements & Use Cases"),
        ("Micro Pack", "NGN 500 (50 Credits)", "NGN 10.00/credit", "Ideal for new shops; covers 25 photo cleanups or 50 WhatsApp broadcast nudges."),
        ("Starter Pack", "NGN 1,500 (150 Credits)", "NGN 10.00/credit", "Includes 7-day Market Square spotlight boost + 4K photo studio batch."),
        ("Grower Pack", "NGN 3,500 (450 Credits)", "NGN 8.75/credit", "Full BOI business plan + Verified Merchant Trust Seal + multi-item boosts."),
        ("Vendor Pro Pack", "NGN 7,500 (1,250 Credits)", "NGN 7.50/credit", "30-Day VIP marketplace spotlight + high-frequency SMS broadcast campaigns."),
        ("Mogul Pack", "NGN 15,000 (3,000 Credits)", "NGN 6.00/credit", "Best value rate; engineered for industrial fabricators, wholesalers, and multi-branch operations.")
    ]

    t_w = doc.add_table(rows=len(w_data), cols=4)
    t_w.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_w.autofit = False
    w_widths = [Inches(1.3), Inches(1.5), Inches(1.3), Inches(2.7)]

    for row_idx, row in enumerate(w_data):
        for col_idx, cell_text in enumerate(row):
            c = t_w.cell(row_idx, col_idx)
            c.width = w_widths[col_idx]
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            set_cell_margins(c, top=70, bottom=70, left=80, right=80)
            if row_idx == 0:
                set_cell_background(c, "059669")
                r = p.add_run(cell_text); r.bold = True; r.font.size = Pt(7.5); r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "f8fafc" if row_idx % 2 == 1 else "ffffff"
                set_cell_background(c, bg)
                r = p.add_run(cell_text)
                if col_idx in [0, 1]: r.bold = True
                r.font.size = Pt(7)
                r.font.color.rgb = COLOR_SLATE_700

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 5. Startup Pack
    add_sec_h("5. THE NATIONAL YOUTH ENGINEERING & TECH-INNOVATOR STARTUP PACK (NYE TECH-STARTUP PACK)")
    add_p("To accelerate the commercialization of homegrown Nigerian engineering, technical innovations, agro-industrial machinery, and youth manufacturing, the Parties hereby establish the dedicated \"NYE Tech-Innovators & Engineering Startup Pack\":")

    pack_items = [
        ("5.1 Target Beneficiaries: ", "Youth fabricators, hardware engineers, clean-energy/solar technicians, agro-machinery developers, and accredited technical innovators within NYE's industrial clusters, including innovators affiliated with national technology incubation hubs, vocational training centres (TVET), and federal engineering institutes."),
        ("5.2 Component 1 — Pre-Funded Onboarding AI BizCredits: ", "An initial startup allocation of 150 to 400 BizCredits (valued up to NGN 3,500) credited directly to verified technical beneficiaries upon registration at zero cost, enabling immediate generation of a bank-ready business plan, 4K product photos, and branding suites."),
        ("5.3 Component 2 — Official 'Verified Technical Innovator / NYE Industrial Member' Badge: ", "An institutional trust mark displayed prominently on their storefront and listings across market.smartbizcoach.com.ng, validating engineering provenance and authenticity to nationwide institutional buyers."),
        ("5.4 Component 3 — B2B Wholesale Directory Priority: ", "Direct priority cataloging on the dedicated B2B Wholesale pillar (market.smartbizcoach.com.ng/?tab=B2B) to facilitate bulk supply contracts with commercial off-takers, agricultural cooperatives, and infrastructure projects."),
        ("5.5 Component 4 — Engineering MOQ & Waybill Logistics Structuring: ", "Specialized configuration for Minimum Order Quantities (MOQ), technical specification documents, and state-by-state heavy cargo waybill haulage routing across all 36 States + FCT."),
        ("5.6 Component 5 — Capital Pre-Underwriting & Cryptographic Dossier: ", "Direct generation of verified cryptographic SmartScore audit dossiers (PublicAuditReport) for prioritized submission to the Bank of Industry (BOI) Manufacturing Intervention Fund, SMEDAN matching grants, and commercial development banks."),
        ("5.7 Component 6 — CAC Corporate Legal Formalization Desk: ", "Dedicated desk liaison with accredited Corporate Affairs Commission (CAC) legal agents to assist technical innovators in transitioning from unregistered ventures to incorporated Limited Liability Companies (Ltd) at subsidized statutory rates.")
    ]
    for bp, t in pack_items:
        add_b(t, bold_prefix=bp)

    # 6. Roles & Responsibilities (WITH HIGHLIGHTED 6.2a)
    add_sec_h("6. ROLES AND RESPONSIBILITIES OF THE PARTIES")
    add_subsec_h("6.1 Responsibilities of SMARTBIZ COACH (Technology Partner):")
    sbc_resp = [
        ("a. Infrastructure & Uptime: ", "Deploy, host, maintain, and support the mobile-first application and PWA with a minimum target uptime of 99.9%, daily encrypted database backups, and SSL transport security."),
        ("b. Beneficiary Startup Credit Allocation: ", "Credit all accredited NYE members and verified youth technical innovators with designated onboarding BizCredit allowances upon successful account verification."),
        ("c. Badge Architecture: ", "Maintain the cryptographic \"Verified NYE Member\" and \"Verified Technical Innovator\" badge infrastructure on the National Market Square."),
        ("d. Training Facilitation: ", "Provide expert curriculum, technical trainers, and operational documentation for co-branded zonal masterclasses, digital trade clinics, and chamber webinars."),
        ("e. Trade Mission Support: ", "Deploy digital onboarding and support desks during major NYE exhibitions, industrial summits, and bilateral trade expos."),
        ("f. Impact Telemetry Access: ", "Provide NYE leadership with continuous, secure administrative access to the institutional Partner Portal (dashboard/settings) displaying real-time adoption counts, GMV analytics, and regional formalization metrics.")
    ]
    for bp, t in sbc_resp:
        add_b(t, bold_prefix=bp)

    add_subsec_h("6.2 Responsibilities of NACCIMA YOUTH ENTREPRENEURS (NYE):")
    
    # 6.2(a) - HIGHLIGHTED CLAUSE
    p_62a = doc.add_paragraph(style='List Bullet')
    p_62a.paragraph_format.space_after = Pt(2.5)
    p_62a.paragraph_format.line_spacing = 1.15
    rb = p_62a.add_run("a. Non-Exclusive Institutional Endorsement: ")
    rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
    r_base = p_62a.add_run("Subject to NYE's internal approvals and periodic performance reviews, NYE may recognize SmartBiz Coach as a recommended business operating system, retail bookkeeping application and B2B trade platform for interested youth entrepreneurs. This endorsement is non-exclusive and does not prevent NYE from engaging other technology providers, comparing solutions, or recommending alternatives where appropriate. NYE members shall not be compelled to register, purchase credits, or use paid services as a condition of membership or participation in NYE activities. ")
    r_base.font.size = Pt(8); r_base.font.color.rgb = COLOR_SLATE_700
    
    # HIGHLIGHTED ADDITION
    r_high1 = p_62a.add_run("While core bookkeeping, offline PWA access, and basic storefront listings remain 100% free and voluntary, access to high-compute artificial intelligence tools, VIP marketplace spotlight promotions, and specialized commercial services shall remain subject to the platform's standard micro-priced BizCredit wallet framework.")
    r_high1.font.size = Pt(8); r_high1.font.color.rgb = COLOR_SLATE_900
    r_high1.font.highlight_color = WD_COLOR_INDEX.YELLOW

    # Rest of 6.2
    nye_rest = [
        ("b. State Chapter Mobilization: ", "Issue formal directives and circulars to all 36 State Chapters, FCT directorate, and sectoral trade groups to adopt the platform and onboard members."),
        ("c. Co-Branded Bootcamps: ", "Mobilize members, provide venues, and co-host regional digital formalization masterclasses in collaboration with state chambers of commerce."),
        ("d. Strategic Institutional Linkages: ", "Facilitate strategic introductions and bilateral linkages between SmartBiz Coach leadership and key institutional partners, including NACCIMA Senior Chambers, Federal Ministry of Industry, Trade and Investment (FMITI), SMEDAN, Bank of Industry (BOI), and the National Agency for Science and Engineering Infrastructure (NASENI), to jointly advocate for and extend digital empowerment to youth engineering innovators."),
        ("e. Joint Grant & Development Proposals: ", "Endorse, co-author, and submit joint proposals to domestic and international funding partners (GIZ, AfDB, World Bank, USAID, UNDP) to secure non-dilutive catalytic funding for nationwide youth enterprise digitization.")
    ]
    for bp, t in nye_rest:
        add_b(t, bold_prefix=bp)

    # 7. Financial Framework (WITH HIGHLIGHTED 7.2)
    add_sec_h("7. FINANCIAL, TRANSACTIONAL & REVENUE FRAMEWORK")
    add_b("This agreement establishes no mandatory subscription fees, operational overheads, or financial indebtedness against the National Secretariat of NACCIMA Youth Entrepreneurs.", bold_prefix="7.1 Zero Liability for NYE Secretariat: ")

    # 7.2 - HIGHLIGHTED CLAUSE
    p_72 = doc.add_paragraph(style='List Bullet')
    p_72.paragraph_format.space_after = Pt(2.5)
    p_72.paragraph_format.line_spacing = 1.15
    rb = p_72.add_run("7.2 Direct Paystack Settlement & Split-Payment Architecture: ")
    rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
    rb.font.highlight_color = WD_COLOR_INDEX.YELLOW

    r_72 = p_72.add_run("Commercial payments processed through the platform's automated payment gateway are settled directly into the vendor's designated Nigerian bank account via Paystack Subaccount automated split-routing (net of standard third-party payment processing fees and platform technology facilitation fees of 1.5% to 2.0% where applicable). Direct peer-to-peer customer settlements (including direct cash and direct WhatsApp orders) attract zero (0%) platform commission. SmartBiz Coach operates on a non-custodial model and holds zero vendor funds in escrow.")
    r_72.font.size = Pt(8); r_72.font.color.rgb = COLOR_SLATE_900
    r_72.font.highlight_color = WD_COLOR_INDEX.YELLOW

    add_b("Where dedicated donor funds, international development grants, or institutional sponsorships are secured under joint NYE - SmartBiz Coach programs, fund allocation, administrative overheads, and project management disbursements shall be governed by separate, mutually executed Project Implementation Agreements (PIAs).", bold_prefix="7.3 Project Implementation Agreements (PIAs): ")

    # 8. IP & Data Governance
    add_sec_h("8. INTELLECTUAL PROPERTY, TECHNOLOGY & DATA GOVERNANCE")
    ip_items = [
        ("8.1 Technology Ownership: ", "SMARTBIZ COACH retains exclusive, undivided ownership, intellectual property rights, copyright, source code, database architecture, and machine learning models powering smartbizcoach.com.ng and its associated subdomains."),
        ("8.2 Nigeria Data Protection Act (NDPA 2023) Compliance: ", "The Parties strictly adhere to the provisions of the NDPA 2023. All merchant financial transactions, debtor books, invoices, customer telephone records, and till entries remain the sole, confidential property of the respective business owner. Commercial records shall not be sold, monetized, or shared with third parties without explicit consent."),
        ("8.3 Trademark & Co-Branding License: ", "Each Party grants the other a revocable, non-exclusive, royalty-free license to use their official organizational name, acronym, and logo exclusively for co-branded educational bootcamps, official certificates of completion, and joint grant submissions.")
    ]
    for bp, t in ip_items:
        add_b(t, bold_prefix=bp)

    # 9. Duration & Termination
    add_sec_h("9. DURATION, RENEWAL, AND TERMINATION")
    dur_items = [
        ("9.1 Initial Term: ", "This MOU shall remain in full force and effect for an initial duration of Two (2) Years from October 22, 2026, subject to annual joint performance reviews."),
        ("9.2 Automatic Renewal: ", "Upon the conclusion of the initial term, this MOU shall automatically renew for successive one (1) year periods unless either Party provides a thirty (30) day written notice of non-renewal."),
        ("9.3 Termination for Convenience: ", "Either Party may terminate this agreement without cause upon giving Thirty (30) Days written notice to the other Party."),
        ("9.4 Termination for Cause: ", "Either Party may terminate immediately upon written notice in the event of a material breach of terms, gross misconduct, insolvency, or actions severely detrimental to the other Party's institutional reputation.")
    ]
    for bp, t in dur_items:
        add_b(t, bold_prefix=bp)

    # 10. Dispute Resolution
    add_sec_h("10. DISPUTE RESOLUTION & GOVERNING LAW")
    add_p("Any divergence, dispute, or question arising out of or relating to the interpretation, implementation, or operation of this MOU shall be settled amicably through good-faith executive consultations between the Founder & Chief Executive of SmartBiz Coach and the National Coordinator of NYE within Fourteen (14) Days of notification.", "10.1 Amicable Settlement: ")
    add_p("This MOU shall be governed by, construed, and enforced in accordance with the Laws of the Federal Republic of Nigeria.", "10.2 Governing Law: ")

    # 11. Implementation Roadmap (WITH HIGHLIGHTED 11.4)
    add_sec_h("11. IMPLEMENTATION ROADMAP AND PILOT")
    add_b("Within thirty (30) days of execution, the Parties shall prepare and approve a written implementation plan identifying activities, timelines, responsible officers, resources, target beneficiaries, training dates, reporting arrangements and deliverables. No State Chapter shall be treated as having accepted additional financial obligations unless separately agreed in writing.", bold_prefix="11.1 Joint Implementation Plan: ")
    add_b("Before nationwide rollout, the Parties shall conduct a pilot in one to three (1-3) willing NYE State Chapters (recommended: FCT Abuja, Bauchi State, and Lagos/Ogun), subject to written confirmation by the relevant Chapter leadership. The pilot target shall be agreed in the implementation plan; an indicative planning range is 100-300 MSMEs in total, subject to capacity, consent and available resources.", bold_prefix="11.2 Pilot First: ")
    add_b("The Parties shall review the pilot results, user feedback, service reliability, pricing clarity, data safeguards and adoption barriers before deciding in writing whether and how to scale to additional States or all geopolitical zones. Nationwide rollout shall not be presumed solely from signing this MOU.", bold_prefix="11.3 Review and Scale: ")

    # 11.4 - HIGHLIGHTED CLAUSE
    p_114 = doc.add_paragraph(style='List Bullet')
    p_114.paragraph_format.space_after = Pt(2.5)
    p_114.paragraph_format.line_spacing = 1.15
    rb = p_114.add_run("11.4 BizCredit Policy Schedule in Implementation Plan: ")
    rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
    rb.font.highlight_color = WD_COLOR_INDEX.YELLOW

    r_114 = p_114.add_run("The Parties hereby affirm and document in this implementation framework that BizCredits are non-monetary digital utility tokens used exclusively to access high-compute generative AI, cloud image processing, and marketplace promotions. BizCredits are strictly non-refundable for cash, non-transferable outside the platform, but carry no expiration during active account status and remain fully valid for consumption or during a sixty to ninety (60-90) day data export and transition window upon termination.")
    r_114.font.size = Pt(8); r_114.font.color.rgb = COLOR_SLATE_900
    r_114.font.highlight_color = WD_COLOR_INDEX.YELLOW

    # 12. Member Benefits & Pricing (WITH HIGHLIGHTED 12.1c & 12.2)
    add_sec_h("12. MEMBER BENEFITS, PRICING AND TRANSPARENCY")
    
    # 12.1
    p_121 = doc.add_paragraph(style='List Bullet')
    p_121.paragraph_format.space_after = Pt(2.5)
    p_121.paragraph_format.line_spacing = 1.15
    rb = p_121.add_run("12.1 Clear Free and Paid Features: ")
    rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
    r_121 = p_121.add_run("SmartBiz Coach shall provide NYE with a current, plain-language schedule distinguishing (a) core utilities available at no charge (POS day-book, offline PWA, barcode scanner, debt ledger, WhatsApp storefront), (b) features requiring BizCredits (AI business plans, 4K photo studio, branding kits, VIP boosts), and ")
    r_121.font.size = Pt(8); r_121.font.color.rgb = COLOR_SLATE_700
    
    # Highlighted split-fee mention
    r_121h = p_121.add_run("(c) transaction processing and third-party charges, including automated payment gateway split-fees (1.5%-2.0% on gateway checkout), SMS broadcasts (Termii NGN 6/segment), and CAC statutory fees. ")
    r_121h.font.size = Pt(8); r_121h.font.color.rgb = COLOR_SLATE_900
    r_121h.font.highlight_color = WD_COLOR_INDEX.YELLOW

    r_121end = p_121.add_run("The schedule in Section 4 shall be disclosed to members before onboarding and updated when prices or entitlements change.")
    r_121end.font.size = Pt(8); r_121end.font.color.rgb = COLOR_SLATE_700

    # 12.2 - HIGHLIGHTED CLAUSE
    p_122 = doc.add_paragraph(style='List Bullet')
    p_122.paragraph_format.space_after = Pt(2.5)
    p_122.paragraph_format.line_spacing = 1.15
    rb = p_122.add_run("12.2 Voluntary Purchases & BizCredit Token Policy: ")
    rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
    r_122 = p_122.add_run("Individual members are responsible only for charges they knowingly authorize. NYE shall not be liable for members' subscriptions, credit purchases, transactions or debts. No member shall be told that all services are free where advanced services or third-party charges apply. ")
    r_122.font.size = Pt(8); r_122.font.color.rgb = COLOR_SLATE_700
    
    r_122h = p_122.add_run("BizCredits are digital utility tokens, non-refundable for cash, but remain valid for consumption or during a 60-90 day data export window upon termination.")
    r_122h.font.size = Pt(8); r_122h.font.color.rgb = COLOR_SLATE_900
    r_122h.font.highlight_color = WD_COLOR_INDEX.YELLOW

    add_b("The Parties shall identify in the implementation plan a clearly defined starter package for new NYE members, prioritising essential bookkeeping/cashbook, basic marketplace listing, storefront/direct-order access and basic invoicing where these are available within the free tier. Any additional free credits, discounts or pre-funded allowances must specify the eligible cohort, quantity, value, funding source, allocation date and usage conditions.", bold_prefix="12.3 Starter Package: ")
    add_b("Material changes to member pricing or core free-tier entitlements shall be notified to NYE in writing at least thirty (30) days before taking effect for NYE programme participants, except where a shorter period is required by law or an unavoidable third-party change; in that case, prompt notice shall be given.", bold_prefix="12.4 Pricing Changes: ")

    # 13. State Governance
    add_sec_h("13. STATE-LEVEL GOVERNANCE, VERIFICATION AND MEMBER SUPPORT")
    state_items = [
        ("13.1 Focal Persons: ", "Each participating State Chapter may nominate a State Focal Person and a training/onboarding contact. SmartBiz Coach shall nominate a partnership lead and technical support contact. The names, duties and contact channels shall be recorded in the implementation plan."),
        ("13.2 Membership Verification: ", "Before granting a 'Verified NYE Member' badge, SmartBiz Coach shall verify the person's current membership through a process approved by NYE, using only the minimum information necessary. NYE retains authority over confirmation of NYE membership status; SmartBiz Coach is responsible for implementing and maintaining the technical badge system. A badge confirms membership status only and shall not be represented as a guarantee of product quality, solvency, creditworthiness or regulatory approval."),
        ("13.3 Technical Innovator Verification: ", "A 'Verified Technical Innovator' badge shall be issued only after a documented verification process proportionate to the claim being made. The badge must not imply engineering certification, product safety approval, intellectual-property ownership or regulatory clearance unless separately verified by a competent authority."),
        ("13.4 Support and Complaints: ", "SmartBiz Coach shall publish support channels and reasonable response targets for onboarding, access, billing, data and technical complaints. The Parties shall maintain an escalation path for unresolved complaints and review recurring issues at periodic partnership meetings.")
    ]
    for bp, t in state_items:
        add_b(t, bold_prefix=bp)

    # 14. KPIs & Reporting
    add_sec_h("14. PERFORMANCE INDICATORS AND REPORTING")
    kpi_items = [
        ("14.1 Key Performance Indicators (KPIs): ", "The Parties shall agree baseline values and realistic quarterly and annual targets in the implementation plan. KPIs should include: members onboarded; active users; businesses maintaining digital records; members trained; businesses listed; completed transactions or gross merchandise value; business plans generated; funding applications or referrals made; funding actually secured (reported separately); technical innovators verified; user satisfaction; support resolution times; and State/zone coverage."),
        ("14.2 Reporting and Review: ", "SmartBiz Coach shall provide quarterly aggregated reports to NYE and a joint annual impact review. Reports shall distinguish registrations from active usage, referrals from successful funding outcomes, and platform-generated estimates from independently verified outcomes. Reports must not expose identifiable member or customer data unless there is a lawful basis and appropriate authorization.")
    ]
    for bp, t in kpi_items:
        add_b(t, bold_prefix=bp)

    # 15. Data Protection
    add_sec_h("15. DATA PROTECTION, SECURITY AND RESPONSIBLE USE")
    dp_items = [
        ("15.1 Roles and Lawful Processing: ", "Before collecting or sharing personal data under this partnership, the Parties shall document their respective data-protection roles (including whether either acts as data controller or processor for each activity), purposes of processing, lawful basis, categories of data, access rights, retention periods and any approved sharing. Where required, the Parties shall execute a separate data-processing or data-sharing agreement."),
        ("15.2 Data Minimisation and Access: ", "Access to member records shall be role-based and limited to authorized personnel for agreed purposes. NYE shall receive aggregated or anonymised impact data by default. Individual-level data shall be shared with NYE only where necessary, lawful and appropriately disclosed/authorised."),
        ("15.3 Security and Breach Response: ", "SmartBiz Coach shall maintain appropriate technical and organisational safeguards, access controls, encrypted backups, secure transmission and a documented incident response process. A party becoming aware of a personal-data breach affecting the partnership shall notify the other party without undue delay and cooperate on investigation, mitigation and any legally required notifications."),
        ("15.4 Retention, Export and Deletion: ", "Members shall be informed how they can access and export their business records. Upon termination, SmartBiz Coach shall provide a sixty to ninety (60-90) day data export window for member data in a commonly usable format (CSV/JSON/PDF) and thereafter retain, return or securely delete data in accordance with applicable law and NDPA 2023 regulations."),
        ("15.5 AI, Credit Scores and Funding Claims: ", "Any SmartScore or alternative credit score is an indicative analytical output only and shall not be described as a guarantee of loan approval, grant eligibility or credit access. The platform shall explain material limitations, provide a channel to dispute or correct inaccurate underlying data, and ensure that funding decisions remain with the relevant funder or lender. No member data shall be used to train or improve AI models for unrelated commercial purposes without a lawful basis and appropriate notice/consent where required.")
    ]
    for bp, t in dp_items:
        add_b(t, bold_prefix=bp)

    # 16. Grants & Exit (WITH HIGHLIGHTED 16.3)
    add_sec_h("16. GRANTS, BRAND USE AND EXIT ARRANGEMENTS")
    add_b("Neither Party shall submit a proposal, make a funding commitment, represent the other Party as a co-applicant, or use the other Party's name/logo in a funding application without prior written approval from an authorised representative. Each funded initiative shall be governed by a signed Project Implementation Agreement (PIA) specifying objectives, budget, eligible costs, disbursement, procurement, staffing, deliverables, reporting, audit, asset ownership, safeguarding and responsibility for unspent funds.", bold_prefix="16.1 Prior Approval for Joint Proposals: ")
    add_b("Co-branded public communications, certificates and promotional materials shall be submitted to both Parties for written approval before publication. Use of either Party's name or logo outside the agreed purpose requires separate written permission.", bold_prefix="16.2 Branding Approval: ")

    # 16.3 - HIGHLIGHTED CLAUSE
    p_163 = doc.add_paragraph(style='List Bullet')
    p_163.paragraph_format.space_after = Pt(2.5)
    p_163.paragraph_format.line_spacing = 1.15
    rb = p_163.add_run("16.3 Continuity on Termination & BizCredit Policy: ")
    rb.bold = True; rb.font.size = Pt(8); rb.font.color.rgb = COLOR_SLATE_900
    r_163 = p_163.add_run("On expiry or termination, the Parties shall cooperate in good faith on an orderly transition. SmartBiz Coach shall provide a sixty to ninety (60-90) day data export window for members in a standard CSV/JSON format. ")
    r_163.font.size = Pt(8); r_163.font.color.rgb = COLOR_SLATE_700
    
    r_163h = p_163.add_run("Unused prepaid BizCredits are digital utility tokens, non-refundable for cash, but remain valid for consumption during this 60-90 day data export window for export, reporting, and fulfillment services. ")
    r_163h.font.size = Pt(8); r_163h.font.color.rgb = COLOR_SLATE_900
    r_163h.font.highlight_color = WD_COLOR_INDEX.YELLOW

    r_163end = p_163.add_run("Direct merchant banking and Paystack settlement channels shall continue uninterrupted for all pending customer deliveries.")
    r_163end.font.size = Pt(8); r_163end.font.color.rgb = COLOR_SLATE_700

    add_b("Nothing in this MOU creates an exclusive technology, procurement, funding or service relationship. Each Party may collaborate with other organisations, provided it does not misuse the other Party's confidential information or intellectual property.", bold_prefix="16.4 Non-Exclusivity: ")
    add_b("This integrated instrument is intended to clarify operational safeguards and should be reviewed by authorised representatives and legal advisers of both Parties before signature. If any provision of this section conflicts with another provision of the MOU, the Parties shall resolve the inconsistency in writing before execution; no change shall be effective unless approved by both Parties.", bold_prefix="16.5 Legal Review and Precedence: ")

    # Signatures
    p_wit = doc.add_paragraph()
    p_wit.paragraph_format.space_before = Pt(8)
    p_wit.paragraph_format.space_after = Pt(10)
    p_wit.paragraph_format.keep_with_next = True
    r = p_wit.add_run("IN WITNESS WHEREOF, the Parties hereto have caused this Memorandum of Understanding to be duly executed by their authorized legal representatives on the day and year first written above.")
    r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = COLOR_SLATE_900

    t_sig = doc.add_table(rows=1, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    s_widths = [Inches(3.4), Inches(3.4)]

    sig_content = [
        ("SIGNED FOR AND ON BEHALF OF FIRST PART:\nSMARTBIZ COACH\n\n\n____________________________________________\nZACHARIAH MESHACH\nFounder & Chief Executive, SmartBiz Coach\nDate: ________________________\n\nIn the presence of (Witness):\n\nSignature: __________________________________\nName: ______________________________________\nDesignation: ________________________________\nDate: ______________________________________"),
        ("SIGNED FOR AND ON BEHALF OF SECOND PART:\nNACCIMA YOUTH ENTREPRENEURS (NYE)\n\n\n____________________________________________\nAMB. DR. SAMEERA ABUBAKAR ABDULLAHI\nNational Coordinator, NACCIMA Youth Entrepreneurs (NYE)\nDate: ________________________\n\nIn the presence of (Witness):\n\nSignature: __________________________________\nName: ______________________________________\nDesignation: ________________________________\nDate: ______________________________________")
    ]

    for i in range(2):
        c = t_sig.cell(0, i)
        c.width = s_widths[i]
        set_cell_background(c, "f8fafc")
        set_cell_margins(c, top=120, bottom=120, left=120, right=120)
        p = c.paragraphs[0]
        p.paragraph_format.line_spacing = 1.18
        r = p.add_run(sig_content[i])
        r.font.size = Pt(8)
        r.font.color.rgb = COLOR_SLATE_900

    doc.save(output_path)
    print(f"Successfully generated highlighted DOCX at {output_path}")

if __name__ == "__main__":
    create_highlighted_mou_docx()
