import os
import re
import requests
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils.html import strip_tags

# Exact WhatsApp VIP Community link
WA_COMMUNITY_LINK = "https://chat.whatsapp.com/LMGlpUWATmVE2t98iKIcY4"
WA_DIRECT_SUPPORT = "https://wa.me/2349064556107?text=Hi%20SmartBiz%20Coach%2C%20I%20just%20signed%20up%20and%20want%20to%20join%20the%20community!"


def get_brevo_api_key():
    for key_name in [
        'BREVO_API_KEY',
        'BREVO_KEY',
        'SENDINBLUE_API_KEY',
        'BREVO_API',
        'BREVO_APIKEY',
        'SIB_API_KEY',
        'BREVO_TOKEN',
        'EMAIL_HOST_PASSWORD',
        'BREVO_SMTP_KEY',
    ]:
        val = os.getenv(key_name, '').strip()
        if val and len(val) > 15:
            return val
    return ''


def get_sender_email(fallback='noreply@smartbizcoach.com.ng'):
    for key_name in [
        'BREVO_SENDER_EMAIL',
        'BREVO_FROM_EMAIL',
        'SENDER_EMAIL',
        'DEFAULT_FROM_EMAIL',
        'EMAIL_HOST_USER',
    ]:
        val = os.getenv(key_name, '').strip()
        if val and '@' in val and not val.endswith('@smtp-brevo.com'):
            if '<' in val and '>' in val:
                return val.split('<')[-1].replace('>', '').strip()
            return val
    return fallback


def _deliver_email(recipient_email, subject, html_content, sender_name="SmartBiz Coach", from_email=None):
    """
    Unified, ultra-resilient email delivery engine:
    1. Brevo (Sendinblue) v3 REST API (handles any key name + smart verified sender fallback).
    2. Resend REST API (via RESEND_API_KEY).
    3. Direct Python SMTP Relay (Brevo / Custom SMTP over TLS).
    4. Django standard Email Backend (in DEBUG mode).
    """
    brevo_api_key = get_brevo_api_key()
    sender_email_addr = from_email or get_sender_email()
    if '<' in sender_email_addr and '>' in sender_email_addr:
        pure_email = sender_email_addr.split('<')[-1].replace('>', '').strip()
    else:
        pure_email = sender_email_addr.strip()

    # ── 1. Brevo v3 Transactional REST API ──────────────────────────────────
    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            payload = {
                "sender": {
                    "name": sender_name,
                    "email": pure_email
                },
                "to": [
                    {
                        "email": recipient_email,
                        "name": recipient_email.split('@')[0]
                    }
                ],
                "subject": subject,
                "htmlContent": html_content
            }
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "content-type": "application/json"
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=15)
            if resp.status_code in [200, 201]:
                message_id = resp.json().get('messageId', 'sent')
                print(f"[OK] Brevo API Email Delivered to {recipient_email} [ID: {message_id}]")
                return True, f"Delivered via Brevo ({message_id})"
            else:
                err_text = resp.text
                print(f"[NOTE] Brevo API response note ({resp.status_code}): {err_text}")
                # If Brevo rejects due to unverified sender domain, retry with account root email
                if 'unverified' in err_text.lower() or 'sender' in err_text.lower() or 'not found' in err_text.lower():
                    alt_sender = os.getenv('BREVO_SENDER_EMAIL', '').strip() or 'meshachzax@gmail.com'
                    if alt_sender and alt_sender != pure_email:
                        print(f"[RETRY] Retrying Brevo API with alternative verified sender: {alt_sender}...")
                        payload['sender']['email'] = alt_sender
                        retry_resp = requests.post(url, json=payload, headers=headers, timeout=15)
                        if retry_resp.status_code in [200, 201]:
                            message_id = retry_resp.json().get('messageId', 'sent')
                            print(f"[OK] Brevo API Email Delivered to {recipient_email} via {alt_sender} [ID: {message_id}]")
                            return True, f"Delivered via Brevo ({message_id})"
                        else:
                            print(f"[NOTE] Brevo API retry note ({retry_resp.status_code}): {retry_resp.text}")
        except Exception as ex:
            print(f"[NOTE] Brevo API exception: {ex}")

    # ── 2. Resend REST API ──────────────────────────────────────────────────
    resend_api_key = os.getenv('RESEND_API_KEY', '').strip()
    if resend_api_key:
        try:
            resend_sender = from_email or os.getenv('RESEND_FROM_EMAIL', '') or f"{sender_name} <onboarding@resend.dev>"
            payload = {
                "from": resend_sender,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content
            }
            headers = {
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            }
            resp = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=15)
            if resp.status_code in [200, 201]:
                email_id = resp.json().get('id', 'sent')
                print(f"[OK] Resend Email Delivered to {recipient_email} [ID: {email_id}]")
                return True, f"Delivered via Resend ({email_id})"
            else:
                print(f"[NOTE] Resend API response error ({resp.status_code}): {resp.text}")
        except Exception as ex:
            print(f"[NOTE] Resend API exception: {ex}")

    # ── 3. Direct Python SMTP Relay (Brevo / Custom SMTP) ───────────────────
    smtp_user = os.getenv('EMAIL_HOST_USER', '').strip()
    smtp_pass = os.getenv('EMAIL_HOST_PASSWORD', '').strip() or brevo_api_key
    smtp_host = os.getenv('EMAIL_HOST', 'smtp-relay.brevo.com').strip()
    smtp_port = int(os.getenv('EMAIL_PORT', '587'))

    if smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{sender_name} <{pure_email}>"
            msg['To'] = recipient_email

            part1 = MIMEText(strip_tags(html_content), 'plain', 'utf-8')
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(pure_email, [recipient_email], msg.as_string())

            print(f"[OK] Email sent to {recipient_email} via direct SMTP ({smtp_host})")
            return True, f"Delivered via SMTP ({smtp_host})"
        except Exception as smtp_err:
            print(f"[NOTE] Direct SMTP relay error: {smtp_err}")

    # ── 4. Local Development Fallback (DEBUG mode only) ──────────────────────
    if getattr(settings, 'DEBUG', False):
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=strip_tags(html_content),
                from_email=f"{sender_name} <{pure_email}>",
                to=[recipient_email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            print(f"[OK] Email logged to local console (DEBUG=True)")
            return True, "Delivered to local dev console"
        except Exception as e:
            return False, f"Local mail backend error: {e}"

    error_summary = "Email delivery failed: live email provider (Brevo API) could not be reached. Please check BREVO_API_KEY and verified sender in Brevo."
    print(f"[ERROR] {error_summary}")
    return False, error_summary


def send_welcome_email(user):
    """
    Sends a warm, high-converting HTML welcome email to newly registered users,
    including their 200 Free BizCredits, setup guide, and official WhatsApp Community link.
    """
    recipient_email = getattr(user, 'email', '').strip()
    if not recipient_email or '@' not in recipient_email:
        return False

    name = user.get_full_name() or user.business_name or user.username or "Entrepreneur"
    subject = f"Welcome to SmartBiz Coach, {name}! 🚀 (200 Free BizCredits Inside)"
    dashboard_url = "https://www.smartbizcoach.com.ng/dashboard"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #1E293B; margin: 0; padding: 30px 15px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
        
        <!-- Header Banner -->
        <tr>
          <td style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
            <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.5px;">Welcome to SmartBiz Coach</h1>
            <p style="color: #C7D2FE; font-size: 14px; margin: 0; line-height: 1.5;">The #1 AI Business Operating System for Nigerian MSMEs</p>
          </td>
        </tr>

        <!-- Welcome Body -->
        <tr>
          <td style="padding: 35px 30px;">
            <p style="font-size: 16px; color: #0F172A; line-height: 1.6; margin-top: 0;">
              Hello <strong>{name}</strong>,
            </p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Congratulations on taking the bold step to digitize, formalize, and scale your business! We have credited your wallet with <strong>⚡ 200 Free BizCredits</strong> to get you started immediately.
            </p>

            <!-- 200 Credits Box -->
            <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 14px; padding: 18px 20px; margin: 25px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: 800; color: #3730A3;">⚡ 200 BizCredits Active</span>
              <p style="color: #4F46E5; font-size: 12px; margin: 5px 0 0 0; font-weight: 600;">Use for AI Brand Generation, BOI Business Plans & WhatsApp Debt Reminders</p>
            </div>

            <!-- WhatsApp Community Highlight -->
            <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border: 1px solid #A7F3D0; border-radius: 16px; padding: 22px 20px; margin: 25px 0; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 6px;">💬</div>
              <h3 style="color: #065F46; font-size: 17px; margin: 0 0 8px 0; font-weight: 700;">Join Our WhatsApp VIP Traders Community</h3>
              <p style="color: #047857; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                Connect directly with fellow Nigerian merchants, receive weekly grant alerts (BOI/iDICE/TEF), and get instant 24/7 technical support.
              </p>
              <a href="{WA_COMMUNITY_LINK}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: bold; padding: 12px 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                👉 Join WhatsApp VIP Community Now
              </a>
            </div>

            <!-- 3 Quick Activation Steps -->
            <h3 style="color: #0F172A; font-size: 16px; margin: 25px 0 15px 0;">3 Quick Steps to Setup Your Business:</h3>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155; line-height: 1.5;">
              <tr>
                <td width="32" valign="top" style="padding-bottom: 15px;"><span style="background-color: #EEF2FF; color: #4F46E5; font-weight: bold; padding: 4px 8px; border-radius: 6px;">1</span></td>
                <td style="padding-bottom: 15px; padding-left: 8px;">
                  <strong>Create Your Brand DNA:</strong> Set up your elevator pitch, brand voice, and taglines in 60 seconds.
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding-bottom: 15px;"><span style="background-color: #ECFDF5; color: #059669; font-weight: bold; padding: 4px 8px; border-radius: 6px;">2</span></td>
                <td style="padding-bottom: 15px; padding-left: 8px;">
                  <strong>Connect Direct Bank Settlement:</strong> Link your OPay/Bank account under Settings to receive next-day customer payouts.
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding-bottom: 15px;"><span style="background-color: #FFFBEB; color: #D97706; font-weight: bold; padding: 4px 8px; border-radius: 6px;">3</span></td>
                <td style="padding-bottom: 15px; padding-left: 8px;">
                  <strong>Launch Your Public Store & Market Square Listing:</strong> Snap a photo of your product and start selling nationwide.
                </td>
              </tr>
            </table>

            <!-- Dashboard Button -->
            <div style="text-align: center; margin: 30px 0 15px 0;">
              <a href="{dashboard_url}" target="_blank" style="display: inline-block; background-color: #1E1B4B; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: bold; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(30, 27, 75, 0.4);">
                Go to My Dashboard ➔
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 25px 30px; text-align: center;">
            <p style="color: #64748B; font-size: 12px; margin: 0 0 6px 0;">
              SmartBiz Coach • The AI Business Operating System for Nigerian MSMEs
            </p>
            <p style="color: #94A3B8; font-size: 11px; margin: 0;">
              Join our WhatsApp Community: <a href="{WA_COMMUNITY_LINK}" style="color: #059669; font-weight: bold; text-decoration: underline;">Click Here</a> | Support: <a href="{WA_DIRECT_SUPPORT}" style="color: #4F46E5; text-decoration: underline;">+234 906 455 6107</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    success, _ = _deliver_email(recipient_email, subject, html_content, sender_name="SmartBiz Coach")
    return success


def send_password_reset_email(user, code):
    """
    Sends a professional HTML email containing the 6-digit password recovery code.
    """
    recipient_email = getattr(user, 'email', '').strip()
    if not recipient_email or '@' not in recipient_email:
        return False

    name = user.get_full_name() or user.business_name or user.username or "Entrepreneur"
    subject = "SmartBiz Coach - Your Password Reset Code 🔑"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #1E293B; margin: 0; padding: 30px 15px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
        
        <!-- Header Banner -->
        <tr>
          <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 35px 30px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
            <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">Password Reset Request</h1>
            <p style="color: #94A3B8; font-size: 13px; margin: 0;">SmartBiz Coach Account Security</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 35px 30px;">
            <p style="font-size: 15px; color: #0F172A; line-height: 1.6; margin-top: 0;">
              Hello <strong>{name}</strong>,
            </p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              We received a request to reset the password for your SmartBiz Coach account. Use the 6-digit verification code below to complete your password reset:
            </p>

            <!-- Verification Code Box -->
            <div style="background-color: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 16px; padding: 22px 20px; margin: 25px 0; text-align: center;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #16A34A; font-family: monospace;">{code}</span>
              <p style="color: #64748B; font-size: 12px; margin: 8px 0 0 0; font-weight: 600;">⏱️ This code will expire in 15 minutes</p>
            </div>

            <p style="font-size: 13px; color: #64748B; line-height: 1.6;">
              If you did not request this code, you can safely ignore this email. Your account password will remain unchanged.
            </p>

            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8;">
              Need help? Contact our WhatsApp Support at <a href="{WA_DIRECT_SUPPORT}" style="color: #059669; font-weight: bold; text-decoration: none;">+234 906 455 6107</a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center;">
            <p style="color: #94A3B8; font-size: 11px; margin: 0;">
              SmartBiz Coach • The AI Business Operating System for Nigerian MSMEs
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    success, _ = _deliver_email(recipient_email, subject, html_content, sender_name="SmartBiz Coach")
    return success


def send_broadcast_email(recipient_email, recipient_name, subject, body_content, sender_name="SmartBiz Merchant", business_name="", logo_url=""):
    """
    Renders and delivers a marketing broadcast email with professional HTML formatting.
    """
    if not recipient_email or '@' not in recipient_email:
        return False, "Invalid email address"

    name = recipient_name or "Valued Customer"
    biz_name = business_name or sender_name or "SmartBiz Merchant"
    
    # Process line breaks if plain text
    formatted_body = body_content.replace('\n', '<br>')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F1F5F9; color: #1E293B; margin: 0; padding: 25px 10px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
        
        <!-- Header -->
        <tr>
          <td style="background-color: #0F172A; padding: 25px 30px; text-align: center;">
            <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">
              {biz_name}
            </h2>
          </td>
        </tr>

        <!-- Email Body -->
        <tr>
          <td style="padding: 30px 25px;">
            <p style="font-size: 15px; color: #0F172A; line-height: 1.6; margin-top: 0;">
              Hello <strong>{name}</strong>,
            </p>
            <div style="font-size: 14px; color: #334155; line-height: 1.7; margin: 18px 0;">
              {formatted_body}
            </div>
            <div style="margin-top: 25px; padding-top: 18px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #64748B;">
              Best regards,<br>
              <strong style="color: #0F172A;">{sender_name}</strong><br>
              <span style="color: #4F46E5;">{biz_name}</span>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 25px; text-align: center;">
            <p style="color: #94A3B8; font-size: 11px; margin: 0;">
              You received this message from {biz_name} via SmartBiz Marketing Hub.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    return _deliver_email(recipient_email, subject, html_content, sender_name=sender_name)
