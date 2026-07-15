import csv
import io
import json
import requests
import os
from datetime import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contact, Campaign, MessageLog
from billing.models import CreditLedger  # For deducting credits on SMS sending

def get_plan_limits(user):
    """
    Returns the limitations and rules for a user based on their subscription plan.
    - Owner/Admin (meshachzax@gmail.com) gets absolute bypass.
    - Pro Plan: Unlimited contacts, 200 daily WA limit, SMS enabled (2 credits/SMS).
    - Free Plan: 500 contacts, 20 daily WA limit, 1 active campaign, SMS disabled.
    """
    if user.email == 'meshachzax@gmail.com':
        return {
            'plan_name': 'Admin/Owner',
            'max_contacts': 999999,
            'max_batch_size': 500,
            'max_campaigns': 9999,
            'can_send_sms': True,
            'sms_credit_cost': 0,
            'bypass_limits': True
        }
    
    plan = getattr(user, 'plan', 'Free')
    if plan == 'Pro':
        return {
            'plan_name': 'Pro Plan',
            'max_contacts': 999999,
            'max_batch_size': 200,
            'max_campaigns': 9999,
            'can_send_sms': True,
            'sms_credit_cost': 2,
            'bypass_limits': False
        }
    
    # Default: Free Plan
    return {
        'plan_name': 'Free Plan',
        'max_contacts': 500,
        'max_batch_size': 20,
        'max_campaigns': 1,
        'can_send_sms': False,
        'sms_credit_cost': 2,
        'bypass_limits': False
    }



# ──────────────────────────────────────────────────────────────────────────────
# CONTACT MANAGEMENT
# ──────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def contacts_list(request):
    """List all contacts or add a single contact."""
    if request.method == 'GET':
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 50))
        search = request.GET.get('search', '')

        qs = Contact.objects.filter(user=request.user)
        if search:
            qs = qs.filter(phone__icontains=search) | qs.filter(name__icontains=search)

        total = qs.count()
        contacts = qs[(page - 1) * per_page: page * per_page]

        return Response({
            'total': total,
            'page': page,
            'per_page': per_page,
            'contacts': [
                {
                    'id': c.id,
                    'name': c.name,
                    'phone': c.phone,
                    'tags': c.tags,
                    'is_opted_out': c.is_opted_out,
                    'last_messaged_at': c.last_messaged_at,
                    'created_at': c.created_at,
                }
                for c in contacts
            ]
        })

    # POST — add single contact
    data = request.data
    phone = data.get('phone', '').strip()
    if not phone:
        return Response({'error': 'Phone number is required'}, status=400)

    normalized = normalize_phone(phone)
    limits = get_plan_limits(request.user)
    
    # Check limit if creating a new contact
    if not Contact.objects.filter(user=request.user, phone=normalized).exists():
        current_count = Contact.objects.filter(user=request.user).count()
        if current_count >= limits['max_contacts']:
            return Response({
                'error': f"Contact limit of {limits['max_contacts']} reached for your {limits['plan_name']}. Please upgrade to add more."
            }, status=400)

    contact, created = Contact.objects.get_or_create(
        user=request.user,
        phone=normalized,
        defaults={'name': data.get('name', ''), 'tags': data.get('tags', '')}
    )
    return Response({
        'id': contact.id,
        'name': contact.name,
        'phone': contact.phone,
        'created': created
    }, status=201 if created else 200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def contact_detail(request, contact_id):
    """Delete a contact."""
    try:
        contact = Contact.objects.get(id=contact_id, user=request.user)
        contact.delete()
        return Response({'success': True})
    except Contact.DoesNotExist:
        return Response({'error': 'Contact not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_contacts_csv(request):
    """
    Upload a CSV file with contacts.
    Expected columns: phone, name (optional), tags (optional)
    Returns: {imported: N, duplicates: M, errors: [...]}
    """
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded. Send a CSV file as "file" field.'}, status=400)

    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a .csv file'}, status=400)

    decoded = csv_file.read().decode('utf-8', errors='ignore')
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    duplicates = 0
    errors = []

    limits = get_plan_limits(request.user)
    current_count = Contact.objects.filter(user=request.user).count()
    limit_reached = False

    for i, row in enumerate(reader):
        phone = (row.get('phone') or row.get('Phone') or row.get('PHONE') or '').strip()
        name = (row.get('name') or row.get('Name') or row.get('NAME') or '').strip()
        tags = (row.get('tags') or row.get('Tags') or '').strip()

        if not phone:
            errors.append(f"Row {i + 2}: Missing phone number")
            continue

        # Normalize Nigerian numbers
        phone = normalize_phone(phone)

        # Check limit before trying to get_or_create
        if not Contact.objects.filter(user=request.user, phone=phone).exists():
            if current_count >= limits['max_contacts']:
                limit_reached = True
                errors.append(f"Upload halted: Contact limit of {limits['max_contacts']} reached for your {limits['plan_name']}.")
                break

        try:
            _, created = Contact.objects.get_or_create(
                user=request.user,
                phone=phone,
                defaults={'name': name, 'tags': tags}
            )
            if created:
                imported += 1
                current_count += 1
            else:
                duplicates += 1
        except Exception as e:
            errors.append(f"Row {i + 2}: {str(e)}")

    return Response({
        'imported': imported,
        'duplicates': duplicates,
        'errors': errors[:20],  # Cap at 20 error messages
        'total_contacts': Contact.objects.filter(user=request.user).count()
    })


def normalize_phone(phone: str) -> str:
    """Normalize phone number to international format +234XXXXXXXXXX."""
    phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if phone.startswith('0') and len(phone) == 11:
        phone = '+234' + phone[1:]
    elif phone.startswith('234') and not phone.startswith('+'):
        phone = '+' + phone
    elif not phone.startswith('+'):
        phone = '+234' + phone
    return phone


# ──────────────────────────────────────────────────────────────────────────────
# CAMPAIGN MANAGEMENT
# ──────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaigns_list(request):
    """List campaigns or create a new one."""
    if request.method == 'GET':
        campaigns = Campaign.objects.filter(user=request.user)
        return Response([
            {
                'id': c.id,
                'name': c.name,
                'channel': c.channel,
                'status': c.status,
                'daily_limit': c.daily_limit,
                'total_contacts': c.total_contacts,
                'sent_count': c.sent_count,
                'failed_count': c.failed_count,
                'progress_percent': c.progress_percent,
                'message_template': c.message_template,
                'created_at': c.created_at,
                'scheduled_at': c.scheduled_at,
                'target_tags': c.target_tags,
            }
            for c in campaigns
        ])

    # POST — create campaign
    limits = get_plan_limits(request.user)
    current_campaigns = Campaign.objects.filter(user=request.user).count()
    if current_campaigns >= limits['max_campaigns']:
        return Response({
            'error': f"Campaign limit of {limits['max_campaigns']} reached for your {limits['plan_name']}. Please upgrade to create more campaigns."
        }, status=400)

    data = request.data
    campaign = Campaign.objects.create(
        user=request.user,
        name=data.get('name', 'Untitled Campaign'),
        message_template=data.get('message_template', ''),
        channel=data.get('channel', 'WHATSAPP'),
        daily_limit=int(data.get('daily_limit', 100)),
        status='DRAFT',
        scheduled_at=data.get('scheduled_at') if data.get('scheduled_at') else None,
        target_tags=data.get('target_tags', ''),
    )

    # Count total contacts
    contacts_qs = Contact.objects.filter(user=request.user, is_opted_out=False)
    if campaign.target_tags:
        from django.db.models import Q
        target_tags_list = [t.strip() for t in campaign.target_tags.split(',') if t.strip()]
        if target_tags_list:
            tag_query = Q()
            for tag in target_tags_list:
                tag_query |= Q(tags__icontains=tag)
            contacts_qs = contacts_qs.filter(tag_query)
            
    campaign.total_contacts = contacts_qs.count()
    campaign.save()

    return Response({
        'id': campaign.id,
        'name': campaign.name,
        'channel': campaign.channel,
        'total_contacts': campaign.total_contacts,
        'scheduled_at': campaign.scheduled_at,
        'target_tags': campaign.target_tags,
    }, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_detail(request, campaign_id):
    """Retrieve, update, or delete a campaign."""
    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user)
    except Campaign.DoesNotExist:
        return Response({'error': 'Campaign not found'}, status=404)

    if request.method == 'DELETE':
        campaign.delete()
        return Response({'success': True})

    if request.method == 'PUT':
        data = request.data
        campaign.name = data.get('name', campaign.name)
        campaign.message_template = data.get('message_template', campaign.message_template)
        campaign.daily_limit = int(data.get('daily_limit', campaign.daily_limit))
        campaign.status = data.get('status', campaign.status)
        if 'scheduled_at' in data:
            campaign.scheduled_at = data.get('scheduled_at') if data.get('scheduled_at') else None
        campaign.target_tags = data.get('target_tags', campaign.target_tags)
        
        # Re-evaluate contact count if target_tags changed
        contacts_qs = Contact.objects.filter(user=request.user, is_opted_out=False)
        if campaign.target_tags:
            from django.db.models import Q
            target_tags_list = [t.strip() for t in campaign.target_tags.split(',') if t.strip()]
            if target_tags_list:
                tag_query = Q()
                for tag in target_tags_list:
                    tag_query |= Q(tags__icontains=tag)
                contacts_qs = contacts_qs.filter(tag_query)
        campaign.total_contacts = contacts_qs.count()
        campaign.save()

    return Response({
        'id': campaign.id,
        'name': campaign.name,
        'channel': campaign.channel,
        'status': campaign.status,
        'daily_limit': campaign.daily_limit,
        'total_contacts': campaign.total_contacts,
        'sent_count': campaign.sent_count,
        'failed_count': campaign.failed_count,
        'progress_percent': campaign.progress_percent,
        'message_template': campaign.message_template,
        'scheduled_at': campaign.scheduled_at,
        'target_tags': campaign.target_tags,
    })


# ──────────────────────────────────────────────────────────────────────────────
# WHATSAPP BATCH GENERATOR
# ──────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_whatsapp_batch(request):
    """
    Generate a batch of WhatsApp deep links for today's quota.
    Returns list of {name, phone, message, whatsapp_url} for manual sending.
    This avoids WhatsApp TOS violations while enabling personal outreach.
    """
    campaign_id = request.data.get('campaign_id')
    limits = get_plan_limits(request.user)
    requested_batch_size = int(request.data.get('batch_size', 100))
    batch_size = min(requested_batch_size, limits['max_batch_size'])

    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user)
    except Campaign.DoesNotExist:
        return Response({'error': 'Campaign not found'}, status=404)

    # Get contacts not yet messaged by this campaign
    messaged_phones = MessageLog.objects.filter(
        campaign=campaign
    ).values_list('phone', flat=True)

    contacts_qs = Contact.objects.filter(
        user=request.user,
        is_opted_out=False
    ).exclude(phone__in=messaged_phones)

    if campaign.target_tags:
        from django.db.models import Q
        target_tags_list = [t.strip() for t in campaign.target_tags.split(',') if t.strip()]
        if target_tags_list:
            tag_query = Q()
            for tag in target_tags_list:
                tag_query |= Q(tags__icontains=tag)
            contacts_qs = contacts_qs.filter(tag_query)

    contacts = contacts_qs[:batch_size]

    batch = []
    for contact in contacts:
        # Render message template — replace {{name}} with actual name
        name = contact.name or 'Friend'
        message = campaign.message_template.replace('{{name}}', name)

        # Create WhatsApp deep link
        import urllib.parse
        encoded_msg = urllib.parse.quote(message)
        clean_phone = contact.phone.replace('+', '')
        wa_url = f"https://wa.me/{clean_phone}?text={encoded_msg}"

        # Log as pending
        MessageLog.objects.get_or_create(
            campaign=campaign,
            phone=contact.phone,
            defaults={
                'contact': contact,
                'message': message,
                'status': 'PENDING',
            }
        )

        batch.append({
            'id': contact.id,
            'name': name,
            'phone': contact.phone,
            'message': message,
            'whatsapp_url': wa_url,
        })

    return Response({
        'campaign_id': campaign.id,
        'campaign_name': campaign.name,
        'batch_size': len(batch),
        'remaining': Contact.objects.filter(
            user=request.user, is_opted_out=False
        ).exclude(phone__in=messaged_phones).count() - len(batch),
        'batch': batch
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_batch_sent(request):
    """Mark a list of phones as sent for a campaign."""
    campaign_id = request.data.get('campaign_id')
    phones = request.data.get('phones', [])

    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user)
    except Campaign.DoesNotExist:
        return Response({'error': 'Campaign not found'}, status=404)

    updated = MessageLog.objects.filter(
        campaign=campaign, phone__in=phones, status='PENDING'
    ).update(status='SENT', sent_at=timezone.now())

    campaign.sent_count += updated
    campaign.save()

    # Update contact last_messaged_at
    Contact.objects.filter(
        user=request.user, phone__in=phones
    ).update(last_messaged_at=timezone.now())

    return Response({'marked_sent': updated, 'total_sent': campaign.sent_count})


# ──────────────────────────────────────────────────────────────────────────────
# SMS via TERMII
# ──────────────────────────────────────────────────────────────────────────────

TERMII_API_URL = "https://api.ng.termii.com/api/sms/send"
TERMII_BULK_URL = "https://api.ng.termii.com/api/sms/send/bulk"


def get_termii_key():
    return os.environ.get('TERMII_API_KEY', '')


def calculate_sms_segments(text):
    """Calculate the number of SMS segments based on length."""
    import math
    length = len(text)
    if length <= 160:
        return 1
    # 7-byte User Data Header leaves 153 chars per segment for GSM-7 encoding
    return math.ceil(length / 153)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_sms_batch(request):
    """
    Send SMS to a batch of contacts via Termii.
    Body: { campaign_id, batch_size (max 100), sender_id (optional) }
    """
    campaign_id = request.data.get('campaign_id')
    batch_size = min(int(request.data.get('batch_size', 50)), 100)
    sender_id = request.data.get('sender_id', 'SmartBiz')

    limits = get_plan_limits(request.user)
    if not limits['can_send_sms']:
        return Response({
            'error': f"SMS sending is disabled on your {limits['plan_name']}. Please upgrade to a Pro plan to send SMS."
        }, status=400)

    termii_key = get_termii_key()
    if not termii_key:
        return Response({
            'error': 'TERMII_API_KEY not configured. Add it to your backend .env file.',
            'setup_guide': 'Get your free API key at https://termii.com — Sign up is free with ₦200 free credits.'
        }, status=400)

    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user, channel='SMS')
    except Campaign.DoesNotExist:
        return Response({'error': 'SMS Campaign not found'}, status=404)

    # Get unmessaged contacts
    messaged_phones = MessageLog.objects.filter(
        campaign=campaign, status__in=['SENT', 'DELIVERED']
    ).values_list('phone', flat=True)

    contacts_qs = Contact.objects.filter(
        user=request.user, is_opted_out=False
    ).exclude(phone__in=messaged_phones)

    if campaign.target_tags:
        from django.db.models import Q
        target_tags_list = [t.strip() for t in campaign.target_tags.split(',') if t.strip()]
        if target_tags_list:
            tag_query = Q()
            for tag in target_tags_list:
                tag_query |= Q(tags__icontains=tag)
            contacts_qs = contacts_qs.filter(tag_query)

    contacts = contacts_qs[:batch_size]

    if not contacts:
        return Response({'message': 'No more contacts to message in this campaign.', 'sent': 0})

    # Check credit balance before sending (by segment count)
    num_contacts = len(contacts)
    template_segments = calculate_sms_segments(campaign.message_template)
    credit_cost = num_contacts * template_segments * limits['sms_credit_cost']
    
    if request.user.credits < credit_cost:
        return Response({
            'error': f"Insufficient credits. This batch of {num_contacts} SMS requires {credit_cost} credits ({template_segments} segments per message), but you only have {request.user.credits} credits. Please top up."
        }, status=400)

    results = []
    sent_count = 0
    failed_count = 0
    total_segments_sent = 0

    for contact in contacts:
        name = contact.name or 'Friend'
        message = campaign.message_template.replace('{{name}}', name)

        # Strip + from phone for Termii
        phone = contact.phone.lstrip('+')

        payload = {
            "to": phone,
            "from": sender_id,
            "sms": message,
            "type": "plain",
            "channel": "generic",
            "api_key": termii_key,
        }

        log = MessageLog.objects.create(
            campaign=campaign,
            contact=contact,
            phone=contact.phone,
            message=message,
            status='PENDING',
        )

        try:
            resp = requests.post(TERMII_API_URL, json=payload, timeout=10)
            resp_data = resp.json()

            if resp.status_code == 200 and resp_data.get('code') == 'ok':
                log.status = 'SENT'
                log.sms_message_id = str(resp_data.get('message_id', ''))
                log.sent_at = timezone.now()
                sent_count += 1
                total_segments_sent += calculate_sms_segments(message)
                results.append({'phone': contact.phone, 'status': 'sent'})
            else:
                log.status = 'FAILED'
                log.error_message = str(resp_data)
                failed_count += 1
                results.append({'phone': contact.phone, 'status': 'failed', 'error': str(resp_data)})
        except Exception as e:
            log.status = 'FAILED'
            log.error_message = str(e)
            failed_count += 1
            results.append({'phone': contact.phone, 'status': 'failed', 'error': str(e)})

        log.save()
        Contact.objects.filter(pk=contact.pk).update(last_messaged_at=timezone.now())

    campaign.sent_count += sent_count
    campaign.failed_count += failed_count
    campaign.save()

    # Deduct user credits based on exact segments sent
    if sent_count > 0 and limits['sms_credit_cost'] > 0:
        actual_cost = total_segments_sent * limits['sms_credit_cost']
        request.user.credits = max(0, request.user.credits - actual_cost)
        request.user.save()
        
        CreditLedger.objects.create(
            user=request.user,
            amount=-actual_cost,
            activity=f"Sent {sent_count} SMS ({total_segments_sent} segments) via campaign '{campaign.name}'"
        )

    return Response({
        'sent': sent_count,
        'failed': failed_count,
        'total_sent_in_campaign': campaign.sent_count,
        'progress_percent': campaign.progress_percent,
        'results': results
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def campaign_logs(request, campaign_id):
    """Get message logs for a campaign."""
    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user)
    except Campaign.DoesNotExist:
        return Response({'error': 'Campaign not found'}, status=404)

    page = int(request.GET.get('page', 1))
    per_page = 50
    logs = campaign.logs.all()[(page - 1) * per_page: page * per_page]

    return Response([
        {
            'phone': log.phone,
            'name': log.contact.name if log.contact else '',
            'status': log.status,
            'sent_at': log.sent_at,
            'message': log.message[:100] + '...' if len(log.message) > 100 else log.message,
        }
        for log in logs
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def marketing_stats(request):
    """Get overall marketing statistics for the user."""
    total_contacts = Contact.objects.filter(user=request.user).count()
    opted_out = Contact.objects.filter(user=request.user, is_opted_out=True).count()
    total_campaigns = Campaign.objects.filter(user=request.user).count()
    total_sent = MessageLog.objects.filter(
        campaign__user=request.user, status='SENT'
    ).count()

    limits = get_plan_limits(request.user)
    return Response({
        'total_contacts': total_contacts,
        'active_contacts': total_contacts - opted_out,
        'opted_out': opted_out,
        'total_campaigns': total_campaigns,
        'total_messages_sent': total_sent,
        'termii_configured': bool(get_termii_key()),
        'plan': limits['plan_name'],
        'max_contacts': limits['max_contacts'],
        'max_batch_size': limits['max_batch_size'],
        'max_campaigns': limits['max_campaigns'],
        'can_send_sms': limits['can_send_sms'],
        'sms_credit_cost': limits['sms_credit_cost'],
        'bypass_limits': limits['bypass_limits'],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_suggest_message(request):
    """
    Generate an AI suggested marketing message based on user's BrandIdentity.
    Body parameters:
    - topic: (str) optional, e.g., "discount", "new arrival", "reminder"
    - channel: (str) optional, "WHATSAPP" or "SMS"
    """
    from brand.models import BrandIdentity
    from smartbiz_backend import gemini_utils

    topic = request.data.get('topic', 'General Promotion').strip()
    channel = request.data.get('channel', 'WHATSAPP').upper()

    # Retrieve BrandIdentity
    try:
        brand = BrandIdentity.objects.get(user=request.user)
        biz_name = brand.business_name
        niche = brand.niche or "general retail/service"
        voice = brand.brand_voice or "friendly and professional"
        audience = brand.target_audience or "general public in Nigeria"
        pitch = brand.elevator_pitch or ""
    except Exception:
        # Fallback if profile not created or errored
        biz_name = request.user.business_name or "our business"
        niche = "general retail"
        voice = "friendly and professional"
        audience = "customers"
        pitch = ""

    prompt = f"""
    You are an expert digital marketer for Nigerian SMEs. Write a personalized, high-converting marketing broadcast message for a business with the following profile:
    - Business Name: {biz_name}
    - Niche/Industry: {niche}
    - Target Audience: {audience}
    - Vibe/Brand Voice: {voice}
    - Elevator Pitch: {pitch}

    The objective of this message is: {topic}
    The delivery channel is: {channel}

    Requirements:
    1. Start the message with a greeting that includes the placeholder '{{{{name}}}}' so the user can dynamically insert each contact's name (e.g. "Hi {{{name}}}! 👋" or "Hello {{{name}}},").
    2. Write in a friendly, local, and engaging tone suited for Nigerian customers (you can use popular Nigerian terminology or pidgin phrases if the vibe is casual, e.g., "Quick one," "Trust your day is going well," etc.).
    3. Keep it highly action-oriented (include a clear Call To Action).
    4. Size constraints:
       - If channel is 'SMS', make it very concise (strictly under 160 characters if possible, maximum 300 characters, no emojis).
       - If channel is 'WHATSAPP', make it detailed but readable (under 800 characters, use emojis appropriately, and format with bullet points or bold text where helpful).
    5. Return ONLY the drafted message content. Do not include any intro, outro, or explanations.
    """

    try:
        suggestion = gemini_utils.generate_text_content(prompt)
        # Clean up any potential markdown wraps
        suggestion = suggestion.strip()
        if suggestion.startswith("```"):
            try:
                # If wrapped as ``` or ```text, split it out
                parts = suggestion.split("\n", 1)
                if len(parts) > 1:
                    suggestion = parts[1].rsplit("```", 1)[0].strip()
            except Exception:
                pass
        return Response({'suggestion': suggestion})
    except Exception as e:
        return Response({'error': f"Failed to generate suggestion: {str(e)}"}, status=500)
