import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable, PageBreak
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        w, h = A4
        margin = 38

        # Running header (pages after page 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 7.2)
            self.setFillColor(colors.HexColor("#065f46")) # Dark emerald
            self.drawString(margin, h - 26, "SMARTBIZ COACH & NACCIMA YOUTH ENTREPRENEURS (NYE)")
            self.setFont("Helvetica", 7.2)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawRightString(w - margin, h - 26, "MOU REF: SBC/NYE/MOU/2026/V3.1 (FINAL)")
            
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(margin, h - 30, w - margin, h - 30)

        # Running footer (all pages)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(margin, 34, w - margin, 34)

        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(margin, 24, "CONFIDENTIAL & LEGALLY BINDING | SMARTBIZ COACH & NACCIMA YOUTH ENTREPRENEURS (NYE)")
        self.drawRightString(w - margin, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="docs/SmartBiz_Coach_NYE_MOU.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=38,
        rightMargin=38,
        topMargin=36,
        bottomMargin=38
    )

    styles = getSampleStyleSheet()
    
    PRIMARY_EMERALD = colors.HexColor("#059669")
    DARK_EMERALD = colors.HexColor("#065f46")
    SLATE_900 = colors.HexColor("#0f172a")
    SLATE_700 = colors.HexColor("#334155")
    SLATE_600 = colors.HexColor("#475569")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e1")

    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Helvetica-Bold',
        fontSize=15.5,
        leading=19.5,
        textColor=DARK_EMERALD,
        alignment=1,
        spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        name='DocSubTitle',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=SLATE_900,
        alignment=1,
        spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        name='DocSubSubTitle',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=SLATE_600,
        alignment=1,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13.5,
        textColor=DARK_EMERALD,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SubSectionHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=SLATE_900,
        spaceBefore=6,
        spaceAfter=2.5,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='BodyCustom',
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.8,
        textColor=SLATE_700,
        spaceAfter=3.5
    ))
    styles.add(ParagraphStyle(
        name='BodyCustomBold',
        fontName='Helvetica-Bold',
        fontSize=7.6,
        leading=10.8,
        textColor=SLATE_900,
        spaceAfter=3.5
    ))
    styles.add(ParagraphStyle(
        name='BulletCustom',
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.5,
        textColor=SLATE_700,
        leftIndent=10,
        firstLineIndent=-8,
        spaceAfter=2.5
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.8,
        textColor=SLATE_700
    ))
    styles.add(ParagraphStyle(
        name='TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9.8,
        textColor=SLATE_900
    ))
    styles.add(ParagraphStyle(
        name='TableCellHeader',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10.2,
        textColor=colors.white
    ))

    story = []

    # 1. Header Banner
    logo_path = "public/logo-horizontal.png"
    if os.path.exists(logo_path):
        img = Image(logo_path, width=1.75*inch, height=0.46*inch)
        badge_text = Paragraph(
            "<font color='#065f46'><b>OFFICIAL BILATERAL INSTRUMENT</b></font><br/>"
            "<font color='#64748b' size='6.5'>DOCUMENT REF: SBC/NYE/MOU/2026/V3.1 (FINAL)<br/>"
            "EFFECTIVE DATE: OCTOBER 22, 2026 | JURISDICTION: NIGERIA</font>",
            ParagraphStyle('HMeta', parent=styles['TableCell'], alignment=2)
        )
        header_table = Table([[img, badge_text]], colWidths=[2.2*inch, 4.9*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)

    story.append(Spacer(1, 2))
    story.append(HRFlowable(width="100%", thickness=1.2, color=PRIMARY_EMERALD, spaceBefore=1, spaceAfter=5))

    story.append(Paragraph("MEMORANDUM OF UNDERSTANDING (MOU)", styles['DocTitle']))
    story.append(Paragraph("ON NATIONWIDE YOUTH MSME DIGITALIZATION, B2B COMMERCE &amp; TECH-INNOVATOR ACCELERATION", styles['DocSubTitle']))
    story.append(Paragraph("BETWEEN <b>SMARTBIZ COACH</b> AND <b>NACCIMA YOUTH ENTREPRENEURS (NYE)</b>", styles['DocSubSubTitle']))

    meta_data = [
        [
            Paragraph("<b>PARTIES INVOLVED:</b><br/>SmartBiz Coach &amp; NYE", styles['TableCell']),
            Paragraph("<b>COMMERCIAL MODEL:</b><br/>Partially Free (Hybrid Freemium)", styles['TableCell']),
            Paragraph("<b>PLATFORM SCOPE:</b><br/>24 Integrated AI &amp; POS Modules", styles['TableCell']),
            Paragraph("<b>INITIAL DURATION:</b><br/>Two (2) Years Renewable", styles['TableCell']),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[1.8*inch, 1.8*inch, 1.8*inch, 1.7*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 5))

    story.append(Paragraph("THIS MEMORANDUM OF UNDERSTANDING is made and entered into this <b>22nd day of October, 2026</b>,", styles['BodyCustom']))
    
    parties_p1 = (
        "<b>1. SMARTBIZ COACH</b> (operating under registered web domains: <code>smartbizcoach.com.ng</code> and "
        "<code>market.smartbizcoach.com.ng</code>), an indigenous AI-powered business operating system, machine learning financial "
        "intelligence, and unified commerce technology company, having operational offices in Bauchi State and the Federal Capital Territory "
        "(FCT), Abuja, represented by its Founder &amp; Chief Executive, <b>ZACHARIAH MESHACH</b> (hereinafter referred to as the "
        "<b>\"TECHNOLOGY PARTNER\"</b>) of the <b>FIRST PART</b>;"
    )
    story.append(Paragraph(parties_p1, styles['BodyCustom']))

    story.append(Paragraph("<b>AND</b>", ParagraphStyle('AndCenter', parent=styles['BodyCustomBold'], alignment=1, spaceBefore=1, spaceAfter=1)))

    parties_p2 = (
        "<b>2. NACCIMA YOUTH ENTREPRENEURS (NYE)</b>, the apex organized private sector youth entrepreneurship and commercial arm of the "
        "Nigerian Association of Chambers of Commerce, Industry, Mines, and Agriculture (NACCIMA), having its National Secretariat at "
        "28, Djibouti Crescent, Wuse 2, Abuja, Nigeria, represented by its National Coordinator, <b>AMB. DR. SAMEERA ABUBAKAR ABDULLAHI</b> "
        "(hereinafter referred to as <b>\"NYE\"</b>) of the <b>SECOND PART</b>."
    )
    story.append(Paragraph(parties_p2, styles['BodyCustom']))
    story.append(Paragraph("<i>(SMARTBIZ COACH and NYE are individually referred to as a \"Party\" and collectively as the \"Parties\").</i>", styles['BodyCustom']))

    # Section 1: Recitals
    story.append(Paragraph("1. RECITALS &amp; BACKGROUND", styles['SectionHeader']))
    recitals = [
        "<b>A. WHEREAS SMARTBIZ COACH</b> has engineered and operationalized a proprietary, mobile-first, offline-resilient Artificial Intelligence Business Operating System and Unified Commerce Engine (hosted at <code>smartbizcoach.com.ng</code> and <code>market.smartbizcoach.com.ng</code>). The platform integrates a 5-second point-of-sale (POS) retail day-book, offline Progressive Web App (PWA) cashbooks, phone camera barcode scanning, customer debt ledger recovery (\"Gbege Book\"), bankable AI business plan modeling, generative marketing studios, alternative machine learning credit scoring (SmartScore 300-850), and nationwide inter-state B2B wholesale trade infrastructure specifically calibrated for Nigerian market dynamics;",
        "<b>B. WHEREAS NACCIMA YOUTH ENTREPRENEURS (NYE)</b> is the statutory organized private sector youth leadership body chartered to organize, accelerate, formalize, and represent youth-owned micro, small, and medium enterprises (MSMEs), commercial traders, industrial manufacturers, and service providers across the 36 States of the Federation and the Federal Capital Territory (FCT), operating under the auspices of NACCIMA Senior Chambers;",
        "<b>C. WHEREAS INDUSTRIAL &amp; TECHNICAL INNOVATION PRIORITIZATION:</b> Recognizing that youth employment, industrial self-reliance, technical fabrication, hardware innovations, and agro-allied manufacturing are critical to national economic revival, both Parties agree to prioritize the inclusion of youth manufacturers, technical fabricators, and engineering innovators into this digital transformation agenda, while facilitating institutional linkages to key federal technical agencies and industrial intervention programs;",
        "<b>D. NOW THEREFORE</b>, following extensive technical validation and bilateral consultations, the Parties agree to enter into this MOU under the operational terms set forth herein."
    ]
    for r in recitals:
        story.append(Paragraph(r, styles['BodyCustom']))

    # Section 2: Strategic Objectives
    story.append(Paragraph("2. PURPOSE AND STRATEGIC OBJECTIVES", styles['SectionHeader']))
    objectives = [
        "<b>1. Digitalization &amp; Formalization of Youth MSMEs:</b> Transitioning informal, unbanked youth enterprises into auditable, bankable businesses through localized offline POS bookkeeping, petty cash tracking, and financial discipline software.",
        "<b>2. Industrial &amp; Technical Commercialization:</b> Catalyzing direct market linkages for engineering prototypes, indigenous hardware, renewable energy assemblies, and fabricated agro-machinery through verified seller seals and nationwide waybill logistics.",
        "<b>3. National B2B Commerce &amp; Inter-State Trade:</b> Connecting NYE wholesalers, manufacturers, and verified artisans into a centralized National Market Square (<code>market.smartbizcoach.com.ng</code>) featuring verified merchant badges and direct Paystack bank settlement.",
        "<b>4. Alternative Credit Scoring &amp; Capital Mobilization:</b> Deploying algorithmic cashflow verification (SmartScore 300-850) and cryptographic audit dossiers to de-risk micro-lending and connect members directly to Bank of Industry (BOI), SMEDAN, and commercial credit programs.",
        "<b>5. Nationwide Capacity Building &amp; Digital Bootcamps:</b> Delivering zonal digital formalization masterclasses, financial literacy workshops, and technical onboarding clinics across all geopolitical zones of Nigeria."
    ]
    for obj in objectives:
        story.append(Paragraph(obj, styles['BulletCustom']))

    # Section 3: 24 Modules Table
    story.append(Paragraph("3. SCOPE OF COLLABORATION &amp; 24-MODULE PLATFORM ARCHITECTURE", styles['SectionHeader']))
    story.append(Paragraph("The nationwide deployment encompasses SmartBiz Coach's comprehensive twenty-four (24) module ecosystem across five (5) operational pillars:", styles['BodyCustom']))

    modules_data = [
        [Paragraph("<b>Category</b>", styles['TableCellHeader']), Paragraph("<b>Module Name</b>", styles['TableCellHeader']), Paragraph("<b>Core Technical Capabilities &amp; Commercial Value</b>", styles['TableCellHeader'])],
        
        [Paragraph("<b>A. Financial Operations, POS &amp; Shop Security</b>", styles['TableCellBold']),
         Paragraph("1. Executive Telemetry Dashboard<br/>2. 5-Second POS Retail Cashbook<br/>3. Phone Camera Barcode Scanner<br/>4. Anti-Theft Apprentice Lock (4-PIN)<br/>5. Open-Market Offline PWA Mode<br/>6. 'Gbege Book' Debtor Ledger<br/>7. Invoices &amp; Instant Receipts", styles['TableCell']),
         Paragraph("Live gross margin tracking; multi-tender cash &amp; transfer recording; hardware-free camera barcode scanning; 4-digit cashier lock preventing apprentice snooping into financial margins; 100% offline transactions auto-synchronizing on connection; automated polite WhatsApp &amp; SMS debt collection nudges; PDF bill generation.", styles['TableCell'])],

        [Paragraph("<b>B. Machine Learning Financial Intelligence</b>", styles['TableCellBold']),
         Paragraph("8. SmartScore Credit Engine (300-850)<br/>9. Till Integrity Anomaly Engine<br/>10. Cryptographic Audit Dossier", styles['TableCell']),
         Paragraph("Algorithmic cashflow &amp; repayment scoring replacing collateral requirements; Isolation Forest anomaly detection uncovering unrecorded cash leakage and phantom ledger edits; verifiable digital audit certificates shareable with loan officers at BOI, SMEDAN, DBN, and commercial banks.", styles['TableCell'])],

        [Paragraph("<b>C. Unified National Commerce &amp; Logistics</b>", styles['TableCellBold']),
         Paragraph("11. Central Market Square Subdomain<br/>12. Standalone WhatsApp Storefronts<br/>13. Direct Paystack Settlement<br/>14. State Logistics Rate Matrix<br/>15. Verified Customer Reviews &amp; Trust", styles['TableCell']),
         Paragraph("High-visibility national multi-vendor directory (<code>market.smartbizcoach.com.ng</code>) spanning 4 pillars (Retail, Services, Real Estate, B2B Wholesale); instant branded storefronts (<code>/store/:slug</code>); direct split settlement into vendor bank accounts; 36-state waybill rate calculation and tracking; anti-fraud seller verification seals.", styles['TableCell'])],

        [Paragraph("<b>D. Generative AI Marketing &amp; Creative</b>", styles['TableCellBold']),
         Paragraph("16. AI Brand Builder &amp; Logo Suite<br/>17. Vernacular Copywriter (5 Dialects)<br/>18. Snap-to-Studio 4K Photo Studio<br/>19. Marketing Agent &amp; Broadcast HQ<br/>20. AI Objection Closer &amp; Assistant", styles['TableCell']),
         Paragraph("Automated corporate identity and logo generation; native marketing captions in English, Pidgin, Hausa, Yoruba, and Igbo; instant AI product background replacement for professional catalog imagery; targeted SMS (Termii NGN 6) &amp; WhatsApp broadcasts; conversational sales objection closing.", styles['TableCell'])],

        [Paragraph("<b>E. Capital Linkages &amp; Governance</b>", styles['TableCellBold']),
         Paragraph("21. AI Bankable Business Plan Engine<br/>22. Grant &amp; Capital Matcher<br/>23. CAC Accredited Agent Legal Desk<br/>24. Institutional Executive Portal", styles['TableCell']),
         Paragraph("5-year financial models incorporating NGN inflation, CAPEX/OPEX amortization compliant with BOI &amp; SMEDAN standards; algorithmic federal/state grant discovery; step-by-step CAC incorporation desk; macro analytics console for NYE executive oversight.", styles['TableCell'])],
    ]

    mod_table = Table(modules_data, colWidths=[1.8*inch, 2.3*inch, 3.0*inch])
    mod_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK_EMERALD),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(KeepTogether(mod_table))
    story.append(Spacer(1, 6))

    # Section 4: Partially Free Commercial Framework
    story.append(Paragraph("4. PARTIALLY FREE (HYBRID FREEMIUM) COMMERCIAL FRAMEWORK", styles['SectionHeader']))
    story.append(Paragraph(
        "To guarantee widespread grassroots adoption across Nigerian markets while maintaining sovereign technical sustainability, "
        "SmartBiz Coach operates under an authentic <b>Partially Free (Hybrid Freemium)</b> architecture rather than an unsustainable 100% free claim:",
        styles['BodyCustom']
    ))

    freemium_data = [
        [
            Paragraph("<b>100% FREE CORE OPERATING UTILITIES (LIFETIME 0 CREDITS)</b>", styles['TableCellHeader']),
            Paragraph("<b>MICRO-PRICED ADVANCED AI &amp; COMPUTE (BIZCREDIT WALLET)</b>", styles['TableCellHeader'])
        ],
        [
            Paragraph(
                "- <b>Unlimited POS Day-Book &amp; Cashbook Entries</b> (Cash, Transfer, Credit)<br/>"
                "- <b>Phone Camera Barcode &amp; QR Code Inventory Scanning</b><br/>"
                "- <b>Anti-Theft Apprentice Shift Lock (4-Digit Owner PIN)</b><br/>"
                "- <b>Open-Market Offline PWA Operations</b> (Zero internet data required)<br/>"
                "- <b>Petty Cash, Generator Fuel &amp; Operational Expense Logging</b><br/>"
                "- <b>Daily Automated WhatsApp Profit/Loss Telemetry Summary</b><br/>"
                "- <b>Gbege Book Customer Debtor Tracking &amp; WhatsApp Reminders</b><br/>"
                "- <b>Public Storefront Catalog Listing &amp; WhatsApp Direct Orders</b><br/>"
                "- <b>Basic Market Square Listing on <code>market.smartbizcoach.com.ng</code></b><br/>"
                "- <b>No monthly software lockouts, mandatory license fees, or core POS subscriptions.</b>",
                styles['TableCell']
            ),
            Paragraph(
                "- <b>BOI/SMEDAN 5-Year Bankable Business Plan (PDF):</b> 15 Credits (~NGN 150)<br/>"
                "- <b>Snap-to-Studio 4K AI Product Background Removal:</b> 2 Credits (~NGN 20/photo)<br/>"
                "- <b>AI Brand Builder Kit &amp; Commercial Logo Suite:</b> 10 Credits (~NGN 100)<br/>"
                "- <b>Marketplace VIP Promoted Listing (7-Day Spotlight):</b> 20 Credits (~NGN 200)<br/>"
                "- <b>Automated WhatsApp Sales Recovery &amp; Reminders:</b> 1 Credit (~NGN 10)<br/>"
                "- <b>Marketing Agent Targeted SMS Broadcasts:</b> Billed directly at <b>NGN 6.00 per SMS segment</b> via Termii GSM-7 gateway.",
                styles['TableCell']
            )
        ]
    ]
    free_table = Table(freemium_data, colWidths=[3.5*inch, 3.6*inch])
    free_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), DARK_EMERALD),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor("#0f766e")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,1), (-1,1), LIGHT_BG),
    ]))
    story.append(KeepTogether(free_table))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Table 4.1: Unified BizCredit Wallet Packages for NYE Members</b>", styles['SubSectionHeader']))
    wallet_data = [
        [Paragraph("<b>Package Tier</b>", styles['TableCellHeader']), Paragraph("<b>Cost (NGN) / Credits</b>", styles['TableCellHeader']), Paragraph("<b>Effective Unit Rate</b>", styles['TableCellHeader']), Paragraph("<b>Featured Entitlements &amp; Use Cases</b>", styles['TableCellHeader'])],
        [Paragraph("<b>Micro Pack</b>", styles['TableCellBold']), Paragraph("NGN 500 (50 Credits)", styles['TableCell']), Paragraph("NGN 10.00 / credit", styles['TableCell']), Paragraph("Ideal for new shops; covers 25 photo cleanups or 50 WhatsApp broadcast nudges.", styles['TableCell'])],
        [Paragraph("<b>Starter Pack</b>", styles['TableCellBold']), Paragraph("NGN 1,500 (150 Credits)", styles['TableCell']), Paragraph("NGN 10.00 / credit", styles['TableCell']), Paragraph("Includes 7-day Market Square spotlight boost + 4K photo studio batch.", styles['TableCell'])],
        [Paragraph("<b>Grower Pack</b>", styles['TableCellBold']), Paragraph("NGN 3,500 (450 Credits)", styles['TableCell']), Paragraph("NGN 8.75 / credit", styles['TableCell']), Paragraph("Full BOI business plan + Verified Merchant Trust Seal + multi-item boosts.", styles['TableCell'])],
        [Paragraph("<b>Vendor Pro Pack</b>", styles['TableCellBold']), Paragraph("NGN 7,500 (1,250 Credits)", styles['TableCell']), Paragraph("NGN 7.50 / credit", styles['TableCell']), Paragraph("30-Day VIP marketplace spotlight + high-frequency SMS broadcast campaigns.", styles['TableCell'])],
        [Paragraph("<b>Mogul Pack</b>", styles['TableCellBold']), Paragraph("NGN 15,000 (3,000 Credits)", styles['TableCell']), Paragraph("<b>NGN 6.00 / credit</b>", styles['TableCellBold']), Paragraph("Best value rate; engineered for industrial fabricators, wholesalers, and multi-branch operations.", styles['TableCell'])],
    ]
    wallet_table = Table(wallet_data, colWidths=[1.4*inch, 1.6*inch, 1.3*inch, 2.8*inch])
    wallet_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_EMERALD),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(KeepTogether(wallet_table))
    story.append(Spacer(1, 6))

    # Section 5: The National Youth Engineering & Tech-Innovator Startup Pack
    story.append(Paragraph("5. THE NATIONAL YOUTH ENGINEERING &amp; TECH-INNOVATOR STARTUP PACK (NYE TECH-STARTUP PACK)", styles['SectionHeader']))
    story.append(Paragraph(
        "To accelerate the commercialization of homegrown Nigerian engineering, technical innovations, agro-industrial machinery, and youth "
        "manufacturing, the Parties hereby establish the dedicated <b>\"NYE Tech-Innovators &amp; Engineering Startup Pack\"</b>:",
        styles['BodyCustom']
    ))

    pack_items = [
        "<b>5.1 Target Beneficiaries:</b> Youth fabricators, hardware engineers, clean-energy/solar technicians, agro-machinery developers, and accredited technical innovators within NYE's industrial clusters, including innovators affiliated with national technology incubation hubs, vocational training centres (TVET), and federal engineering institutes.",
        "<b>5.2 Component 1 -- Pre-Funded Onboarding AI BizCredits:</b> An initial startup allocation of <b>150 to 400 BizCredits</b> (valued up to NGN 3,500) credited directly to verified technical beneficiaries upon registration at zero cost, enabling immediate generation of a bank-ready business plan, 4K product photos, and branding suites.",
        "<b>5.3 Component 2 -- Official 'Verified Technical Innovator / NYE Industrial Member' Badge:</b> An institutional trust mark displayed prominently on their storefront and listings across <code>market.smartbizcoach.com.ng</code>, validating engineering provenance and authenticity to nationwide institutional buyers.",
        "<b>5.4 Component 3 -- B2B Wholesale Directory Priority:</b> Direct priority cataloging on the dedicated B2B Wholesale pillar (<code>market.smartbizcoach.com.ng/?tab=B2B</code>) to facilitate bulk supply contracts with commercial off-takers, agricultural cooperatives, and infrastructure projects.",
        "<b>5.5 Component 4 -- Engineering MOQ &amp; Waybill Logistics Structuring:</b> Specialized configuration for Minimum Order Quantities (MOQ), technical specification documents, and state-by-state heavy cargo waybill haulage routing across all 36 States + FCT.",
        "<b>5.6 Component 5 -- Capital Pre-Underwriting &amp; Cryptographic Dossier:</b> Direct generation of verified cryptographic SmartScore audit dossiers (<code>PublicAuditReport</code>) for prioritized submission to the Bank of Industry (BOI) Manufacturing Intervention Fund, SMEDAN matching grants, and commercial development banks.",
        "<b>5.7 Component 6 -- CAC Corporate Legal Formalization Desk:</b> Dedicated desk liaison with accredited Corporate Affairs Commission (CAC) legal agents to assist technical innovators in transitioning from unregistered ventures to incorporated Limited Liability Companies (Ltd) at subsidized statutory rates."
    ]
    for np in pack_items:
        story.append(Paragraph(np, styles['BulletCustom']))

    # Section 6: Roles and Responsibilities
    story.append(Paragraph("6. ROLES AND RESPONSIBILITIES OF THE PARTIES", styles['SectionHeader']))
    story.append(Paragraph("<b>6.1 Responsibilities of SMARTBIZ COACH (Technology Partner):</b>", styles['SubSectionHeader']))
    sbc_roles = [
        "a. <b>Infrastructure &amp; Uptime:</b> Deploy, host, maintain, and support the mobile-first application and PWA with a minimum target uptime of 99.9%, daily encrypted database backups, and SSL transport security.",
        "b. <b>Beneficiary Startup Credit Allocation:</b> Credit all accredited NYE members and verified youth technical innovators with designated onboarding BizCredit allowances upon successful account verification.",
        "c. <b>Badge Architecture:</b> Maintain the cryptographic \"Verified NYE Member\" and \"Verified Technical Innovator\" badge infrastructure on the National Market Square.",
        "d. <b>Training Facilitation:</b> Provide expert curriculum, technical trainers, and operational documentation for co-branded zonal masterclasses, digital trade clinics, and chamber webinars.",
        "e. <b>Trade Mission Support:</b> Deploy digital onboarding and support desks during major NYE exhibitions, industrial summits, and bilateral trade expos.",
        "f. <b>Impact Telemetry Access:</b> Provide NYE leadership with continuous, secure administrative access to the institutional Partner Portal (<code>dashboard/settings</code>) displaying real-time adoption counts, GMV analytics, and regional formalization metrics."
    ]
    for sr in sbc_roles:
        story.append(Paragraph(sr, styles['BulletCustom']))

    story.append(Paragraph("<b>6.2 Responsibilities of NACCIMA YOUTH ENTREPRENEURS (NYE):</b>", styles['SubSectionHeader']))
    nye_roles = [
        "a. <b>Non-Exclusive Institutional Endorsement:</b> Subject to NYE's internal approvals and periodic performance reviews, NYE may recognize SmartBiz Coach as a recommended business operating system, retail bookkeeping application and B2B trade platform for interested youth entrepreneurs. This endorsement is non-exclusive and does not prevent NYE from engaging other technology providers, comparing solutions, or recommending alternatives where appropriate. NYE members shall not be compelled to register, purchase credits, or use paid services as a condition of membership or participation in NYE activities. While core bookkeeping, offline PWA access, and basic storefront listings remain 100% free and voluntary, access to high-compute artificial intelligence tools, VIP marketplace spotlight promotions, and specialized commercial services shall remain subject to the platform's standard micro-priced BizCredit wallet framework.",
        "b. <b>State Chapter Mobilization:</b> Issue formal directives and circulars to all 36 State Chapters, FCT directorate, and sectoral trade groups to adopt the platform and onboard members.",
        "c. <b>Co-Branded Bootcamps:</b> Mobilize members, provide venues, and co-host regional digital formalization masterclasses in collaboration with state chambers of commerce.",
        "d. <b>Strategic Institutional Linkages:</b> Facilitate strategic introductions and bilateral linkages between SmartBiz Coach leadership and key institutional partners, including NACCIMA Senior Chambers, Federal Ministry of Industry, Trade and Investment (FMITI), SMEDAN, Bank of Industry (BOI), and the National Agency for Science and Engineering Infrastructure (NASENI), to jointly advocate for and extend digital empowerment to youth engineering innovators.",
        "e. <b>Joint Grant &amp; Development Proposals:</b> Endorse, co-author, and submit joint proposals to domestic and international funding partners (GIZ, AfDB, World Bank, USAID, UNDP) to secure non-dilutive catalytic funding for nationwide youth enterprise digitization."
    ]
    for nr in nye_roles:
        story.append(Paragraph(nr, styles['BulletCustom']))

    # Section 7: Financial & Transactional Framework (With Platform Split Fee)
    story.append(Paragraph("7. FINANCIAL, TRANSACTIONAL &amp; REVENUE FRAMEWORK", styles['SectionHeader']))
    fin_clauses = [
        "<b>7.1 Zero Liability for NYE Secretariat:</b> This agreement establishes no mandatory subscription fees, operational overheads, or financial indebtedness against the National Secretariat of NACCIMA Youth Entrepreneurs.",
        "<b>7.2 Direct Paystack Settlement &amp; Split-Payment Architecture:</b> Commercial payments processed through the platform's automated payment gateway are settled directly into the vendor's designated Nigerian bank account via Paystack Subaccount automated split-routing (<b>net of standard third-party payment processing fees and platform technology facilitation fees of 1.5% to 2.0%</b> where applicable). Direct peer-to-peer customer settlements (including direct cash and direct WhatsApp orders) attract zero (0%) platform commission. SmartBiz Coach operates on a non-custodial model and holds zero vendor funds in escrow.",
        "<b>7.3 Project Implementation Agreements (PIAs):</b> Where dedicated donor funds, international development grants, or institutional sponsorships are secured under joint NYE - SmartBiz Coach programs, fund allocation, administrative overheads, and project management disbursements shall be governed by separate, mutually executed Project Implementation Agreements (PIAs)."
    ]
    for fc in fin_clauses:
        story.append(Paragraph(fc, styles['BulletCustom']))

    # Section 8: IP & Data Governance
    story.append(Paragraph("8. INTELLECTUAL PROPERTY, TECHNOLOGY &amp; DATA GOVERNANCE", styles['SectionHeader']))
    ip_clauses = [
        "<b>8.1 Technology Ownership:</b> SMARTBIZ COACH retains exclusive, undivided ownership, intellectual property rights, copyright, source code, database architecture, and machine learning models powering <code>smartbizcoach.com.ng</code> and its associated subdomains.",
        "<b>8.2 Nigeria Data Protection Act (NDPA 2023) Compliance:</b> The Parties strictly adhere to the provisions of the NDPA 2023. All merchant financial transactions, debtor books, invoices, customer telephone records, and till entries remain the sole, confidential property of the respective business owner. Commercial records shall not be sold, monetized, or shared with third parties without explicit consent.",
        "<b>8.3 Trademark &amp; Co-Branding License:</b> Each Party grants the other a revocable, non-exclusive, royalty-free license to use their official organizational name, acronym, and logo exclusively for co-branded educational bootcamps, official certificates of completion, and joint grant submissions."
    ]
    for ic in ip_clauses:
        story.append(Paragraph(ic, styles['BulletCustom']))

    # Section 9: Duration & Termination
    story.append(Paragraph("9. DURATION, RENEWAL, AND TERMINATION", styles['SectionHeader']))
    dur_clauses = [
        "<b>9.1 Initial Term:</b> This MOU shall remain in full force and effect for an initial duration of <b>Two (2) Years</b> from October 22, 2026, subject to annual joint performance reviews.",
        "<b>9.2 Automatic Renewal:</b> Upon the conclusion of the initial term, this MOU shall automatically renew for successive one (1) year periods unless either Party provides a thirty (30) day written notice of non-renewal.",
        "<b>9.3 Termination for Convenience:</b> Either Party may terminate this agreement without cause upon giving <b>Thirty (30) Days</b> written notice to the other Party.",
        "<b>9.4 Termination for Cause:</b> Either Party may terminate immediately upon written notice in the event of a material breach of terms, gross misconduct, insolvency, or actions severely detrimental to the other Party's institutional reputation."
    ]
    for dc in dur_clauses:
        story.append(Paragraph(dc, styles['BulletCustom']))

    # Section 10: Dispute Resolution & Governing Law
    story.append(Paragraph("10. DISPUTE RESOLUTION &amp; GOVERNING LAW", styles['SectionHeader']))
    story.append(Paragraph(
        "<b>10.1 Amicable Settlement:</b> Any divergence, dispute, or question arising out of or relating to the interpretation, implementation, "
        "or operation of this MOU shall be settled amicably through good-faith executive consultations between the Founder &amp; Chief Executive "
        "of SmartBiz Coach and the National Coordinator of NYE within <b>Fourteen (14) Days</b> of notification.<br/>"
        "<b>10.2 Governing Law:</b> This MOU shall be governed by, construed, and enforced in accordance with the Laws of the Federal Republic of Nigeria.",
        styles['BodyCustom']
    ))

    # Section 11: Implementation Roadmap & Pilot
    story.append(Paragraph("11. IMPLEMENTATION ROADMAP AND PILOT", styles['SectionHeader']))
    pilot_clauses = [
        "<b>11.1 Joint Implementation Plan:</b> Within thirty (30) days of execution, the Parties shall prepare and approve a written implementation plan identifying activities, timelines, responsible officers, resources, target beneficiaries, training dates, reporting arrangements and deliverables. No State Chapter shall be treated as having accepted additional financial obligations unless separately agreed in writing.",
        "<b>11.2 Pilot First:</b> Before nationwide rollout, the Parties shall conduct a pilot in one to three (1-3) willing NYE State Chapters (recommended: FCT Abuja, Bauchi State, and Lagos/Ogun), subject to written confirmation by the relevant Chapter leadership. The pilot target shall be agreed in the implementation plan; an indicative planning range is 100-300 MSMEs in total, subject to capacity, consent and available resources.",
        "<b>11.3 Review and Scale:</b> The Parties shall review the pilot results, user feedback, service reliability, pricing clarity, data safeguards and adoption barriers before deciding in writing whether and how to scale to additional States or all geopolitical zones. Nationwide rollout shall not be presumed solely from signing this MOU.",
        "<b>11.4 BizCredit Policy Schedule in Implementation Plan:</b> The Parties hereby affirm and document in this implementation framework that <b>BizCredits are non-monetary digital utility tokens used exclusively to access high-compute generative AI, cloud image processing, and marketplace promotions. BizCredits are strictly non-refundable for cash, non-transferable outside the platform, but carry no expiration during active account status and remain fully valid for consumption or during a sixty to ninety (60-90) day data export and transition window upon termination.</b>"
    ]
    for pc in pilot_clauses:
        story.append(Paragraph(pc, styles['BulletCustom']))

    # Section 12: Member Benefits & Pricing Transparency
    story.append(Paragraph("12. MEMBER BENEFITS, PRICING AND TRANSPARENCY", styles['SectionHeader']))
    price_clauses = [
        "<b>12.1 Clear Free and Paid Features:</b> SmartBiz Coach shall provide NYE with a current, plain-language schedule distinguishing (a) core utilities available at no charge (POS day-book, offline PWA, barcode scanner, debt ledger, WhatsApp storefront), (b) features requiring BizCredits (AI business plans, 4K photo studio, branding kits, VIP boosts), and (c) transaction processing and third-party charges, including automated payment gateway split-fees (1.5%-2.0% on gateway checkout), SMS broadcasts (Termii NGN 6/segment), and CAC statutory fees. The schedule in Section 4 shall be disclosed to members before onboarding and updated when prices or entitlements change.",
        "<b>12.2 Voluntary Purchases & BizCredit Token Policy:</b> Individual members are responsible only for charges they knowingly authorize. NYE shall not be liable for members' subscriptions, credit purchases, transactions or debts. No member shall be told that all services are free where advanced services or third-party charges apply. <b>BizCredits are digital utility tokens, non-refundable for cash, but remain valid for consumption or during a 60-90 day data export window upon termination.</b>",
        "<b>12.3 Starter Package:</b> The Parties shall identify in the implementation plan a clearly defined starter package for new NYE members, prioritising essential bookkeeping/cashbook, basic marketplace listing, storefront/direct-order access and basic invoicing where these are available within the free tier. Any additional free credits, discounts or pre-funded allowances must specify the eligible cohort, quantity, value, funding source, allocation date and usage conditions.",
        "<b>12.4 Pricing Changes:</b> Material changes to member pricing or core free-tier entitlements shall be notified to NYE in writing at least thirty (30) days before taking effect for NYE programme participants, except where a shorter period is required by law or an unavoidable third-party change; in that case, prompt notice shall be given."
    ]
    for prc in price_clauses:
        story.append(Paragraph(prc, styles['BulletCustom']))

    # Section 13: State-Level Governance
    story.append(Paragraph("13. STATE-LEVEL GOVERNANCE, VERIFICATION AND MEMBER SUPPORT", styles['SectionHeader']))
    state_clauses = [
        "<b>13.1 Focal Persons:</b> Each participating State Chapter may nominate a State Focal Person and a training/onboarding contact. SmartBiz Coach shall nominate a partnership lead and technical support contact. The names, duties and contact channels shall be recorded in the implementation plan.",
        "<b>13.2 Membership Verification:</b> Before granting a 'Verified NYE Member' badge, SmartBiz Coach shall verify the person's current membership through a process approved by NYE, using only the minimum information necessary. NYE retains authority over confirmation of NYE membership status; SmartBiz Coach is responsible for implementing and maintaining the technical badge system. A badge confirms membership status only and shall not be represented as a guarantee of product quality, solvency, creditworthiness or regulatory approval.",
        "<b>13.3 Technical Innovator Verification:</b> A 'Verified Technical Innovator' badge shall be issued only after a documented verification process proportionate to the claim being made. The badge must not imply engineering certification, product safety approval, intellectual-property ownership or regulatory clearance unless separately verified by a competent authority.",
        "<b>13.4 Support and Complaints:</b> SmartBiz Coach shall publish support channels and reasonable response targets for onboarding, access, billing, data and technical complaints. The Parties shall maintain an escalation path for unresolved complaints and review recurring issues at periodic partnership meetings."
    ]
    for sc in state_clauses:
        story.append(Paragraph(sc, styles['BulletCustom']))

    # Section 14: KPIs & Reporting
    story.append(Paragraph("14. PERFORMANCE INDICATORS AND REPORTING", styles['SectionHeader']))
    kpi_clauses = [
        "<b>14.1 Key Performance Indicators (KPIs):</b> The Parties shall agree baseline values and realistic quarterly and annual targets in the implementation plan. KPIs should include: members onboarded; active users; businesses maintaining digital records; members trained; businesses listed; completed transactions or gross merchandise value; business plans generated; funding applications or referrals made; funding actually secured (reported separately); technical innovators verified; user satisfaction; support resolution times; and State/zone coverage.",
        "<b>14.2 Reporting and Review:</b> SmartBiz Coach shall provide quarterly aggregated reports to NYE and a joint annual impact review. Reports shall distinguish registrations from active usage, referrals from successful funding outcomes, and platform-generated estimates from independently verified outcomes. Reports must not expose identifiable member or customer data unless there is a lawful basis and appropriate authorization."
    ]
    for kc in kpi_clauses:
        story.append(Paragraph(kc, styles['BulletCustom']))

    # Section 15: Data Protection & Security
    story.append(Paragraph("15. DATA PROTECTION, SECURITY AND RESPONSIBLE USE", styles['SectionHeader']))
    dp_clauses = [
        "<b>15.1 Roles and Lawful Processing:</b> Before collecting or sharing personal data under this partnership, the Parties shall document their respective data-protection roles (including whether either acts as data controller or processor for each activity), purposes of processing, lawful basis, categories of data, access rights, retention periods and any approved sharing. Where required, the Parties shall execute a separate data-processing or data-sharing agreement.",
        "<b>15.2 Data Minimisation and Access:</b> Access to member records shall be role-based and limited to authorized personnel for agreed purposes. NYE shall receive aggregated or anonymised impact data by default. Individual-level data shall be shared with NYE only where necessary, lawful and appropriately disclosed/authorised.",
        "<b>15.3 Security and Breach Response:</b> SmartBiz Coach shall maintain appropriate technical and organisational safeguards, access controls, encrypted backups, secure transmission and a documented incident response process. A party becoming aware of a personal-data breach affecting the partnership shall notify the other party without undue delay and cooperate on investigation, mitigation and any legally required notifications.",
        "<b>15.4 Retention, Export and Deletion:</b> Members shall be informed how they can access and export their business records. Upon termination, SmartBiz Coach shall provide a sixty to ninety (60-90) day data export window for member data in a commonly usable format (CSV/JSON/PDF) and thereafter retain, return or securely delete data in accordance with applicable law and NDPA 2023 regulations.",
        "<b>15.5 AI, Credit Scores and Funding Claims:</b> Any SmartScore or alternative credit score is an indicative analytical output only and shall not be described as a guarantee of loan approval, grant eligibility or credit access. The platform shall explain material limitations, provide a channel to dispute or correct inaccurate underlying data, and ensure that funding decisions remain with the relevant funder or lender. No member data shall be used to train or improve AI models for unrelated commercial purposes without a lawful basis and appropriate notice/consent where required."
    ]
    for dc in dp_clauses:
        story.append(Paragraph(dc, styles['BulletCustom']))

    # Section 16: Grants, Brand Use & Exit
    story.append(Paragraph("16. GRANTS, BRAND USE AND EXIT ARRANGEMENTS", styles['SectionHeader']))
    grant_clauses = [
        "<b>16.1 Prior Approval for Joint Proposals:</b> Neither Party shall submit a proposal, make a funding commitment, represent the other Party as a co-applicant, or use the other Party's name/logo in a funding application without prior written approval from an authorised representative. Each funded initiative shall be governed by a signed Project Implementation Agreement (PIA) specifying objectives, budget, eligible costs, disbursement, procurement, staffing, deliverables, reporting, audit, asset ownership, safeguarding and responsibility for unspent funds.",
        "<b>16.2 Branding Approval:</b> Co-branded public communications, certificates and promotional materials shall be submitted to both Parties for written approval before publication. Use of either Party's name or logo outside the agreed purpose requires separate written permission.",
        "<b>16.3 Continuity on Termination & BizCredit Policy:</b> On expiry or termination, the Parties shall cooperate in good faith on an orderly transition. SmartBiz Coach shall provide a sixty to ninety (60-90) day data export window for members in a standard CSV/JSON format. <b>Unused prepaid BizCredits are digital utility tokens, non-refundable for cash, but remain valid for consumption during this 60-90 day data export window for export, reporting, and fulfillment services.</b> Direct merchant banking and Paystack settlement channels shall continue uninterrupted for all pending customer deliveries.",
        "<b>16.4 Non-Exclusivity:</b> Nothing in this MOU creates an exclusive technology, procurement, funding or service relationship. Each Party may collaborate with other organisations, provided it does not misuse the other Party's confidential information or intellectual property.",
        "<b>16.5 Legal Review and Precedence:</b> This integrated instrument is intended to clarify operational safeguards and should be reviewed by authorised representatives and legal advisers of both Parties before signature. If any provision of this section conflicts with another provision of the MOU, the Parties shall resolve the inconsistency in writing before execution; no change shall be effective unless approved by both Parties."
    ]
    for gc in grant_clauses:
        story.append(Paragraph(gc, styles['BulletCustom']))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>IN WITNESS WHEREOF</b>, the Parties hereto have caused this Memorandum of Understanding to be duly executed "
        "by their authorized legal representatives on the day and year first written above.",
        styles['BodyCustomBold']
    ))
    story.append(Spacer(1, 8))

    # Signatures Table (Side by Side)
    sig_cell_sbc = [
        Paragraph("<b>SIGNED FOR AND ON BEHALF OF FIRST PART:</b><br/><b>SMARTBIZ COACH</b>", styles['TableCellBold']),
        Spacer(1, 20),
        Paragraph("____________________________________________", styles['TableCell']),
        Paragraph("<b>ZACHARIAH MESHACH</b><br/>Founder &amp; Chief Executive, SmartBiz Coach<br/>Date: ________________________", styles['TableCell']),
        Spacer(1, 10),
        Paragraph("<b>In the presence of (Witness):</b>", styles['TableCellBold']),
        Spacer(1, 14),
        Paragraph("Signature: __________________________________", styles['TableCell']),
        Paragraph("Name: ______________________________________<br/>Designation: ________________________________<br/>Date: ______________________________________", styles['TableCell']),
    ]

    sig_cell_nye = [
        Paragraph("<b>SIGNED FOR AND ON BEHALF OF SECOND PART:</b><br/><b>NACCIMA YOUTH ENTREPRENEURS (NYE)</b>", styles['TableCellBold']),
        Spacer(1, 20),
        Paragraph("____________________________________________", styles['TableCell']),
        Paragraph("<b>AMB. DR. SAMEERA ABUBAKAR ABDULLAHI</b><br/>National Coordinator, NACCIMA Youth Entrepreneurs (NYE)<br/>Date: ________________________", styles['TableCell']),
        Spacer(1, 10),
        Paragraph("<b>In the presence of (Witness):</b>", styles['TableCellBold']),
        Spacer(1, 14),
        Paragraph("Signature: __________________________________", styles['TableCell']),
        Paragraph("Name: ______________________________________<br/>Designation: ________________________________<br/>Date: ______________________________________", styles['TableCell']),
    ]

    sig_table = Table([[sig_cell_sbc, sig_cell_nye]], colWidths=[3.5*inch, 3.5*inch])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    
    story.append(KeepTogether(sig_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at {filename}")

if __name__ == "__main__":
    build_pdf()
