"""Commerce Phases 5-8: order inbox, tracking, delivery rates, reviews, moderation, link previews, SEO, AI assist."""
import base64
import html
import re
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Avg, Count, F
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.utils import timezone
from rest_framework import permissions, status, views
from rest_framework.response import Response

from .models import (DeliveryRate, ListingReport, Order, OrderEvent, Product, ProductReview)


def frontend_base():
    return (getattr(settings, 'FRONTEND_URL', '') or 'https://smartbizcoach.com.ng').rstrip('/')


class IsPlatformStaff(permissions.BasePermission):
    """Moderation is limited to real staff - NOT Pro-plan merchants (is_admin_or_owner includes Pro)."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or u.is_superuser))


def _mask_phone(phone):
    digits = ''.join(c for c in str(phone or '') if c.isdigit())
    return f"{digits[:4]}****{digits[-2:]}" if len(digits) >= 7 else '****'


def order_to_dict(order, public=False):
    seller_wa = ''
    try:
        vp = getattr(order.brand.user, 'vendor_profile', None)
        seller_wa = (getattr(vp, 'whatsapp_number', '') if vp else '') or getattr(order.brand.user, 'phone', '') or ''
    except Exception:
        pass
    data = {
        'id': order.id,
        'tracking_code': order.tracking_code,
        'reference': order.reference,
        'status': order.status,
        'status_label': order.get_status_display(),
        'buyer_name': order.buyer_name,
        'buyer_phone': _mask_phone(order.buyer_phone) if public else order.buyer_phone,
        'delivery_state': order.delivery_state,
        'subtotal': float(order.subtotal),
        'delivery_fee': float(order.delivery_fee),
        'total_amount': float(order.total_amount),
        'payment_verified': order.payment_verified,
        'courier': order.courier,
        'waybill_number': order.waybill_number,
        'dispute_reason': order.dispute_reason,
        'created_at': order.created_at,
        'shipped_at': order.shipped_at,
        'delivered_at': order.delivered_at,
        'buyer_confirmed_at': order.buyer_confirmed_at,
        'brand_name': order.brand.business_name,
        'brand_slug': order.brand.slug,
        'seller_whatsapp': ''.join(c for c in str(seller_wa) if c.isdigit()),
        'items': [{
            'product_id': i.product_id, 'name': i.name, 'quantity': i.quantity,
            'unit_price': float(i.unit_price), 'line_total': float(i.line_total),
        } for i in order.items.all()],
        'events': [{'status': e.status, 'note': e.note, 'created_at': e.created_at} for e in order.events.all()],
    }
    if not public:
        data['delivery_address'] = order.delivery_address
        data['notes'] = order.notes
    return data


def _log(order, status_value, note=''):
    OrderEvent.objects.create(order=order, status=status_value, note=note[:300])


# ----------------------------- Phase 5: merchant orders -----------------------------

ALLOWED_TRANSITIONS = {
    'PAID': {'PACKED', 'SHIPPED', 'CANCELLED'},
    'PACKED': {'SHIPPED', 'CANCELLED'},
    'SHIPPED': {'DELIVERED', 'CANCELLED'},
    'DISPUTED': {'DELIVERED', 'CANCELLED'},
    'DELIVERED': set(),
    'CANCELLED': set(),
}


class MerchantOrderListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (Order.objects.filter(brand__user=request.user)
              .select_related('brand', 'brand__user').prefetch_related('items', 'events'))
        counts = {s: 0 for s, _ in Order.STATUS_CHOICES}
        for row in Order.objects.filter(brand__user=request.user).values('status').annotate(c=Count('id')):
            counts[row['status']] = row['c']
        wanted = request.query_params.get('status')
        if wanted and wanted != 'ALL':
            qs = qs.filter(status=wanted)
        low_stock = Product.objects.filter(
            brand__user=request.user, product_type='PHYSICAL', stock_count__lte=F('low_stock_threshold')
        ).order_by('stock_count').values('id', 'name', 'stock_count', 'low_stock_threshold')[:20]
        return Response({
            'orders': [order_to_dict(o) for o in qs[:200]],
            'counts': counts,
            'low_stock': list(low_stock),
        })


class MerchantOrderDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            order = Order.objects.select_related('brand', 'brand__user').get(pk=pk, brand__user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        if 'courier' in request.data:
            order.courier = str(request.data.get('courier') or '')[:120]
        if 'waybill_number' in request.data:
            order.waybill_number = str(request.data.get('waybill_number') or '')[:120]

        new_status = request.data.get('status')
        note = str(request.data.get('note') or '')
        if new_status and new_status != order.status:
            if new_status not in ALLOWED_TRANSITIONS.get(order.status, set()):
                return Response({'error': f'Cannot move an order from {order.status} to {new_status}.'}, status=400)
            if new_status == 'SHIPPED':
                order.shipped_at = timezone.now()
            elif new_status == 'DELIVERED':
                order.delivered_at = timezone.now()
            elif new_status == 'CANCELLED':
                # Return physical stock to the shelf
                for item in order.items.select_related('product'):
                    p = item.product
                    if p and p.product_type == 'PHYSICAL':
                        Product.objects.filter(pk=p.pk).update(stock_count=F('stock_count') + item.quantity)
            order.status = new_status
            _log(order, new_status, note or {
                'PACKED': 'Seller packed your order', 'SHIPPED': 'Order is on its way',
                'DELIVERED': 'Seller marked the order delivered', 'CANCELLED': 'Order cancelled by seller',
            }.get(new_status, ''))
        order.save()
        order.refresh_from_db()
        return Response(order_to_dict(order))


class DeliveryRateListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _brand(self, request):
        from brand.models import BrandIdentity
        brand, _ = BrandIdentity.objects.get_or_create(
            user=request.user,
            defaults={'business_name': getattr(request.user, 'business_name', '') or 'My Business'})
        return brand

    def get(self, request):
        rates = DeliveryRate.objects.filter(brand=self._brand(request))
        return Response([{'id': r.id, 'state': r.state, 'fee': float(r.fee), 'eta_days': r.eta_days} for r in rates])

    def post(self, request):
        state = (request.data.get('state') or '*').strip()[:60] or '*'
        try:
            fee = Decimal(str(request.data.get('fee', 0)))
            eta = int(request.data.get('eta_days') or 3)
        except (InvalidOperation, ValueError, TypeError):
            return Response({'error': 'Invalid fee or delivery days'}, status=400)
        if fee < 0 or eta < 0:
            return Response({'error': 'Fee and delivery days must be positive'}, status=400)
        rate, _ = DeliveryRate.objects.update_or_create(
            brand=self._brand(request), state=state, defaults={'fee': fee, 'eta_days': eta})
        return Response({'id': rate.id, 'state': rate.state, 'fee': float(rate.fee), 'eta_days': rate.eta_days}, status=201)


class DeliveryRateDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = DeliveryRate.objects.filter(pk=pk, brand__user=request.user).delete()
        return Response(status=204 if deleted else 404)


# ----------------------------- Phase 5/6: public tracking -----------------------------

def _get_public_order(code):
    try:
        return Order.objects.select_related('brand', 'brand__user').prefetch_related('items', 'events').get(
            tracking_code=str(code).strip().upper())
    except Order.DoesNotExist:
        return None


class PublicOrderTrackView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, code):
        order = _get_public_order(code)
        if not order:
            return Response({'error': 'We could not find an order with that tracking code.'}, status=404)
        data = order_to_dict(order, public=True)
        data['can_review'] = order.status == 'DELIVERED'
        return Response(data)


class BuyerOrderActionView(views.APIView):
    """Buyer confirms delivery, or raises a dispute, using only the tracking code."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, code):
        order = _get_public_order(code)
        if not order:
            return Response({'error': 'Order not found'}, status=404)
        action = request.data.get('action')
        if action == 'confirm':
            if order.status not in ('SHIPPED', 'DELIVERED', 'DISPUTED'):
                return Response({'error': 'You can confirm delivery once the seller has shipped the order.'}, status=400)
            order.status = 'DELIVERED'
            order.delivered_at = order.delivered_at or timezone.now()
            order.buyer_confirmed_at = timezone.now()
            order.save()
            _log(order, 'DELIVERED', 'Buyer confirmed delivery')
        elif action == 'dispute':
            if order.status not in ('SHIPPED', 'DELIVERED'):
                return Response({'error': 'A problem can only be reported after the order has shipped.'}, status=400)
            reason = str(request.data.get('reason') or '').strip()
            if len(reason) < 5:
                return Response({'error': 'Please describe the problem.'}, status=400)
            order.status = 'DISPUTED'
            order.dispute_reason = reason[:1000]
            order.save()
            _log(order, 'DISPUTED', 'Buyer reported a problem')
        else:
            return Response({'error': "action must be 'confirm' or 'dispute'"}, status=400)
        order.refresh_from_db()
        data = order_to_dict(order, public=True)
        data['can_review'] = order.status == 'DELIVERED'
        return Response(data)


# ----------------------------- Phase 6: reviews -----------------------------

def review_to_dict(r):
    return {
        'id': r.id, 'product_id': r.product_id, 'reviewer_name': r.reviewer_name, 'rating': r.rating,
        'comment': r.comment, 'verified_purchase': r.verified_purchase, 'seller_reply': r.seller_reply,
        'seller_replied_at': r.seller_replied_at, 'created_at': r.created_at,
        'product_name': r.product.name if r.product_id else '',
    }


class ReviewListCreateView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        pid = request.query_params.get('product_id', '')
        if not pid.isdigit():
            return Response({'error': 'product_id required'}, status=400)
        qs = ProductReview.objects.filter(product_id=pid, is_hidden=False).select_related('product')
        agg = qs.aggregate(a=Avg('rating'), c=Count('id'))
        dist = {str(i): 0 for i in range(1, 6)}
        for row in qs.values('rating').annotate(c=Count('id')):
            dist[str(row['rating'])] = row['c']
        return Response({
            'avg_rating': round(float(agg['a']), 1) if agg['a'] else 0,
            'review_count': agg['c'] or 0,
            'distribution': dist,
            'reviews': [review_to_dict(r) for r in qs[:50]],
        })

    def post(self, request):
        """Only verified buyers (a delivered order's tracking code that contains the product) may review."""
        try:
            product = Product.objects.get(pk=int(request.data.get('product_id')))
            rating = int(request.data.get('rating'))
        except (Product.DoesNotExist, TypeError, ValueError):
            return Response({'error': 'A valid product and rating are required.'}, status=400)
        if not 1 <= rating <= 5:
            return Response({'error': 'Rating must be between 1 and 5.'}, status=400)
        order = _get_public_order(request.data.get('tracking_code') or '')
        if not order or order.status != 'DELIVERED' or not order.items.filter(product=product).exists():
            return Response({'error': 'Reviews are open to verified buyers. Use the tracking code of a delivered order for this product.'}, status=403)
        if ProductReview.objects.filter(order=order, product=product).exists():
            return Response({'error': 'You have already reviewed this product for this order.'}, status=409)
        review = ProductReview.objects.create(
            product=product, order=order, rating=rating,
            reviewer_name=(str(request.data.get('reviewer_name') or '').strip() or order.buyer_name or 'Verified buyer')[:120],
            comment=str(request.data.get('comment') or '').strip()[:1500], verified_purchase=True)
        return Response(review_to_dict(review), status=201)


class MerchantReviewListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ProductReview.objects.filter(product__brand__user=request.user).select_related('product')
        return Response([review_to_dict(r) for r in qs[:100]])


class ReviewReplyView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            review = ProductReview.objects.select_related('product').get(pk=pk, product__brand__user=request.user)
        except ProductReview.DoesNotExist:
            return Response({'error': 'Review not found'}, status=404)
        reply = str(request.data.get('reply') or '').strip()[:800]
        review.seller_reply = reply
        review.seller_replied_at = timezone.now() if reply else None
        review.save(update_fields=['seller_reply', 'seller_replied_at'])
        return Response(review_to_dict(review))


# ----------------------------- Phase 6: reports & moderation -----------------------------

class ReportListingView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            product = Product.objects.get(pk=int(request.data.get('product_id')))
        except (Product.DoesNotExist, TypeError, ValueError):
            return Response({'error': 'Listing not found'}, status=404)
        reason = request.data.get('reason') or 'OTHER'
        if reason not in dict(ListingReport.REASONS):
            reason = 'OTHER'
        contact = str(request.data.get('contact') or '').strip()[:120]
        if contact and ListingReport.objects.filter(product=product, reporter_contact=contact, status='OPEN').exists():
            return Response({'message': 'You already reported this listing. Our team is reviewing it.'})
        ListingReport.objects.create(product=product, reason=reason, reporter_contact=contact,
                                     details=str(request.data.get('details') or '').strip()[:1500])
        return Response({'message': 'Thank you. Our trust & safety team will review this listing.'}, status=201)


def report_to_dict(r):
    p = r.product
    return {
        'id': r.id, 'reason': r.reason, 'reason_label': r.get_reason_display(), 'details': r.details,
        'reporter_contact': r.reporter_contact, 'status': r.status, 'resolution_note': r.resolution_note,
        'created_at': r.created_at,
        'product': {'id': p.id, 'name': p.name, 'price': float(p.price), 'brand_name': p.brand.business_name,
                    'is_suspended': p.is_suspended,
                    'open_reports': p.reports.filter(status='OPEN').count()},
    }


class ModerationReportListView(views.APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        wanted = request.query_params.get('status', 'OPEN')
        qs = ListingReport.objects.select_related('product', 'product__brand')
        if wanted != 'ALL':
            qs = qs.filter(status=wanted)
        return Response([report_to_dict(r) for r in qs[:200]])


class ModerationReportActionView(views.APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request, pk):
        try:
            report = ListingReport.objects.select_related('product', 'product__brand').get(pk=pk)
        except ListingReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=404)
        action = request.data.get('action')
        note = str(request.data.get('note') or '')[:300]
        now = timezone.now()
        if action == 'suspend':
            Product.objects.filter(pk=report.product_id).update(is_suspended=True)
            ListingReport.objects.filter(product=report.product, status='OPEN').update(
                status='ACTIONED', resolution_note=note or 'Listing suspended', resolved_at=now)
        elif action == 'dismiss':
            report.status, report.resolution_note, report.resolved_at = 'DISMISSED', note or 'No violation found', now
            report.save()
        elif action == 'restore':
            Product.objects.filter(pk=report.product_id).update(is_suspended=False)
        else:
            return Response({'error': "action must be 'suspend', 'dismiss' or 'restore'"}, status=400)
        report.refresh_from_db()
        return Response(report_to_dict(report))


# ----------------------------- Phase 7: link previews & sitemap -----------------------------

def _product_target_url(product):
    slug = product.brand.slug
    return f"{frontend_base()}/u/{slug}/p/{product.id}" if slug else f"{frontend_base()}/market/p/{product.id}"


def _og_page(title, description, image, target):
    t, d, i, u = (html.escape(x, quote=True) for x in (title, description, image, target))
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        f'<title>{t}</title><meta name="description" content="{d}">'
        f'<meta property="og:type" content="website"><meta property="og:site_name" content="SmartBiz Coach">'
        f'<meta property="og:title" content="{t}"><meta property="og:description" content="{d}">'
        f'<meta property="og:image" content="{i}"><meta property="og:url" content="{u}">'
        f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}">'
        f'<meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{i}">'
        f'<link rel="canonical" href="{u}"><meta http-equiv="refresh" content="0;url={u}">'
        f'</head><body><p>Opening <a href="{u}">{t}</a>…</p>'
        f'<script>location.replace({u!r});</script></body></html>'
    )


class ShareProductPageView(views.APIView):
    """Crawler-friendly page (WhatsApp/Facebook/X previews) that forwards humans to the SPA product page."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        try:
            product = Product.objects.select_related('brand').get(pk=pk, is_suspended=False)
        except Product.DoesNotExist:
            return HttpResponseRedirect(f"{frontend_base()}/market")
        price = f"₦{float(product.price):,.0f}"
        desc = re.sub(r'\s+', ' ', product.description or '').strip()[:180]
        where = product.location or product.brand.address or 'Nigeria'
        description = f"{price} · {product.brand.business_name} · {where}" + (f" — {desc}" if desc else '')
        image = request.build_absolute_uri(f"/api/marketplace/share/p/{product.id}/image/")
        resp = HttpResponse(_og_page(f"{product.name} — {price}", description, image, _product_target_url(product)))
        resp['Cache-Control'] = 'public, max-age=300'
        return resp


class ShareProductImageView(views.APIView):
    """Serves the product photo as a real image URL (stored photos may be base64 data URIs)."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        try:
            product = Product.objects.get(pk=pk, is_suspended=False)
        except Product.DoesNotExist:
            raise Http404
        src = (product.image_url or '').strip()
        if src.startswith('http'):
            return HttpResponseRedirect(src)
        m = re.match(r'data:(image/[\w.+-]+);base64,(.+)', src, re.S)
        if not m:
            raise Http404
        try:
            body = base64.b64decode(m.group(2))
        except Exception:
            raise Http404
        resp = HttpResponse(body, content_type=m.group(1))
        resp['Cache-Control'] = 'public, max-age=86400'
        return resp


class ShareStorePageView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        from brand.models import BrandIdentity
        brand = BrandIdentity.objects.filter(slug=slug).first()
        if not brand:
            return HttpResponseRedirect(f"{frontend_base()}/market")
        count = Product.objects.filter(brand=brand, is_public=True, is_suspended=False).count()
        logo = (brand.logo_url or '').strip()
        image = logo if logo.startswith('http') else f"{frontend_base()}/logo-square.png"
        desc = f"Shop {count} product(s) from {brand.business_name} on SmartBiz Coach — {brand.address or 'Nigeria'}."
        resp = HttpResponse(_og_page(f"{brand.business_name} — Online Store", desc, image, f"{frontend_base()}/u/{slug}"))
        resp['Cache-Control'] = 'public, max-age=300'
        return resp


class MarketSitemapView(views.APIView):
    """Dynamic sitemap of the Market Square: category pages, state pages, stores and products."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        from urllib.parse import quote
        base = frontend_base()
        urls = [f"{base}/market"]
        public = Product.objects.filter(is_public=True, is_suspended=False)
        for c in public.exclude(category='').values_list('category', flat=True).distinct()[:200]:
            urls.append(f"{base}/market/c/{quote(c)}")
        from brand.models import BrandIdentity
        for slug in BrandIdentity.objects.filter(slug__isnull=False, products__in=public).values_list('slug', flat=True).distinct()[:5000]:
            urls.append(f"{base}/u/{slug}")
        for p in public.select_related('brand').order_by('-created_at')[:10000]:
            urls.append(_product_target_url(p))
        body = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(
            f"<url><loc>{html.escape(u)}</loc></url>" for u in urls) + '</urlset>'
        resp = HttpResponse(body, content_type='application/xml')
        resp['Cache-Control'] = 'public, max-age=3600'
        return resp


# ----------------------------- Phase 8: AI listing assistant -----------------------------

class ListingAssistView(views.APIView):
    """Improves a listing: sharper title, persuasive description, suggested price band and search tags."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        name = str(request.data.get('name') or '').strip()
        if len(name) < 2:
            return Response({'error': 'Enter a product name first.'}, status=400)
        category = str(request.data.get('category') or '').strip()
        description = str(request.data.get('description') or '').strip()
        price = request.data.get('price')
        location = str(request.data.get('location') or '').strip()

        fallback = {
            'title': name.title(),
            'description': description or f"{name.title()} — quality you can trust, fairly priced and ready for fast delivery "
                                          f"across Nigeria. Order today on WhatsApp or pay securely online.",
            'price_min': None, 'price_max': None,
            'tags': [t for t in [category.lower(), name.lower(), 'nigeria', location.lower()] if t],
            'source': 'template',
        }
        prompt = f"""You help a Nigerian small-business owner write a high-converting marketplace listing.
Product: "{name}". Category: "{category or 'unknown'}". Location: "{location or 'Nigeria'}". Current price: {price or 'not set'} NGN.
Current description: "{description or 'none'}"
Return STRICT JSON: {{"title": "clear title under 70 chars", "description": "2-3 honest sentences, mention benefits and delivery, no fake claims",
"price_min": integer NGN realistic low, "price_max": integer NGN realistic high, "tags": ["up to 6 lowercase search keywords"]}}"""
        try:
            from smartbiz_backend import gemini_utils
            out = gemini_utils.generate_json_content(prompt)
            if isinstance(out, dict) and out.get('title') and out.get('description'):
                def _int(v):
                    try:
                        return int(float(v))
                    except (TypeError, ValueError):
                        return None
                tags = out.get('tags') if isinstance(out.get('tags'), list) else []
                return Response({
                    'title': str(out['title'])[:120], 'description': str(out['description'])[:1200],
                    'price_min': _int(out.get('price_min')), 'price_max': _int(out.get('price_max')),
                    'tags': [str(t).lower()[:30] for t in tags][:6], 'source': 'ai',
                })
        except Exception as exc:  # pragma: no cover - AI is best-effort
            print(f"Listing assist error: {exc}")
        return Response(fallback)
