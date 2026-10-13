"""
Voice POS engine for Nigerian MSMEs.

Pipeline (two AI steps + deterministic safety net):
  1. TRANSCRIBE  - audio -> text in the language spoken (Flash model, temperature 0)
  2. EXTRACT     - text  -> structured sales/expenses JSON (Flash model, temperature 0)
  3. VALIDATE    - server-side sanity checks, catalog matching, warnings
  4. CONFIRM     - merchant reviews/edits, only then are rows written to the book

Nothing is ever written during preview, and the AI is never allowed to silently
fall back to canned/fake data (see gemini_utils strict mode).
"""
import base64
import difflib
import re
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import permissions, status, views
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import DailyExpense, DailySale, Product

MAX_AUDIO_BYTES = 12 * 1024 * 1024
MIN_AUDIO_BYTES = 1500
MAX_AMOUNT = Decimal('100000000')   # 100m Naira hard ceiling per line
WARN_AMOUNT = Decimal('5000000')    # 5m Naira -> ask merchant to double check
MAX_QTY = 10000

LANGUAGE_HINTS = {
    'auto': 'Nigerian English, Nigerian Pidgin, Hausa, Yoruba or Igbo (possibly mixed)',
    'english': 'Nigerian English',
    'pidgin': 'Nigerian Pidgin English',
    'hausa': 'Hausa',
    'yoruba': 'Yoruba',
    'igbo': 'Igbo',
}

VALID_EXPENSE_CATS = ['FUEL_GEN', 'LOGISTICS', 'RENT_BILLS', 'PACKAGING', 'PERSONAL', 'STAFF', 'OTHER']

TRANSCRIBE_PROMPT = """You are a speech-to-text engine for a Nigerian shop-owner's voice notes.
The speaker is a market trader / small business owner. Expected language: {lang}.
Transcribe EXACTLY what is said, in the language it was spoken. Do NOT translate and do NOT summarise.
Write Hausa with ɗ, ƙ, ɓ where appropriate; write Yoruba and Igbo with their usual diacritics where you are confident.
Keep every number, price, quantity, product name, service name and person name. Keep numbers as spoken (words or digits).
If there is only silence, noise or nothing intelligible, output exactly: [UNCLEAR]
Output ONLY the transcript text."""

EXTRACT_PROMPT = """You are the bookkeeping brain of a Nigerian POS / daily cashbook app for market traders, shop owners and service providers.
Read the transcript below (it may be Nigerian English, Pidgin, Hausa, Yoruba, Igbo, or a mix) and extract EVERY sale/service rendered and EVERY business expense.
Spoken-language hint: {lang}.

OUTPUT: one JSON object only, exactly this shape:
{{
  "detected_language": "English|Pidgin|Hausa|Yoruba|Igbo|Mixed",
  "english_summary": "one short sentence in English",
  "sales": [{{"item_name": "", "product_type": "PHYSICAL|SERVICE", "quantity": 1, "unit_price": 0, "total_amount": 0, "payment_method": "CASH|TRANSFER|CREDIT", "customer_name": "", "is_debt": false}}],
  "expenses": [{{"title": "", "category": "FUEL_GEN|LOGISTICS|RENT_BILLS|PACKAGING|PERSONAL|STAFF|OTHER", "amount": 0, "payment_method": "CASH|TRANSFER"}}]
}}

RULES
- Amounts are plain numbers in Naira (no symbols/commas). "5k"/"five k" = 5000. "2.5k" = 2500. "bob" = naira. kobo is negligible.
- Price wording: "N items for X" = X is the TOTAL. "each", "one one", "per", "kowanne", "ɗaya-ɗaya", "kọọkan", "otu" = X is the UNIT price. Always make total_amount = unit_price x quantity.
- If the speaker corrects themselves ("no wait", "sorry", "abeg ignore"), use the final value.
- Services (photocopy, printing, braiding, tailoring, charging, repairs, delivery, hair, laundry, POS withdrawal charge) => product_type SERVICE. Goods you hold in stock => PHYSICAL.
- Keep item_name short, clear, Title Case, in English where there is a common English name (e.g. "Photocopy (Black & White)", "Bag of Rice", "Pure Water (Sachet)").
- payment_method: CASH by default. "transfer", "POS", "gbe transfer", "an tura", "fi ranṣẹ", "zipu" => TRANSFER. Customer did not pay / owes / "on credit" => CREDIT and is_debt true.
- Customer name only if actually said; else "".
- Expenses are money the owner SPENT (bought fuel, paid rent, paid staff, transport, packaging, airtime for business). Money the owner collected is a SALE.
- Do NOT invent anything. If an amount was not said, use 0 for it and the app will ask.
- If nothing sale/expense related was said, return empty arrays.

NUMBER WORDS (use these to read spoken amounts)
Hausa: ɗaya/daya 1, biyu 2, uku 3, huɗu 4, biyar 5, shida 6, bakwai 7, takwas 8, tara 9, goma 10, ashirin 20, talatin 30, arba'in 40, hamsin 50, sittin 60, saba'in 70, tamanin 80, casa'in 90, ɗari/dari 100, ɗari biyu 200, ɗari biyar 500, dubu 1000, dubu biyu 2000, dubu goma 10000, dubu ɗari 100000, miliyan 1000000.
Yoruba: ọkan/kan 1, meji 2, mẹta/meta 3, mẹrin/merin 4, marun 5, mẹfa/mefa 6, meje 7, mẹjọ/mejo 8, mesan 9, mẹwa/mewa 10, ogun 20, ọgbọn/ogbon 30, ogoji 40, aadọta/aadota 50, ọgọta/ogota 60, aadọrin 70, ọgọrin 80, aadọrun 90, ọgọrun/ogorun 100, igba 200, ọgọrun-un mẹta/odunrun 300, irinwó/irinwo 400, ẹgbẹta/egbeta 600, ẹgbẹrun/egberun 1000, ẹgbẹrun meji/egbeji 2000, ẹgbẹrun marun 5000, ẹgbẹrun mẹwa 10000.
Igbo: otu 1, abụọ/abuo 2, atọ/ato 3, anọ/ano 4, ise 5, isii 6, asaa 7, asatọ/asato 8, itoolu 9, iri 10, iri abụọ 20, iri atọ 30, iri anọ 40, iri ise 50, narị/nari 100, narị abụọ/nari abuo 200, narị ato 300, narị ise 500, puku 1000, puku abụọ 2000, puku ise 5000, puku iri 10000, nde 1000000 (miliọn).
Pidgin/English: "two hundred", "tow tausand", "fifty naira", "one k", "ten k".

KEY VERBS / WORDS
Hausa: sayar/sayarwa/mun sayar/na sayar = sold; saya/na saya = bought; yi/na yi/mun yi = did/made (service); kuɗi = money; bashi = debt; ya biya/an biya = paid; ba a biya ba = unpaid; man fetur/fetur = fuel; wuta = electricity/NEPA; haya = rent; albashi = salary.
Yoruba: ta/mo ta = sold; ra/mo ra = bought; mo se/mo ṣe = I did/made (service); owó = money; gbese/gbèsè = debt; san/sanwo = paid; ko ti san = not yet paid; epo = fuel/petrol; owo ile = rent; owo osu = salary; ina = light/NEPA.
Igbo: ree/m rere/anyị rere = sold; zụta/m zụtara = bought; m mere/emere = I did/made (service); ego = money; ji ụgwọ/ugwo = owes/debt; kwụọ/akwụọla = paid; mmanụ/mmanu = fuel; ụgwọ ụlọ = rent; ụgwọ ọrụ = salary.
Pidgin: "I sell", "I make", "na ... I collect", "e never pay", "e owe me", "dem transfer", "I buy fuel", "I pay NEPA".

WORKED EXAMPLES
1) "I make photocopies black and white for 200 Naira" ->
   sales:[{{"item_name":"Photocopy (Black & White)","product_type":"SERVICE","quantity":1,"unit_price":200,"total_amount":200,"payment_method":"CASH","customer_name":"","is_debt":false}}]
2) "Na 2 bag of rice I sell 180,000 cash, then I buy fuel 2,500" ->
   sales:[{{"item_name":"Bag of Rice","product_type":"PHYSICAL","quantity":2,"unit_price":90000,"total_amount":180000,"payment_method":"CASH","customer_name":"","is_debt":false}}]
   expenses:[{{"title":"Generator Fuel","category":"FUEL_GEN","amount":2500,"payment_method":"CASH"}}]
3) "Mun sayar da buhun shinkafa biyu na dubu ɗari da tamanin, Musa ya ɗauka bashi" ->
   sales:[{{"item_name":"Bag of Rice","product_type":"PHYSICAL","quantity":2,"unit_price":90000,"total_amount":180000,"payment_method":"CREDIT","customer_name":"Musa","is_debt":true}}]
4) "Mo se photocopy fun igba naira, mo tun ta omi pure water marun ni ọgọrun-un meji" ->
   sales:[{{"item_name":"Photocopy (Black & White)","product_type":"SERVICE","quantity":1,"unit_price":200,"total_amount":200,"payment_method":"CASH","customer_name":"","is_debt":false}},
          {{"item_name":"Pure Water (Sachet)","product_type":"PHYSICAL","quantity":5,"unit_price":40,"total_amount":200,"payment_method":"CASH","customer_name":"","is_debt":false}}]
5) "M mere photocopy na narị abụọ naira, m rere akwa puku abụọ, Ada ji ụgwọ" ->
   sales:[{{"item_name":"Photocopy (Black & White)","product_type":"SERVICE","quantity":1,"unit_price":200,"total_amount":200,"payment_method":"CASH","customer_name":"","is_debt":false}},
          {{"item_name":"Fabric","product_type":"PHYSICAL","quantity":1,"unit_price":2000,"total_amount":2000,"payment_method":"CREDIT","customer_name":"Ada","is_debt":true}}]
6) "Na saya man fetur na dubu biyu da ɗari biyar, na biya mai aiki dubu biyar" ->
   expenses:[{{"title":"Generator Fuel","category":"FUEL_GEN","amount":2500,"payment_method":"CASH"}},{{"title":"Staff Pay","category":"STAFF","amount":5000,"payment_method":"CASH"}}]

TRANSCRIPT:
\"\"\"{transcript}\"\"\"
"""


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def _num(value, default=Decimal('0')):
    if value is None or value == '':
        return default
    try:
        if isinstance(value, str):
            value = re.sub(r'[^\d.\-]', '', value.replace(',', '')) or '0'
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return default


def _norm_name(name):
    return re.sub(r'[^a-z0-9 ]', '', (name or '').lower()).strip()


def normalize_mime(raw_mime):
    raw = (raw_mime or '').lower()
    if 'mp4' in raw or 'm4a' in raw or 'aac' in raw:
        return 'audio/mp4'
    if 'wav' in raw:
        return 'audio/wav'
    if 'mp3' in raw or 'mpeg' in raw:
        return 'audio/mp3'
    if 'ogg' in raw:
        return 'audio/ogg'
    return 'audio/webm'


def find_catalog_match(products, name):
    """Fuzzy match a spoken item to the merchant's existing catalog. Returns (product, score)."""
    target = _norm_name(name)
    if not target:
        return None, 0.0
    best, best_score = None, 0.0
    target_tokens = set(target.split())
    for p in products:
        cand = _norm_name(p.name)
        if not cand:
            continue
        score = difflib.SequenceMatcher(None, target, cand).ratio()
        cand_tokens = set(cand.split())
        if target_tokens and cand_tokens and (target_tokens <= cand_tokens or cand_tokens <= target_tokens):
            score = max(score, 0.88)
        if score > best_score:
            best, best_score = p, score
    if best_score >= 0.82:
        return best, round(best_score, 2)
    return None, round(best_score, 2)


def validate_payload(sales_in, expenses_in, products=None):
    """Clean AI/client rows into trustworthy rows + human-readable warnings."""
    products = products or []
    warnings, sales, expenses = [], [], []

    for idx, s in enumerate(sales_in or []):
        if not isinstance(s, dict):
            continue
        name = re.sub(r'\s+', ' ', str(s.get('item_name') or '').strip())[:120]
        qty = int(max(1, min(MAX_QTY, _num(s.get('quantity'), Decimal('1')))))
        unit = _num(s.get('unit_price'))
        total = _num(s.get('total_amount'))
        if unit <= 0 and total > 0:
            unit = (total / qty).quantize(Decimal('0.01'))
        if total <= 0 and unit > 0:
            total = (unit * qty).quantize(Decimal('0.01'))
        elif unit > 0 and abs(unit * qty - total) > max(Decimal('1'), total * Decimal('0.02')):
            total = (unit * qty).quantize(Decimal('0.01'))   # keep unit x qty = total
        pm = str(s.get('payment_method') or 'CASH').upper()
        pm = pm if pm in ('CASH', 'TRANSFER', 'CREDIT') else 'CASH'
        is_debt = bool(s.get('is_debt')) or pm == 'CREDIT'
        if is_debt:
            pm = 'CREDIT'
        ptype = str(s.get('product_type') or 'PHYSICAL').upper()
        ptype = ptype if ptype in ('PHYSICAL', 'SERVICE') else 'PHYSICAL'
        customer = str(s.get('customer_name') or '').strip()[:120]

        issues = []
        if not name:
            issues.append('Missing item name')
        if total <= 0:
            issues.append('Missing price - please enter the amount')
        if total > MAX_AMOUNT:
            issues.append('Amount is too large - please check')
            total = Decimal('0')
        elif total >= WARN_AMOUNT:
            issues.append('Very large amount - please double check')
        if is_debt and not customer:
            issues.append('Who owes you? Add the customer name')

        match, score = find_catalog_match(products, name) if name else (None, 0.0)
        sales.append({
            'item_name': name,
            'product_type': ptype,
            'quantity': qty,
            'unit_price': float(unit),
            'total_amount': float(total),
            'payment_method': pm,
            'customer_name': customer,
            'is_debt': is_debt,
            'matched_product_id': match.id if match else None,
            'matched_product_name': match.name if match else None,
            'is_new_item': match is None,
            'issues': issues,
        })
        for i in issues:
            warnings.append(f"Sale {idx + 1} ({name or 'unnamed'}): {i}")

    for idx, e in enumerate(expenses_in or []):
        if not isinstance(e, dict):
            continue
        title = re.sub(r'\s+', ' ', str(e.get('title') or '').strip())[:120] or 'Expense'
        amt = _num(e.get('amount'))
        cat = str(e.get('category') or 'OTHER').upper()
        cat = cat if cat in VALID_EXPENSE_CATS else 'OTHER'
        pm = str(e.get('payment_method') or 'CASH').upper()
        pm = 'TRANSFER' if pm == 'TRANSFER' else 'CASH'
        issues = []
        if amt <= 0:
            issues.append('Missing amount - please enter it')
        if amt > MAX_AMOUNT:
            issues.append('Amount is too large - please check')
            amt = Decimal('0')
        elif amt >= WARN_AMOUNT:
            issues.append('Very large amount - please double check')
        expenses.append({
            'title': title, 'category': cat, 'amount': float(amt),
            'payment_method': pm, 'issues': issues,
        })
        for i in issues:
            warnings.append(f"Expense {idx + 1} ({title}): {i}")

    return sales, expenses, warnings


def _brand_for(user):
    from brand.models import BrandIdentity
    brand = BrandIdentity.objects.filter(user=user).first()
    if not brand:
        brand = BrandIdentity.objects.create(
            user=user,
            business_name=getattr(user, 'business_name', '') or getattr(user, 'username', '') or 'My Business',
        )
    return brand


# ----------------------------------------------------------------------------
# Views
# ----------------------------------------------------------------------------
class VoicePOSIngestView(views.APIView):
    """
    STEP 1 - PREVIEW. Takes audio (multipart 'audio') or typed text ('text_transcript'),
    optional 'language' hint (auto|english|pidgin|hausa|yoruba|igbo).
    Returns the transcript and structured rows for the merchant to review. Saves NOTHING.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        from smartbiz_backend import gemini_utils
        from smartbiz_backend.gemini_utils import GeminiUnavailableError

        lang_key = str(request.data.get('language') or 'auto').lower()
        lang = LANGUAGE_HINTS.get(lang_key, LANGUAGE_HINTS['auto'])

        audio_file = request.FILES.get('audio')
        audio_b64 = request.data.get('audio_base64')
        text_in = (request.data.get('text_transcript') or '').strip()
        mime_type = normalize_mime(request.data.get('mimeType'))

        try:
            if audio_file:
                raw = audio_file.read()
                mime_type = normalize_mime(audio_file.content_type)
                if len(raw) > MAX_AUDIO_BYTES:
                    return Response({'error': 'Recording is too long. Please record a shorter note (under 2 minutes).'}, status=413)
                if len(raw) < MIN_AUDIO_BYTES:
                    return Response({'error': 'Recording was too short. Hold the mic and speak, then tap again to finish.', 'code': 'too_short'}, status=422)
                audio_b64 = base64.b64encode(raw).decode('utf-8')

            if audio_b64 and not text_in:
                transcript = gemini_utils.transcribe_audio_strict(
                    audio_b64, mime_type, TRANSCRIBE_PROMPT.format(lang=lang))
            else:
                transcript = text_in

            if not transcript or transcript.strip().upper().startswith('[UNCLEAR]'):
                return Response({
                    'error': "I couldn't hear anything clear. Please speak closer to the phone in a quieter place, or type it instead.",
                    'code': 'unclear'}, status=422)

            parsed = gemini_utils.extract_json_strict(
                EXTRACT_PROMPT.format(lang=lang, transcript=transcript.replace('"""', "'''")))

            brand = _brand_for(request.user)
            products = list(Product.objects.filter(brand=brand))
            sales, expenses, warnings = validate_payload(
                parsed.get('sales'), parsed.get('expenses'), products)

            if not sales and not expenses:
                return Response({
                    'error': "I heard you, but found no sale or expense. Try: \"I sold 2 bags of rice for 180,000 cash\".",
                    'transcript': transcript, 'code': 'nothing_found'}, status=422)

            return Response({
                'success': True,
                'status': 'preview',
                'transcript': transcript,
                'english_summary': str(parsed.get('english_summary') or '')[:300],
                'detected_language': str(parsed.get('detected_language') or 'Mixed'),
                'sales': sales,
                'expenses': expenses,
                'warnings': warnings,
                'needs_review': bool(warnings),
            })
        except GeminiUnavailableError as exc:
            print(f'[VoicePOS] AI unavailable: {exc}')
            return Response({
                'error': 'The AI is busy right now. Please try again in a moment, or type your sales instead.',
                'code': 'ai_unavailable'}, status=503)
        except (ValueError, KeyError) as exc:
            print(f'[VoicePOS] bad AI output: {exc}')
            return Response({
                'error': "I couldn't understand that clearly. Please try again, speaking a bit slower.",
                'code': 'bad_output'}, status=502)
        except Exception as exc:  # noqa
            print(f'[VoicePOS] unexpected error: {exc}')
            return Response({'error': 'Something went wrong. Please try again.', 'code': 'server_error'}, status=500)


class VoicePOSConfirmView(views.APIView):
    """
    STEP 2 - CONFIRM. Accepts the (possibly merchant-edited) rows from the preview and writes them.
    Re-validates everything server-side; never trusts the client.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        brand = _brand_for(request.user)
        products = list(Product.objects.filter(brand=brand))
        sales, expenses, _warnings = validate_payload(
            request.data.get('sales'), request.data.get('expenses'), products)

        blocking = [
            f"{r.get('item_name') or r.get('title')}: {i}"
            for r in (sales + expenses) for i in r['issues']
            if 'Missing' in i or 'too large' in i
        ]
        if blocking:
            return Response({'error': 'Please fix: ' + '; '.join(blocking)}, status=400)
        if not sales and not expenses:
            return Response({'error': 'Nothing to save.'}, status=400)

        transcript = str(request.data.get('transcript') or '')[:80]
        lang = str(request.data.get('detected_language') or 'Mixed')[:30]
        note = f"Voice POS ({lang}): {transcript}"

        created_sales, created_expenses, new_items, debts = [], [], [], []
        with transaction.atomic():
            for s in sales:
                product = None
                if s.get('matched_product_id'):
                    product = next((p for p in products if p.id == s['matched_product_id']), None)
                if product is None:
                    product = Product.objects.create(
                        brand=brand,
                        name=s['item_name'],
                        description='Added automatically from a voice note',
                        price=Decimal(str(s['unit_price'])),
                        product_type=s['product_type'],
                        # Never invent stock: services are unlimited, new goods start untracked (0, no alerts)
                        stock_count=999 if s['product_type'] == 'SERVICE' else 0,
                        low_stock_threshold=0,
                        category='Services' if s['product_type'] == 'SERVICE' else 'General Merchandise',
                        is_public=False,  # merchant must approve before it shows on the storefront
                    )
                    products.append(product)
                    new_items.append({'id': product.id, 'name': product.name,
                                      'product_type': product.product_type, 'price': float(product.price)})
                elif product.product_type == 'PHYSICAL' and product.stock_count > 0:
                    product.stock_count = max(0, product.stock_count - s['quantity'])
                    product.save(update_fields=['stock_count'])

                sale = DailySale.objects.create(
                    user=request.user, product=product, item_name=s['item_name'],
                    quantity=s['quantity'], unit_price=Decimal(str(s['unit_price'])),
                    cost_price=product.cost_price or Decimal('0'),
                    total_amount=Decimal(str(s['total_amount'])),
                    payment_method=s['payment_method'], customer_name=s['customer_name'],
                    is_debt=s['is_debt'], notes=note,
                )
                created_sales.append({'id': sale.id, 'item_name': sale.item_name,
                                      'total_amount': float(sale.total_amount),
                                      'payment_method': sale.payment_method})
                if s['is_debt']:
                    debts.append({'name': s['customer_name'] or 'Walk-in Customer',
                                  'amount': s['total_amount'],
                                  'itemsBought': f"{s['item_name']} (Qty: {s['quantity']})"})

            for e in expenses:
                exp = DailyExpense.objects.create(
                    user=request.user, title=e['title'], category=e['category'],
                    amount=Decimal(str(e['amount'])), payment_method=e['payment_method'], notes=note)
                created_expenses.append({'id': exp.id, 'title': exp.title, 'amount': float(exp.amount)})

        total_in = sum(x['total_amount'] for x in created_sales)
        total_out = sum(x['amount'] for x in created_expenses)
        parts = []
        if created_sales:
            parts.append(f"{len(created_sales)} sale(s) = ₦{total_in:,.0f}")
        if created_expenses:
            parts.append(f"{len(created_expenses)} expense(s) = ₦{total_out:,.0f}")
        return Response({
            'success': True,
            'summary': 'Saved: ' + ' • '.join(parts),
            'sales_logged': created_sales,
            'expenses_logged': created_expenses,
            'new_products_created': [i['name'] for i in new_items],
            'new_items': new_items,
            'debts': debts,
        }, status=status.HTTP_201_CREATED)
