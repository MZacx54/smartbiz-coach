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

    contact, created = Contact.objects.get_or_create(
        user=request.user,
        phone=phone,
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

    for i, row in enumerate(reader):
        phone = (row.get('phone') or row.get('Phone') or row.get('PHONE') or '').strip()
        name = (row.get('name') or row.get('Name') or row.get('NAME') or '').strip()
        tags = (row.get('tags') or row.get('Tags') or '').strip()

        if not phone:
            errors.append(f"Row {i + 2}: Missing phone number")
            continue

        # Normalize Nigerian numbers
        phone = normalize_phone(phone)

        try:
            _, created = Contact.objects.get_or_create(
                user=request.user,
                phone=phone,
                defaults={'name': name, 'tags': tags}
            )
            if created:
                imported += 1
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
            }
            for c in campaigns
        ])

    # POST — create campaign
    data = request.data
    campaign = Campaign.objects.create(
        user=request.user,
        name=data.get('name', 'Untitled Campaign'),
        message_template=data.get('message_template', ''),
        channel=data.get('channel', 'WHATSAPP'),
        daily_limit=int(data.get('daily_limit', 100)),
        status='DRAFT',
    )

    # Count total contacts
    campaign.total_contacts = Contact.objects.filter(
        user=request.user, is_opted_out=False
    ).count()
    campaign.save()

    return Response({
        'id': campaign.id,
        'name': campaign.name,
        'channel': campaign.channel,
        'total_contacts': campaign.total_contacts,
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
    batch_size = min(int(request.data.get('batch_size', 100)), 200)  # Max 200/day

    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user)
    except Campaign.DoesNotExist:
        return Response({'error': 'Campaign not found'}, status=404)

    # Get contacts not yet messaged by this campaign
    messaged_phones = MessageLog.objects.filter(
        campaign=campaign
    ).values_list('phone', flat=True)

    contacts = Contact.objects.filter(
        user=request.user,
        is_opted_out=False
    ).exclude(phone__in=messaged_phones)[:batch_size]

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

    contacts = Contact.objects.filter(
        user=request.user, is_opted_out=False
    ).exclude(phone__in=messaged_phones)[:batch_size]

    if not contacts:
        return Response({'message': 'No more contacts to message in this campaign.', 'sent': 0})

    results = []
    sent_count = 0
    failed_count = 0

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

    return Response({
        'total_contacts': total_contacts,
        'active_contacts': total_contacts - opted_out,
        'opted_out': opted_out,
        'total_campaigns': total_campaigns,
        'total_messages_sent': total_sent,
        'termii_configured': bool(get_termii_key()),
    })
