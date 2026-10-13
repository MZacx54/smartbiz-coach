"""
Smart Catalog & Barcode Intelligence Engine.

Capabilities:
1. Barcode Lookup & Auto-fill:
   - Primary: Open Food Facts API (fast, zero cost, global & African packaged FMCG)
   - Secondary / African Local: Gemini Flash Multimodal Knowledge lookup for retail barcodes
2. AI Snap-to-List / Visual Shelf Scanner:
   - Merchant snaps a photo of a shelf, box carton, or retail packaging
   - Gemini Vision identifies products, calculates counts, extracts names & suggested prices
3. Auto-Stock Restock via Supplier Waybill / Receipt OCR:
   - Confirms line items into actual inventory stock levels and updates cost prices (COGS).
"""

import json
import logging
import urllib.request
import urllib.parse
from decimal import Decimal
from rest_framework import views, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from smartbiz_backend import gemini_utils
from .models import Product
from brand.models import BrandIdentity

logger = logging.getLogger(__name__)


def query_open_food_facts(barcode: str):
    """Queries Open Food Facts v2 API for instant packaged goods metadata."""
    clean_code = str(barcode).strip()
    if not clean_code:
        return None
    url = f"https://world.openfoodfacts.org/api/v2/product/{clean_code}.json"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SmartBizCoach-NG/1.0 (https://smartbizcoach.ng; info@smartbizcoach.ng)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get("status") == 1 and data.get("product"):
                p = data["product"]
                name = p.get("product_name") or p.get("product_name_en") or p.get("generic_name") or ""
                brand = p.get("brands") or ""
                img = p.get("image_front_url") or p.get("image_url") or ""
                categories = p.get("categories", "")
                
                # Derive clean category
                cat = "Food & Groceries"
                cat_lower = (categories + " " + name).lower()
                if any(k in cat_lower for k in ["drink", "juice", "water", "beverage", "soda", "wine", "beer"]):
                    cat = "Beverages & Drinks"
                elif any(k in cat_lower for k in ["soap", "shampoo", "cream", "lotion", "cosmetic", "hair"]):
                    cat = "Personal Care & Beauty"
                elif any(k in cat_lower for k in ["detergent", "bleach", "cleaner", "tissue"]):
                    cat = "Household & Cleaning"

                full_name = f"{brand} {name}".strip() if brand and brand.lower() not in name.lower() else name
                if full_name:
                    return {
                        "name": full_name.title(),
                        "brand": brand.title() if brand else "",
                        "category": cat,
                        "description": f"Packaged retail item. {p.get('quantity', '')}".strip(),
                        "image_url": img,
                        "source": "Open Food Facts Global Catalog"
                    }
    except Exception as e:
        logger.info(f"OpenFoodFacts lookup skipped or timed out: {e}")
    return None


def query_gemini_barcode_knowledge(barcode: str):
    """Leverages Gemini Flash to recognize commercial retail barcodes and local African products."""
    prompt = f"""
    You are an expert Nigerian and African retail trade inventory database.
    A merchant just scanned this product barcode / SKU number: "{barcode}".

    Task:
    Identify what commercial product, brand, or packaged good corresponds to this barcode or code sequence.
    If it corresponds to a well-known retail brand (e.g., Unilever, Nestlé, Indomie/Dufil, Dangote, Coca-Cola, Golden Terra, PZ Cussons, Promasidor, Reckitt, Chi, or consumer tech), identify the exact or closest product.
    If the barcode is generic or unrecognized, deduce the probable product category and suggest a clean, standardized title for a Nigerian MSME shop inventory.

    Respond STRICTLY with valid JSON:
    {{
      "found": true,
      "name": "Standard Product Name (e.g. Indomie Instant Noodles Onion Chicken 70g)",
      "brand": "Brand Name (e.g. Indomie)",
      "category": "Food & Groceries / Beverages / Personal Care / Electronics / Fashion / Stationery / Other",
      "description": "Clear 1-sentence product description",
      "suggested_retail_price": 350,
      "suggested_cost_price": 280
    }}
    """
    try:
        data = gemini_utils.generate_json_content(prompt)
        if isinstance(data, dict) and data.get("name"):
            return {
                "name": str(data.get("name")).strip(),
                "brand": str(data.get("brand") or "").strip(),
                "category": str(data.get("category") or "General Merchandise").strip(),
                "description": str(data.get("description") or "").strip(),
                "suggested_retail_price": float(data.get("suggested_retail_price") or 0.0),
                "suggested_cost_price": float(data.get("suggested_cost_price") or 0.0),
                "source": "SmartBiz AI Barcode Engine"
            }
    except Exception as e:
        logger.warning(f"Gemini barcode resolution failed: {e}")
    return None


class BarcodeLookupAutoFillView(views.APIView):
    """
    Looks up any scanned barcode / SKU number.
    Returns rich product details (Name, Brand, Category, Image, Suggested Prices)
    so the merchant's catalog is filled in effortlessly in under a second!
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        barcode = str(request.data.get("barcode") or request.data.get("sku") or "").strip()
        if not barcode:
            return Response({"error": "Barcode is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. First check if it already exists in the merchant's personal inventory
        brand = BrandIdentity.objects.filter(user=request.user).first()
        existing = None
        if brand:
            existing = Product.objects.filter(
                brand=brand
            ).filter(sku__iexact=barcode).first()

        if existing:
            return Response({
                "found": True,
                "already_in_catalog": True,
                "product_id": existing.id,
                "name": existing.name,
                "category": existing.category,
                "price": float(existing.price),
                "cost_price": float(existing.cost_price or 0.0),
                "stock_count": existing.stock_count,
                "image_url": existing.image_url or "",
                "description": existing.description or "",
                "sku": existing.sku,
                "source": "Your Existing Store Catalog"
            }, status=status.HTTP_200_OK)

        # 2. Try global open retail database
        info = query_open_food_facts(barcode)

        # 3. If not in open food facts, query AI barcode knowledge engine
        if not info:
            info = query_gemini_barcode_knowledge(barcode)

        if info:
            return Response({
                "found": True,
                "already_in_catalog": False,
                "barcode": barcode,
                "sku": barcode,
                "name": info.get("name"),
                "brand": info.get("brand", ""),
                "category": info.get("category", "General Merchandise"),
                "description": info.get("description", ""),
                "image_url": info.get("image_url", ""),
                "suggested_retail_price": info.get("suggested_retail_price", 0.0),
                "suggested_cost_price": info.get("suggested_cost_price", 0.0),
                "source": info.get("source", "Ecosystem Catalog")
            }, status=status.HTTP_200_OK)

        # 4. Fallback if unrecognized code
        return Response({
            "found": False,
            "already_in_catalog": False,
            "barcode": barcode,
            "sku": barcode,
            "name": "",
            "category": "General Merchandise",
            "message": f"Barcode {barcode} scanned. Enter the item name once to save it to your catalog."
        }, status=status.HTTP_200_OK)


class VisualShelfScannerView(views.APIView):
    """
    AI Snap-a-Shelf Bulk Ingestion:
    Merchants snap a photo of a shelf, carton, or shop display.
    Multimodal AI identifies all visible products, counts quantities, and suggests catalog entries.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        import base64

        img_file = request.FILES.get('image')
        img_b64 = request.data.get('image_base64') or request.data.get('image')
        raw_mime = request.data.get('mimeType') or 'image/jpeg'

        if img_file:
            raw_bytes = img_file.read()
            img_b64 = base64.b64encode(raw_bytes).decode('utf-8')
            raw_mime = img_file.content_type or 'image/jpeg'

        if not img_b64:
            return Response({"error": "Please provide an image of the shelf or product batch."}, status=status.HTTP_400_BAD_REQUEST)

        mime_type = 'image/png' if 'png' in raw_mime.lower() else 'image/jpeg'

        prompt = """
        You are an advanced retail stocktaking & computer vision AI for African merchants and retail shops.
        Analyze this photo of a shop shelf, inventory carton, display rack, or batch of products.
        Identify EVERY distinct commercial product visible:
        - Product name with brand and size/pack details where visible (e.g., "Golden Terra Soya Oil 1L", "Milo Tin 500g", "Peak Evaporated Milk 160g")
        - Estimated visible count/quantity on the shelf
        - Suggested Category (Food & Groceries, Beverages, Beauty, Household, Tech, Fashion, etc.)
        - Recommended Retail Selling Price in Nigerian Naira (NGN)
        - Recommended Wholesale Cost Price in Nigerian Naira (NGN)

        Respond STRICTLY with valid JSON:
        {
          "batch_title": "Shelf / Display Overview summary",
          "total_items_detected": 12,
          "items": [
            {
              "name": "Standard Product Name",
              "category": "Category",
              "estimated_stock": 6,
              "suggested_selling_price": 1200,
              "suggested_cost_price": 950
            }
          ]
        }
        """

        try:
            parsed = gemini_utils.generate_json_content(prompt, image_base64=img_b64, mime_type=mime_type)
            items = parsed.get("items", []) if isinstance(parsed, dict) else []
            return Response({
                "success": True,
                "batch_title": parsed.get("batch_title", "Shelf Scan"),
                "total_items_detected": len(items),
                "items": items
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Shelf scan failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkApplyReceiptToStockView(views.APIView):
    """
    Supplier Waybill / Receipt OCR Restocking:
    Takes parsed line items from a supplier invoice / waybill photo and
    automatically increments existing stock or creates new catalog items with verified COGS.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        line_items = request.data.get('line_items', [])
        if not line_items:
            return Response({"error": "No line items provided to apply."}, status=status.HTTP_400_BAD_REQUEST)

        brand = BrandIdentity.objects.filter(user=request.user).first()
        if not brand:
            brand = BrandIdentity.objects.create(
                user=request.user,
                business_name=getattr(request.user, 'business_name', '') or request.user.username or "My Store"
            )

        updated_count = 0
        created_count = 0
        details = []

        for item in line_items:
            name = str(item.get('item_name') or item.get('name') or '').strip()
            if not name:
                continue
            qty = max(1, int(item.get('quantity') or item.get('estimated_stock') or 1))
            cost_price = Decimal(str(item.get('unit_cost') or item.get('suggested_cost_price') or 0.0))
            sell_price = Decimal(str(item.get('unit_price') or item.get('suggested_selling_price') or (cost_price * Decimal('1.25')) or 100.0))
            cat = str(item.get('category') or 'General Goods').strip()

            existing = Product.objects.filter(brand=brand, name__iexact=name).first()
            if existing:
                existing.stock_count += qty
                if cost_price > 0:
                    existing.cost_price = cost_price
                if sell_price > existing.price and sell_price > 0:
                    existing.price = sell_price
                existing.save(update_fields=['stock_count', 'cost_price', 'price'])
                updated_count += 1
                details.append({
                    "id": existing.id,
                    "name": existing.name,
                    "new_stock": existing.stock_count,
                    "status": "RESTOCKED"
                })
            else:
                new_prod = Product.objects.create(
                    brand=brand,
                    name=name.title(),
                    price=sell_price,
                    cost_price=cost_price,
                    stock_count=qty,
                    category=cat,
                    product_type='PHYSICAL',
                    is_public=True
                )
                created_count += 1
                details.append({
                    "id": new_prod.id,
                    "name": new_prod.name,
                    "new_stock": new_prod.stock_count,
                    "status": "CREATED"
                })

        return Response({
            "success": True,
            "message": f"Successfully updated {updated_count} existing item(s) and created {created_count} new item(s) in catalog.",
            "restocked_count": updated_count,
            "created_count": created_count,
            "details": details
        }, status=status.HTTP_200_OK)
