"""Order creation, delivery quoting and Paystack payment verification (Commerce Phase 5)."""
import urllib.parse
from collections import OrderedDict
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework import permissions, status, views
from rest_framework.response import Response

from .models import DailySale, DeliveryRate, Lead, Order, OrderEvent, OrderItem, Product
from billing.models import PaymentReferenceLedger


def delivery_fee_for(brand, state):
    """Return (fee, eta_days) for a merchant + destination state. Falls back to the '*' default rate."""
    rates = {r.state.strip().lower(): r for r in DeliveryRate.objects.filter(brand=brand)}
    rate = rates.get((state or '').strip().lower()) or rates.get('*')
    if rate:
        return rate.fee, rate.eta_days
    return Decimal('0'), 3


def verify_paystack(reference):
    """
    Ask Paystack whether `reference` was really paid.
    Returns (outcome, amount_naira) where outcome is 'success', 'failed' or 'unknown'
    ('unknown' = no secret key configured or Paystack unreachable; the order is kept but unverified).
    """
    secret = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
    if not secret or not reference:
        return 'unknown', None
    try:
        res = requests.get(
            f'https://api.paystack.co/transaction/verify/{urllib.parse.quote(reference)}',
            headers={'Authorization': f'Bearer {secret}'},
            timeout=10,
        )
        if res.status_code == 404:
            return 'failed', None
        if res.status_code != 200:
            return 'unknown', None
        data = (res.json() or {}).get('data') or {}
        if data.get('status') == 'success':
            return 'success', Decimal(str(data.get('amount', 0))) / Decimal('100')
        return 'failed', None
    except Exception:
        return 'unknown', None


class DeliveryQuoteView(views.APIView):
    """Public: GET ?product_ids=1,2&state=Lagos -> per-merchant delivery fee so buyers pay the right total."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        state = request.query_params.get('state', '')
        ids = [i for i in request.query_params.get('product_ids', '').split(',') if i.strip().isdigit()]
        brands = OrderedDict()
        for p in Product.objects.filter(id__in=ids).select_related('brand'):
            brands[p.brand_id] = p.brand
        quotes = []
        total = Decimal('0')
        for brand in brands.values():
            fee, eta = delivery_fee_for(brand, state)
            total += fee
            quotes.append({'brand_id': brand.id, 'brand_name': brand.business_name, 'fee': float(fee), 'eta_days': eta})
        return Response({'state': state, 'quotes': quotes, 'total_fee': float(total)})


class OrderCreateView(views.APIView):
    """
    Called after a Paystack payment succeeds. Splits the cart per merchant into Orders, verifies the
    payment with Paystack, deducts stock, and records the sale in each merchant's Day-Book.
    Idempotent per (reference, merchant): re-posting the same reference never double-deducts stock.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        items = request.data.get('items', []) or []
        reference = (request.data.get('reference') or '').strip()
        payment_method = str(request.data.get('payment_method') or 'PAYSTACK').strip().upper()
        user = request.user if request.user.is_authenticated else None

        customer_name = (request.data.get('customer_name') or
                         (user and (user.get_full_name() or user.username)) or 'Customer').strip()
        customer_contact = (request.data.get('customer_phone') or request.data.get('customer_contact') or
                            (user and user.email) or 'Direct Buyer').strip()
        customer_address = (request.data.get('customer_address') or request.data.get('delivery_address') or
                            'Standard Waybill / Delivery').strip()
        delivery_state = (request.data.get('delivery_state') or '').strip()
        order_notes = (request.data.get('notes') or '').strip()

        # Group requested lines per merchant, pricing from the database (never trust client prices)
        groups = OrderedDict()
        for item in items:
            product_id = item.get('productId') or item.get('product_id') or item.get('id')
            try:
                product = Product.objects.select_related('brand', 'brand__user').get(id=product_id, is_suspended=False)
                qty = max(1, int(item.get('quantity') or 1))
            except (Product.DoesNotExist, ValueError, TypeError):
                continue
            groups.setdefault(product.brand_id, {'brand': product.brand, 'lines': []})['lines'].append((product, qty))

        if not groups:
            return Response({'error': 'No valid items in this order.'}, status=status.HTTP_400_BAD_REQUEST)

        # Explicit WhatsApp inquiry path: log Leads for seller follow-up without deducting stock or marking PAID
        if payment_method == 'WHATSAPP':
            leads_created = []
            for g in groups.values():
                for product, qty in g['lines']:
                    lead = Lead.objects.create(
                        brand=g['brand'],
                        product=product,
                        customer_name=customer_name,
                        customer_contact=customer_contact,
                        lead_type='ORDER',
                        status='NEW',
                        quoted_price=product.price * qty,
                        message="\n".join(filter(None, [
                            "💬 WhatsApp Storefront Inquiry",
                            f"Item: {product.name} (Qty: {qty})",
                            f"Customer: {customer_name} ({customer_contact})",
                            f"Delivery Address: {customer_address}" + (f" ({delivery_state})" if delivery_state else ""),
                            f"Notes: {order_notes}" if order_notes else '',
                        ])),
                    )
                    leads_created.append(lead.id)
            return Response({
                'status': 'whatsapp_inquiry',
                'message': 'WhatsApp order inquiry sent to vendor inbox.',
                'leads': leads_created,
            }, status=status.HTTP_201_CREATED)

        plan = []
        expected_total = Decimal('0')
        for g in groups.values():
            subtotal = sum((p.price * q for p, q in g['lines']), Decimal('0'))
            fee = delivery_fee_for(g['brand'], delivery_state)[0] if delivery_state else Decimal('0')
            plan.append((g['brand'], g['lines'], subtotal, fee))
            expected_total += subtotal + fee

        if not reference:
            return Response(
                {'error': 'Verified payment reference is required for online orders.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # Idempotent re-post of same storefront order reference
        existing_orders = list(Order.objects.filter(reference=reference).select_related('brand'))
        if existing_orders:
            return Response({
                'message': 'Order already processed.',
                'orders': [{'tracking_code': o.tracking_code, 'brand_name': o.brand.business_name,
                            'total_amount': float(o.total_amount), 'status': o.status} for o in existing_orders],
                'tracking_code': existing_orders[0].tracking_code,
            }, status=status.HTTP_200_OK)

        outcome, paid = verify_paystack(reference)
        amount_ok = outcome == 'success' and paid is not None and paid + Decimal('1') >= expected_total
        if not amount_ok:
            return Response(
                {'error': 'Payment could not be verified with Paystack or amount was underpaid. No order was created.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        ref_value = reference
        orders_out = []
        leads_created = []

        try:
            with transaction.atomic():
                claimed = PaymentReferenceLedger.objects.select_for_update().filter(reference=ref_value).first()
                if claimed and claimed.purpose != 'STOREFRONT_ORDER':
                    return Response({'error': 'This payment reference was already used for another flow.'},
                                    status=status.HTTP_409_CONFLICT)
                if not claimed:
                    PaymentReferenceLedger.objects.create(
                        reference=ref_value,
                        purpose='STOREFRONT_ORDER',
                        user=user,
                        amount_ngn=paid or expected_total,
                    )

                for brand, lines, subtotal, fee in plan:
                    for product, qty in lines:
                        if product.product_type == 'PHYSICAL':
                            updated = Product.objects.filter(
                                pk=product.pk, stock_count__gte=qty
                            ).update(stock_count=F('stock_count') - qty)
                            if updated == 0:
                                raise ValueError(f"INSUFFICIENT_STOCK:{product.name}")

                    order, created = Order.objects.get_or_create(
                        reference=ref_value, brand=brand,
                        defaults=dict(
                            buyer_name=customer_name, buyer_phone=customer_contact,
                            delivery_address=customer_address, delivery_state=delivery_state, notes=order_notes,
                            subtotal=subtotal, delivery_fee=fee, total_amount=subtotal + fee,
                            payment_verified=True,
                        ),
                    )
                    if created:
                        OrderEvent.objects.create(order=order, status='PAID', note='Payment verified with Paystack')

                        for product, qty in lines:
                            OrderItem.objects.create(order=order, product=product, name=product.name, quantity=qty,
                                                     unit_price=product.price, line_total=product.price * qty)

                            lead = Lead.objects.create(
                                brand=brand, product=product, customer_name=customer_name,
                                customer_contact=customer_contact, lead_type='ORDER', status='WON',
                                quoted_price=product.price * qty,
                                message="\n".join(filter(None, [
                                    f"🛒 Order Paid (Ref: {ref_value} · Track: {order.tracking_code})",
                                    f"Item: {product.name} (Qty: {qty})",
                                    f"Customer: {customer_name} ({customer_contact})",
                                    f"Delivery Address: {customer_address}",
                                    f"Notes: {order_notes}" if order_notes else '',
                                ])),
                            )
                            leads_created.append(lead.id)

                            if brand.user:
                                DailySale.objects.create(
                                    user=brand.user, product=product, item_name=f"{product.name} (Online Order)",
                                    quantity=qty, unit_price=product.price, cost_price=product.cost_price or 0,
                                    total_amount=product.price * qty, payment_method='TRANSFER',
                                    customer_name=customer_name, customer_phone=customer_contact, is_debt=False,
                                    notes=f"Order {order.tracking_code} · Ref: {ref_value} · Delivery: {customer_address}",
                                )
                    orders_out.append({'tracking_code': order.tracking_code, 'brand_name': brand.business_name,
                                       'total_amount': float(order.total_amount), 'status': order.status})
        except ValueError as stock_err:
            if str(stock_err).startswith("INSUFFICIENT_STOCK:"):
                item_label = str(stock_err).split(":", 1)[1]
                return Response({'error': f"'{item_label}' is out of stock or has insufficient quantity available."},
                                status=status.HTTP_409_CONFLICT)
            raise

        # WhatsApp templates (kept for the existing UI)
        clean_phone = ''.join(filter(str.isdigit, customer_contact))
        if clean_phone.startswith('0') and len(clean_phone) == 11:
            clean_phone = '234' + clean_phone[1:]
        elif not clean_phone.startswith('234'):
            clean_phone = ''
        track_lines = "\n".join(f"🔎 Track {o['brand_name']}: /track/{o['tracking_code']}" for o in orders_out)
        total_shown = float(paid) if (outcome == 'success' and paid is not None) else float(expected_total)
        cust_msg = (f"🧾 *ORDER PAYMENT CONFIRMATION*\nYour payment of *₦{total_shown:,.2f}* was received!\n\n"
                    f"🆔 *Order Ref:* {ref_value}\n👤 *Customer:* {customer_name}\n📍 *Delivery:* {customer_address}\n\n"
                    f"{track_lines}\n\nThank you for your patronage!")
        merchant_msg = (f"🔔 *NEW PAID ORDER*\n💰 *Amount:* ₦{total_shown:,.2f}\n🆔 *Ref:* {ref_value}\n\n"
                        f"👤 *Buyer:* {customer_name} ({customer_contact})\n📍 *Address:* {customer_address}\n"
                        f"{f'📝 Notes: {order_notes}' if order_notes else ''}")
        wa = {
            'reference': ref_value,
            'customer_phone': clean_phone,
            'customer_wa_url': f"https://wa.me/{clean_phone}?text={urllib.parse.quote(cust_msg)}" if clean_phone
                               else f"https://wa.me/?text={urllib.parse.quote(cust_msg)}",
            'merchant_wa_url': f"https://wa.me/?text={urllib.parse.quote(merchant_msg)}",
            'customer_message': cust_msg,
            'merchant_message': merchant_msg,
        }
        return Response({
            'message': 'Order processed. Track it any time with your tracking code.',
            'leads': leads_created,
            'reference': ref_value,
            'orders': orders_out,
            'payment_verified': amount_ok,
            'whatsapp_dispatch': wa,
        }, status=status.HTTP_201_CREATED)
