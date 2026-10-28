import os
import re
import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import timedelta
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import views, permissions, status
from rest_framework.response import Response


def get_whatsapp_cloud_config() -> dict:
    """
    Reads Meta WhatsApp Business Cloud API credentials from environment variables.
    """
    access_token = (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip()
    phone_number_id = (os.getenv("WHATSAPP_PHONE_NUMBER_ID") or "").strip()
    verify_token = (os.getenv("WHATSAPP_VERIFY_TOKEN") or "smartbiz_whatsapp_verify_2026").strip()
    waba_id = (os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID") or "").strip()
    api_version = (os.getenv("WHATSAPP_GRAPH_VERSION") or "v21.0").strip()

    is_live = bool(access_token and phone_number_id)
    return {
        "is_live": is_live,
        "mode": "CLOUD_API_LIVE" if is_live else "DEEP_LINK_READY",
        "access_token": access_token,
        "phone_number_id": phone_number_id,
        "verify_token": verify_token,
        "waba_id": waba_id,
        "api_version": api_version,
    }


def normalize_ng_phone(phone: str) -> str:
    """
    Normalizes Nigerian phone numbers (e.g. 08031234567 -> 2348031234567) for Meta Graph API & wa.me.
    """
    digits = re.sub(r"\D", "", str(phone or ""))
    if digits.startswith("0") and len(digits) == 11:
        digits = "234" + digits[1:]
    elif len(digits) == 10 and digits[0] in ("7", "8", "9"):
        digits = "234" + digits
    return digits


class WhatsAppOutboundService:
    """
    Dispatches outbound WhatsApp messages via Meta Graph API v21.0 when credentials are configured,
    or generates a deterministic wa.me Click-to-Chat deep link when running in Deep-Link Mode.
    """

    @staticmethod
    def send_message(to_phone: str, message_text: str, preview_url: bool = False) -> dict:
        cfg = get_whatsapp_cloud_config()
        clean_phone = normalize_ng_phone(to_phone)
        encoded_text = urllib.parse.quote(str(message_text or ""))
        deep_link = f"https://wa.me/{clean_phone}?text={encoded_text}" if clean_phone else f"https://wa.me/?text={encoded_text}"

        if not cfg["is_live"] or not clean_phone:
            return {
                "sent_via_cloud_api": False,
                "mode": "DEEP_LINK_FALLBACK",
                "to_phone": clean_phone,
                "whatsapp_url": deep_link,
                "message": "WhatsApp Cloud API credentials not yet set; returning 1-tap wa.me deep link.",
            }

        url = f"https://graph.facebook.com/{cfg['api_version']}/{cfg['phone_number_id']}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": bool(preview_url),
                "body": str(message_text)[:4096],
            },
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {cfg['access_token']}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                msg_id = (body.get("messages") or [{}])[0].get("id", "")
                return {
                    "sent_via_cloud_api": True,
                    "mode": "CLOUD_API_LIVE",
                    "to_phone": clean_phone,
                    "whatsapp_message_id": msg_id,
                    "whatsapp_url": deep_link,
                }
        except Exception as exc:
            return {
                "sent_via_cloud_api": False,
                "mode": "DEEP_LINK_FALLBACK",
                "to_phone": clean_phone,
                "whatsapp_url": deep_link,
                "error": str(exc),
            }


class WhatsAppCommandEngine:
    """
    Parses incoming WhatsApp messages from merchants or customers and executes ledger/catalog actions:
      - "Sold 3 cartons of Indomie for 18000" -> Logs DailySale + updates stock
      - "Spent 4500 on generator fuel" -> Logs DailyExpense
      - "Balance" / "Summary" -> Returns today's sales, expenses, and SmartScore™
      - "Debtors" / "Gbege" -> Lists unpaid credit sales
    """

    SALE_REGEX = re.compile(
        r"^(?:sold|sale|log\s+sale)[:\s]+(?:(\d+)\s+(?:units?\s+of|bags?\s+of|cartons?\s+of|packs?\s+of|pieces?\s+of|pcs?\s+of)?\s*)?(.+?)\s+(?:for|at|@|₦|naira|ngn)\s*₦?([0-9,]+(?:\.[0-9]{1,2})?)(?:\s+(cash|transfer|pos|credit))?$",
        re.IGNORECASE,
    )
    EXPENSE_REGEX = re.compile(
        r"^(?:spent|expense|paid)[:\s]+₦?([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:on|for)\s+(.+)$",
        re.IGNORECASE,
    )

    @classmethod
    def process_message(cls, user, sender_phone: str, raw_text: str) -> dict:
        from marketplace.models import DailySale, DailyExpense, Product
        from analytics_ml.services import CreditScoringService

        text = (raw_text or "").strip()
        lower = text.lower()

        if not user:
            return {
                "intent": "UNLINKED_SENDER",
                "reply": (
                    "Welcome to *SmartBiz Coach AI*! 🇳🇬\n"
                    "To log sales or check your SmartScore™ via WhatsApp, link your WhatsApp number in your Store Settings."
                ),
            }

        # 1. Sale Logging Command
        sale_match = cls.SALE_REGEX.match(text)
        if sale_match:
            qty = max(1, int(sale_match.group(1) or 1))
            item_name = sale_match.group(2).strip().title()
            total_amount = float(sale_match.group(3).replace(",", ""))
            method_raw = (sale_match.group(4) or "CASH").upper()
            payment_method = method_raw if method_raw in ("CASH", "TRANSFER", "POS", "CREDIT") else "CASH"
            unit_price = round(total_amount / qty, 2)

            matched_product = Product.objects.filter(brand__user=user, name__icontains=item_name).first()
            sale = DailySale.objects.create(
                user=user,
                product=matched_product,
                item_name=matched_product.name if matched_product else item_name,
                quantity=qty,
                unit_price=unit_price,
                total_amount=total_amount,
                payment_method=payment_method,
                is_debt=(payment_method == "CREDIT"),
            )
            if matched_product and getattr(matched_product, "stock_count", 0) >= qty:
                matched_product.stock_count = max(0, matched_product.stock_count - qty)
                matched_product.save(update_fields=["stock_count"])

            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_total = sum(
                float(s.total_amount or 0)
                for s in DailySale.objects.filter(user=user, created_at__gte=today_start)
            )
            return {
                "intent": "SALE_LOGGED",
                "sale_id": sale.id,
                "reply": (
                    f"✅ *Sale Recorded in Daily Day-Book!*\n"
                    f"• Item: {sale.item_name} (x{qty})\n"
                    f"• Amount: ₦{total_amount:,.2f} ({payment_method})\n"
                    f"• Today's Running GMV: *₦{today_total:,.2f}*"
                ),
            }

        # 2. Expense Logging Command
        exp_match = cls.EXPENSE_REGEX.match(text)
        if exp_match:
            amount = float(exp_match.group(1).replace(",", ""))
            desc = exp_match.group(2).strip()
            desc_lower = desc.lower()
            if any(k in desc_lower for k in ("fuel", "diesel", "petrol", "gen", "generator", "nepa", "power")):
                cat = "FUEL_GEN"
            elif any(k in desc_lower for k in ("waybill", "delivery", "dispatch", "rider", "transport")):
                cat = "LOGISTICS"
            elif any(k in desc_lower for k in ("restock", "stock", "supplier", "market")):
                cat = "INVENTORY"
            else:
                cat = "OTHER"

            exp = DailyExpense.objects.create(
                user=user,
                title=desc[:120].title(),
                amount=amount,
                category=cat,
            )
            return {
                "intent": "EXPENSE_LOGGED",
                "expense_id": exp.id,
                "reply": (
                    f"🧾 *Expense Logged in Petty Cash Book!*\n"
                    f"• Purpose: {exp.title} ({cat})\n"
                    f"• Amount: ₦{amount:,.2f}"
                ),
            }

        # 3. Daily Summary / Credit Score Command
        if lower in ("balance", "summary", "report", "today", "score", "smartscore"):
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_sales = sum(
                float(s.total_amount or 0)
                for s in DailySale.objects.filter(user=user, created_at__gte=today_start)
            )
            today_exp = sum(
                float(e.amount or 0)
                for e in DailyExpense.objects.filter(user=user, created_at__gte=today_start)
            )
            credit = CreditScoringService.calculate_credit_score(user)
            return {
                "intent": "DAILY_SUMMARY",
                "credit_score": credit["credit_score"],
                "reply": (
                    f"📊 *SmartBiz Daily Executive Summary*\n"
                    f"• Today's Sales: ₦{today_sales:,.2f}\n"
                    f"• Today's Expenses: ₦{today_exp:,.2f}\n"
                    f"• Today's Net Cash: *₦{today_sales - today_exp:,.2f}*\n"
                    f"• SmartScore™: *{credit['credit_score']}/850* ({credit['rating_tier']})\n"
                    f"• Pre-Qualified Limit: ₦{credit['recommended_loan_limit_ngn']:,.0f}"
                ),
            }

        # 4. Debtors / Gbege Command
        if lower in ("debtors", "gbege", "credit", "owed"):
            unpaid = list(DailySale.objects.filter(user=user, payment_method="CREDIT", is_debt=True)[:5])
            total_owed = sum(float(s.total_amount or 0) for s in unpaid)
            if not unpaid:
                return {
                    "intent": "DEBTORS_LIST",
                    "reply": "🎉 Your Gbege Book is 100% clean! Zero unpaid credit sales.",
                }
            lines = [f"• {s.customer_name or 'Customer'}: ₦{float(s.total_amount):,.0f} ({s.item_name})" for s in unpaid]
            return {
                "intent": "DEBTORS_LIST",
                "reply": (
                    f"📒 *Open Credit Sales (₦{total_owed:,.0f} Owed)*\n"
                    + "\n".join(lines)
                ),
            }

        return {
            "intent": "HELP_MENU",
            "reply": (
                "🤖 *SmartBiz Coach WhatsApp Assistant*\n"
                "Send any of these quick commands:\n"
                "1️⃣ *Sold 3 cartons of Indomie for 18000*\n"
                "2️⃣ *Spent 4500 on generator fuel*\n"
                "3️⃣ *Summary* (Today's cashflow & SmartScore™)\n"
                "4️⃣ *Debtors* (Check unpaid Gbege balances)"
            ),
        }


class WhatsAppConfigStatusView(views.APIView):
    """
    Returns current Meta WhatsApp Cloud API readiness and webhook configuration instructions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cfg = get_whatsapp_cloud_config()
        return Response({
            "mode": cfg["mode"],
            "is_cloud_api_live": cfg["is_live"],
            "phone_number_id_configured": bool(cfg["phone_number_id"]),
            "access_token_configured": bool(cfg["access_token"]),
            "webhook_callback_path": "/api/marketplace/whatsapp/webhook/",
            "verify_token_hint": cfg["verify_token"][:6] + "***",
            "supported_commands": [
                "Sold 3 cartons of Indomie for 18000",
                "Spent 4500 on generator fuel",
                "Summary",
                "Debtors",
            ],
        }, status=status.HTTP_200_OK)


class WhatsAppWebhookView(views.APIView):
    """
    Meta WhatsApp Business Cloud API Webhook Endpoint:
      - GET: Verifies Meta hub.challenge with WHATSAPP_VERIFY_TOKEN.
      - POST: Processes incoming WhatsApp messages (both Meta Cloud webhook payloads and simulator payloads).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cfg = get_whatsapp_cloud_config()
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge", "")

        if mode == "subscribe" and token == cfg["verify_token"]:
            return HttpResponse(str(challenge), content_type="text/plain", status=200)
        return Response({"error": "Webhook verification token mismatch."}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        from django.contrib.auth import get_user_model
        from marketplace.models import VendorVerification

        User = get_user_model()
        data = request.data or {}

        # Extract sender phone and text from either Meta Cloud API payload or direct simulator payload
        sender_phone = ""
        message_text = ""

        if "entry" in data:
            try:
                changes = data["entry"][0]["changes"][0]["value"]
                messages = changes.get("messages") or []
                if messages:
                    msg = messages[0]
                    sender_phone = msg.get("from", "")
                    message_text = (msg.get("text") or {}).get("body", "")
            except (KeyError, IndexError, TypeError):
                pass
        else:
            sender_phone = str(data.get("from") or data.get("phone") or "")
            message_text = str(data.get("text") or data.get("message") or "")

        if not message_text:
            return Response({"status": "ignored", "reason": "No text message body"}, status=status.HTTP_200_OK)

        # Resolve merchant user from authenticated session or phone number
        target_user = request.user if (getattr(request, "user", None) and request.user.is_authenticated) else None
        if not target_user and sender_phone:
            clean_sender = normalize_ng_phone(sender_phone)
            last_10 = clean_sender[-10:] if len(clean_sender) >= 10 else clean_sender
            if last_10:
                target_user = User.objects.filter(phone__icontains=last_10).first()
                if not target_user:
                    vv = VendorVerification.objects.filter(whatsapp_number__icontains=last_10).select_related("user").first()
                    if vv:
                        target_user = vv.user

        result = WhatsAppCommandEngine.process_message(target_user, sender_phone, message_text)

        # If Cloud API is live and sender_phone is present, send the automated reply back on WhatsApp
        outbound_receipt = None
        if sender_phone and result.get("reply"):
            outbound_receipt = WhatsAppOutboundService.send_message(sender_phone, result["reply"])

        return Response({
            **result,
            "status": "processed",
            "outbound": outbound_receipt,
        }, status=status.HTTP_200_OK)


class WhatsAppOutboundView(views.APIView):
    """
    Authenticated endpoint to send an outbound WhatsApp message (debt reminder, order receipt,
    supplier restock order) via Cloud API or fallback wa.me deep link.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        to_phone = str(request.data.get("to_phone") or request.data.get("phone") or "")
        message = str(request.data.get("message") or request.data.get("text") or "").strip()
        if not message:
            return Response({"error": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)

        dispatch_res = WhatsAppOutboundService.send_message(to_phone, message)
        return Response(dispatch_res, status=status.HTTP_200_OK)
