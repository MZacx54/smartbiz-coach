"""
Ephemeral database seed helper for Phase 4 Playwright mobile E2E QA tests.
Seeds one public storefront slug ('e2e-store'), one verified physical product,
and one public order tracking code ('SB-E2E1234') on an isolated SQLite DB.
"""
import os
import sys
from decimal import Decimal
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartbiz_backend.settings")

import django

django.setup()

from django.contrib.auth import get_user_model
from brand.models import BrandIdentity
from marketplace.models import DeliveryRate, Order, OrderEvent, OrderItem, Product, VendorVerification


def seed():
    User = get_user_model()
    seller, _ = User.objects.get_or_create(
        username="storefront-owner@shop.ng",
        defaults={
            "email": "storefront-owner@shop.ng",
            "first_name": "Kemi",
            "business_name": "Kemi Organics Store",
            "phone": "08030001111",
            "has_onboarded": True,
            "is_email_verified": True,
            "credits": 50,
        },
    )
    seller.set_password("StrongPass123!")
    seller.save()

    brand, _ = BrandIdentity.objects.get_or_create(
        user=seller,
        defaults={
            "business_name": "Kemi Organics Store",
            "slug": "e2e-store",
            "niche": "Skincare & Organics",
            "taglines": ["Pure handcrafted Nigerian skincare"],
            "elevator_pitch": "Cold-pressed shea butter and herbal skincare shipped across Nigeria.",
            "address": "12 Admiralty Way, Lagos",
            "phone": "08030001111",
            "email": "storefront-owner@shop.ng",
        },
    )
    if brand.slug != "e2e-store":
        brand.slug = "e2e-store"
        brand.save(update_fields=["slug"])

    VendorVerification.objects.get_or_create(
        user=seller,
        defaults={
            "business_name": "Kemi Organics Store",
            "whatsapp_number": "08030001111",
            "is_verified": True,
            "status": "VERIFIED",
        },
    )

    DeliveryRate.objects.get_or_create(
        brand=brand,
        state="Lagos",
        defaults={"fee": Decimal("1500.00"), "eta_days": 2},
    )

    product, _ = Product.objects.get_or_create(
        brand=brand,
        name="Gold Shea Butter 250g",
        defaults={
            "price": Decimal("4500.00"),
            "cost_price": Decimal("2500.00"),
            "product_type": "PHYSICAL",
            "stock_count": 25,
            "is_public": True,
            "description": "100% unrefined Grade-A shea butter packed fresh in Lagos.",
        },
    )

    order, created = Order.objects.get_or_create(
        reference="E2E-ORDER-REF-001",
        brand=brand,
        defaults={
            "tracking_code": "SB-E2E1234",
            "buyer_name": "Amina Bello",
            "buyer_phone": "08098887777",
            "delivery_address": "12 Admiralty Way, Lekki",
            "delivery_state": "Lagos",
            "subtotal": Decimal("4500.00"),
            "delivery_fee": Decimal("1500.00"),
            "total_amount": Decimal("6000.00"),
            "payment_verified": True,
            "status": "SHIPPED",
            "courier": "GIG Logistics",
            "waybill_number": "GIG-99201",
        },
    )
    if created:
        OrderItem.objects.create(
            order=order,
            product=product,
            name=product.name,
            quantity=1,
            unit_price=Decimal("4500.00"),
            line_total=Decimal("4500.00"),
        )
        OrderEvent.objects.create(order=order, status="PAID", note="Payment verified")
        OrderEvent.objects.create(order=order, status="SHIPPED", note="Dispatched via GIG Logistics")

    print("E2E seed ready:", brand.slug, product.name, order.tracking_code)


if __name__ == "__main__":
    seed()
