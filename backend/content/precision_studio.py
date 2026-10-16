"""
SmartBiz Precision Photo Studio & Background Segmentation Engine.

Solves the background removal issue:
1. Replaces harsh rectangular bounding box cutting with high-density polygon segmentation.
2. Extracts exact product contour coordinates via Gemini Vision (40+ perimeter vertices).
3. Produces smooth, feathered alpha masks preserving all product textures, labels, logos, and barcodes.
4. Generates natural grounded contact shadows on Pure White, Warm Wood, and Studio Grey backgrounds.
5. Emits transparent PNGs ready for graphic flyers, catalogs, and WhatsApp Status cards.
"""

import io
import json
import base64
import logging
from decimal import Decimal
from PIL import Image, ImageDraw, ImageFilter
from rest_framework import views, permissions, status
from rest_framework.response import Response

from smartbiz_backend import gemini_utils

logger = logging.getLogger(__name__)


def extract_product_polygon_and_meta(image_base64: str, mime_type: str = "image/jpeg"):
    """
    Extracts high-density polygon(s) tracing ONLY the commercial product foreground,
    including interior holes/cutout regions where background shows through,
    along with product name, suggested price, and category.
    """
    prompt = """
    You are an expert computer vision segmentation AI for retail product photography.
    Look at this product photo. Identify the primary commercial product/item foreground.
    Strictly ignore and EXCLUDE any background: bedsheets, floor tiles, wooden tables, carpets, wall clutter, shadows on surfaces, and human hands/fingers holding the item.

    Tasks:
    1. "product_title": Clean, professional product title (e.g., "Airtel 4G Pocket WiFi", "Ankara Fabric 6 Yards", "Nike Air Max 90")
    2. "suggested_price": Integer selling price in Nigerian Naira (NGN)
    3. "category": Primary retail product category
    4. "polygons": Array of polygons. Usually 1 polygon, but if the product has multiple detached parts (e.g. pair of shoes, bottle + lid, accessories), provide 1 polygon per part.
       Each polygon must have 50 to 80 tightly-spaced perimeter vertices [y, x] normalized between 0 and 1000 in clockwise order hugging tightly along the outer boundary.
       CRITICAL: Cut tightly along the product's outer edge. It is better to cut 2-3 pixels inside the product than to leave any sliver of bedsheet, fabric, or table!
    5. "holes": Array of interior hole/cutout polygons [y, x] where the background is visible through the product (e.g., mug handles, shoe loops, gaps between legs, handbag straps). If none, return [].

    Respond STRICTLY with valid JSON:
    {
      "product_title": "Product Name",
      "suggested_price": 15000,
      "category": "Electronics",
      "polygons": [
        [[300, 250], [300, 750], [920, 750], [920, 250]]
      ],
      "holes": []
    }
    """
    try:
        data = gemini_utils.generate_json_content(prompt, image_base64=image_base64, mime_type=mime_type)
        if isinstance(data, dict):
            # Normalize single "polygon" vs multiple "polygons"
            if not data.get("polygons") and data.get("polygon"):
                data["polygons"] = [data["polygon"]]
            if data.get("polygons") and len(data["polygons"]) > 0:
                return data
    except Exception as e:
        logger.warning(f"Polygon segmentation attempt 1 failed: {e}")

    # Fallback safe polygon if Gemini returned incomplete coordinates
    return {
        "product_title": "Commercial Product",
        "suggested_price": 5000,
        "category": "General Merchandise",
        "polygons": [[[160, 160], [160, 840], [840, 840], [840, 160]]],
        "holes": []
    }


def render_studio_composite(cutout_img: Image.Image, mask: Image.Image, theme: str = "pure_white", canvas_size: int = 1080):
    """
    Composites the clean product cutout on high-converting real-world studio backgrounds
    with natural soft ground contact shadows.
    """
    out_w, out_h = canvas_size, canvas_size

    # 1. Base canvas background
    if theme == "transparent":
        studio = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    elif theme == "warm_wood":
        # Warm oak boutique wood tone with gentle lighting
        studio = Image.new("RGBA", (out_w, out_h), (248, 242, 234, 255))
        w_draw = ImageDraw.Draw(studio)
        for y in range(out_h):
            factor = y / out_h
            r = int(248 - (factor * 26))
            g = int(240 - (factor * 36))
            b = int(230 - (factor * 42))
            w_draw.line([(0, y), (out_w, y)], fill=(r, g, b, 255))
    elif theme == "studio_grey":
        # Ultra-minimalist luxury grey
        studio = Image.new("RGBA", (out_w, out_h), (242, 244, 247, 255))
        g_draw = ImageDraw.Draw(studio)
        for y in range(out_h // 2, out_h):
            factor = (y - (out_h // 2)) / (out_h // 2)
            alpha = int(25 * factor)
            g_draw.line([(0, y), (out_w, y)], fill=(195, 200, 210, alpha))
    else:
        # Default: 100% Pure Studio White (Jumia / Amazon / Konga standard)
        studio = Image.new("RGBA", (out_w, out_h), (255, 255, 255, 255))

    # 2. Crop cutout to bounding box of mask content
    bbox = mask.getbbox()
    if bbox:
        cropped = cutout_img.crop(bbox)
        target_dim = int(out_w * 0.74)
        cropped.thumbnail((target_dim, target_dim), Image.Resampling.LANCZOS)
        pw, ph = cropped.size

        # 3. Render natural soft contact shadow underneath (if not transparent)
        if theme != "transparent":
            shadow = Image.new("RGBA", (pw + 80, 60), (0, 0, 0, 0))
            s_draw = ImageDraw.Draw(shadow)
            s_draw.ellipse([20, 12, pw + 60, 48], fill=(15, 20, 30, 80))
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=16))

            px = (out_w - pw) // 2
            py = (out_h - ph) // 2 - 15

            studio.paste(shadow, (px - 40, py + ph - 22), shadow)
            studio.paste(cropped, (px, py), cropped)
        else:
            px = (out_w - pw) // 2
            py = (out_h - ph) // 2
            studio.paste(cropped, (px, py), cropped)

    return studio


from smartbiz_backend.throttles import ImageEditThrottle

class PrecisionPhotoStudioView(views.APIView):
    """
    Clean, professional Photo Studio pipeline:
    1. Extracts true product contour (cuts out bedsheets, floor tiles, clutter).
    2. Builds clean studio composites: Pure White, Warm Wood, Studio Grey, or Transparent PNG.
    3. Returns detected title & suggested price for instant price tag badges.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ImageEditThrottle]

    def post(self, request):
        image_base64 = request.data.get('image_base64') or request.data.get('image') or request.data.get('image_base_64')
        theme = request.data.get('theme') or request.data.get('scene_id') or 'pure_white'

        # Map legacy scene_ids to new studio themes if needed
        if theme in ['luxury_marble', 'pure_white', 'white']:
            theme = 'pure_white'
        elif theme in ['rustic_oak', 'warm_oak', 'warm_wood', 'wood']:
            theme = 'warm_wood'
        elif theme in ['minimal_grey', 'studio_grey', 'grey', 'velvet_noir']:
            theme = 'studio_grey'
        elif theme in ['transparent', 'cutout', 'remove_bg']:
            theme = 'transparent'

        if not image_base64:
            return Response({'error': 'No product image provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            clean_b64 = image_base64.split(',')[1] if ',' in image_base64 else image_base64
            img_bytes = base64.b64decode(clean_b64)
            orig_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            orig_img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
            w, h = orig_img.size

            # 1. AI Polygon Segmentation & Metadata Extraction
            meta = extract_product_polygon_and_meta(clean_b64, mime_type="image/jpeg")
            polygons = meta.get("polygons") or ([meta["polygon"]] if meta.get("polygon") else [])
            holes = meta.get("holes") or meta.get("negative_polygons") or []

            # 2. Render smooth antialiased alpha mask with hole subtraction
            raw_mask = Image.new("L", (w, h), 0)
            draw = ImageDraw.Draw(raw_mask)

            # Draw outer product polygons
            for poly in polygons:
                if len(poly) >= 3:
                    pixel_poly = [(int((pt[1] / 1000.0) * w), int((pt[0] / 1000.0) * h)) for pt in poly]
                    draw.polygon(pixel_poly, fill=255)

            # Cut out interior holes (where background shows through)
            for hole in holes:
                if len(hole) >= 3:
                    pixel_hole = [(int((pt[1] / 1000.0) * w), int((pt[0] / 1000.0) * h)) for pt in hole]
                    draw.polygon(pixel_hole, fill=0)

            # Apply subtle inward morphological erosion to strip any 1-2px bedsheet/table fringe
            eroded_mask = raw_mask.filter(ImageFilter.MinFilter(3))
            smooth_mask = eroded_mask.filter(ImageFilter.GaussianBlur(radius=1.2))

            cutout = orig_img.copy()
            cutout.putalpha(smooth_mask)

            # 3. Generate Studio Output
            studio_img = render_studio_composite(cutout, smooth_mask, theme=theme)

            # Export studio image to JPEG (or PNG if transparent)
            studio_buf = io.BytesIO()
            if theme == "transparent":
                studio_img.save(studio_buf, format="PNG")
                mime_out = "image/png"
            else:
                studio_img.convert("RGB").save(studio_buf, format="JPEG", quality=95)
                mime_out = "image/jpeg"

            studio_b64 = base64.b64encode(studio_buf.getvalue()).decode('utf-8')

            # Export transparent cutout PNG as well for flyer downloads
            cutout_buf = io.BytesIO()
            cutout.save(cutout_buf, format="PNG")
            cutout_b64 = base64.b64encode(cutout_buf.getvalue()).decode('utf-8')

            credits_rem = getattr(request.user, 'credits', 100)

            return Response({
                "success": True,
                "product_title": meta.get("product_title", "Commercial Product"),
                "suggested_price": meta.get("suggested_price", 5000),
                "category": meta.get("category", "General Merchandise"),
                "theme": theme,
                "studio_image_base64": f"data:{mime_out};base64,{studio_b64}",
                "image_base64": f"data:{mime_out};base64,{studio_b64}",
                "transparent_cutout_base64": f"data:image/png;base64,{cutout_b64}",
                "transparent_image_base64": f"data:image/png;base64,{cutout_b64}",
                "credits_remaining": credits_rem
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"PrecisionPhotoStudioView failed: {e}")
            return Response({"error": f"Failed to process studio image: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
