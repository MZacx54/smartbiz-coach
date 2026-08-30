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

from .models import Contact, Campaign, MessageLog, SocialConnect
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
    if plan == 'Pro' or user.is_staff or user.is_superuser:
        return {
            'plan_name': 'Pro Plan',
            'max_contacts': 999999,
            'max_batch_size': 200,
            'max_campaigns': 9999,
            'can_send_sms': True,
            'sms_credit_cost': 2,
            'bypass_limits': False
        }
    
    # Default: Free Plan (Can send SMS via BizCredits)
    return {
        'plan_name': 'Free Plan',
        'max_contacts': 500,
        'max_batch_size': 20,
        'max_campaigns': 1,
        'can_send_sms': True,
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
            qs = qs.filter(phone__icontains=search) | qs.filter(name__icontains=search) | qs.filter(email__icontains=search)

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
                    'email': c.email,
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
    email = data.get('email', '').strip()
    
    if not phone and not email:
        return Response({'error': 'Phone number or Email address is required'}, status=400)

    if phone:
        normalized = normalize_phone(phone)
    else:
        # Fallback phone when only email is provided
        normalized = f"+00{abs(hash(email)) % 10000000000}"

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
        defaults={'name': data.get('name', ''), 'email': email, 'tags': data.get('tags', '')}
    )
    if not created:
        if email:
            contact.email = email
        if data.get('name'):
            contact.name = data.get('name')
        if data.get('tags'):
            contact.tags = data.get('tags')
        contact.save()

    return Response({
        'id': contact.id,
        'name': contact.name,
        'phone': contact.phone,
        'email': contact.email,
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


import re

PHONE_HEADERS = [
    'phone', 'phonenumber', 'phone_number', 'phone number', 'phone_no', 'phoneno', 'phone no',
    'mobile', 'mobilenumber', 'mobile_number', 'mobile number', 'mobile_no', 'mobileno', 'mobile no',
    'telephone', 'tel', 'contact', 'contactnumber', 'contact_number', 'contact number',
    'whatsapp', 'whatsappnumber', 'whatsapp_number', 'whatsapp number', 'whatsapp_no', 'whatsapp no',
    'msisdn', 'cell', 'cellular', 'number', 'saved name', 'saved_name'
]

NAME_HEADERS = [
    'name', 'full_name', 'fullname', 'full name', 'saved_name', 'saved name', 'savedname',
    'public_display_name', 'public display name', 'publicdisplayname', 'display_name', 'display name',
    'contact_name', 'contact name', 'first_name', 'firstname', 'customer_name', 'customer name'
]

TAGS_HEADERS = [
    'group_name', 'group name', 'groupname', 'group', 'tags', 'tag', 'category', 'label', 'labels',
    'segment', 'list', 'source'
]

EMAIL_HEADERS = [
    'email', 'e-mail', 'email_address', 'email address', 'email_no', 'mail', 'contact_email', 'contact email',
    'customer_email', 'customer email', 'user_email', 'user email', 'e_mail'
]

COUNTRY_CODE_HEADERS = [
    'country_code', 'country code', 'countrycode', 'dial_code', 'dial code', 'cc'
]


def _clean_key(k: str) -> str:
    """Normalizes dict keys for fuzzy matching."""
    if not k:
        return ''
    return str(k).strip().lower().replace('_', '').replace(' ', '').replace('-', '')


def _extract_field(row: dict, candidates: list) -> str:
    """Extracts the first matching key from a row dictionary."""
    clean_dict = {_clean_key(k): v for k, v in row.items() if k is not None}
    for cand in candidates:
        ck = _clean_key(cand)
        if ck in clean_dict and clean_dict[ck] is not None:
            val = str(clean_dict[ck]).strip()
            if val:
                return val
    return ''


def normalize_phone(raw_phone: str, default_country_code: str = '234') -> str:
    """
    Normalize any raw phone number into a standardized E.164 format (+<country_code><digits>).
    Handles spaces, dashes, brackets, local formats, Nigerian & international numbers.
    Returns normalized string (e.g., '+2348012345678') or '' if invalid.
    """
    if not raw_phone:
        return ''
    
    s = str(raw_phone).strip()
    
    # Ignore lines that start with @ (social handles e.g. @christ_man1) or non-phone lines (e.g. '196 more')
    if s.startswith('@'):
        return ''
    
    # Remove (0) common in European/African exports e.g. +44(0)7448...
    s = re.sub(r'\(0\)', '', s)
    # Keep only digits and leading '+'
    cleaned = re.sub(r'[^\d+]', '', s)
    
    if not cleaned:
        return ''
    
    # If starts with '+'
    if cleaned.startswith('+'):
        digits = cleaned[1:]
        if 7 <= len(digits) <= 16:
            return '+' + digits
        return ''
    
    # If starts with '00' (international prefix e.g. 00234...)
    if cleaned.startswith('00'):
        digits = cleaned[2:]
        if 7 <= len(digits) <= 16:
            return '+' + digits
        return ''
    
    # If it's a Nigerian 11-digit local number starting with 0 (e.g. 08012345678)
    if len(cleaned) == 11 and cleaned.startswith('0'):
        return '+234' + cleaned[1:]
    
    # If it's a 10-digit Nigerian number without 0 (e.g. 8012345678, 706..., 903..., 913...)
    if len(cleaned) == 10 and cleaned[0] in '789':
        return '+234' + cleaned
    
    # If it starts with Nigerian country code '234' (13 digits: 2348012345678)
    if cleaned.startswith('234') and len(cleaned) == 13:
        return '+' + cleaned
    
    # If country code is explicitly provided from another column (e.g. 260, 233)
    if default_country_code:
        cc = str(default_country_code).replace('+', '').strip()
        if cc:
            if cleaned.startswith('0'):
                cleaned_no_zero = cleaned[1:]
            else:
                cleaned_no_zero = cleaned
            if not cleaned_no_zero.startswith(cc):
                candidate = '+' + cc + cleaned_no_zero
                if 7 <= len(candidate[1:]) <= 16:
                    return candidate
    
    # If it's already an international number without '+' (e.g. 233..., 260..., 254..., 255..., 256..., 263..., 237..., 27..., 225..., 220..., 241..., 265..., 243..., 44..., 1..., 43...)
    known_prefixes = ('234', '233', '254', '255', '256', '260', '263', '237', '27', '225', '220', '241', '265', '243', '44', '1', '43')
    for pfx in known_prefixes:
        if cleaned.startswith(pfx) and 9 <= len(cleaned) <= 16:
            return '+' + cleaned
    
    # General fallback: if 10-15 digits, prefix with '+'
    if 10 <= len(cleaned) <= 15:
        return '+' + cleaned
    
    return ''


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_contacts_csv(request):
    """
    Upload a CSV / TXT file with contacts.
    Supports standard CSVs, WhatsApp group scraper exports, plain phone lists, and multi-format spreadsheets.
    """
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded. Send a CSV/TXT file as "file" field.'}, status=400)

    upload_file = request.FILES['file']
    filename = upload_file.name.lower()
    if not (filename.endswith('.csv') or filename.endswith('.txt') or filename.endswith('.tsv') or filename.endswith('.vcf')):
        return Response({'error': 'File must be a .csv, .txt, or .tsv file'}, status=400)

    try:
        raw_bytes = upload_file.read()
        try:
            decoded = raw_bytes.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                decoded = raw_bytes.decode('utf-8', errors='ignore')
            except Exception:
                decoded = raw_bytes.decode('latin-1', errors='ignore')
    except Exception as e:
        return Response({'error': f'Could not read file: {str(e)}'}, status=400)

    # Detect delimiter
    sample = decoded[:4096]
    delimiter = ','
    if '\t' in sample and sample.count('\t') > sample.count(','):
        delimiter = '\t'
    elif ';' in sample and sample.count(';') > sample.count(','):
        delimiter = ';'

    limits = get_plan_limits(request.user)
    existing_phones = set(Contact.objects.filter(user=request.user).values_list('phone', flat=True))
    current_count = len(existing_phones)
    
    imported = 0
    duplicates = 0
    errors = []
    new_contacts = []
    seen_in_batch = set()

    # Try DictReader first
    reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
    has_recognized_header = False
    
    if reader.fieldnames:
        clean_fieldnames = [_clean_key(f) for f in reader.fieldnames if f]
        for ph in PHONE_HEADERS + EMAIL_HEADERS:
            if _clean_key(ph) in clean_fieldnames:
                has_recognized_header = True
                break

    if has_recognized_header:
        # Process structured CSV with headers
        for i, row in enumerate(reader):
            cc = _extract_field(row, COUNTRY_CODE_HEADERS)
            raw_phone = _extract_field(row, PHONE_HEADERS)
            raw_email = _extract_field(row, EMAIL_HEADERS)
            
            # If phone header found but value is empty, try finding any column with digits
            if not raw_phone:
                for val in row.values():
                    if val and re.search(r'[\d+]{7,}', str(val)):
                        raw_phone = str(val)
                        break

            # If email was not explicitly found in headers, check all values for '@'
            if not raw_email:
                for val in row.values():
                    if val and '@' in str(val) and '.' in str(val):
                        raw_email = str(val).strip()
                        break

            phone = normalize_phone(raw_phone, default_country_code=cc)
            email = raw_email.strip() if (raw_email and '@' in raw_email) else ''

            if not phone and not email:
                if any(row.values()):
                    if not str(raw_phone).startswith('@'):
                        errors.append(f"Row {i + 2}: Invalid or missing phone number / email ({raw_phone or 'empty'})")
                continue

            if not phone and email:
                phone = f"+00{abs(hash(email)) % 10000000000}"

            raw_name = _extract_field(row, NAME_HEADERS)
            if raw_name and normalize_phone(raw_name) == phone:
                name = ''
            else:
                name = raw_name

            tags = _extract_field(row, TAGS_HEADERS)

            if phone in existing_phones or phone in seen_in_batch:
                duplicates += 1
                continue

            if current_count + len(new_contacts) >= limits['max_contacts']:
                errors.append(f"Upload halted: Contact limit of {limits['max_contacts']} reached for your {limits['plan_name']}.")
                break

            seen_in_batch.add(phone)
            new_contacts.append(Contact(
                user=request.user,
                phone=phone,
                email=email[:255],
                name=name[:200],
                tags=tags[:500]
            ))
    else:
        # Fallback: Headerless or plain text list of numbers/emails
        lines = [line.strip() for line in decoded.splitlines() if line.strip()]
        for i, line in enumerate(lines):
            parts = [p.strip() for p in re.split(r'[,;\t|]', line) if p.strip()]
            if not parts:
                continue

            raw_phone = ''
            raw_email = ''
            raw_name = ''
            raw_tags = ''

            # Find which part contains phone or email
            for idx, part in enumerate(parts):
                norm = normalize_phone(part)
                if norm and not raw_phone:
                    raw_phone = part
                elif '@' in part and '.' in part and not raw_email:
                    raw_email = part
                elif not raw_name:
                    raw_name = part
                else:
                    raw_tags = part

            phone = normalize_phone(raw_phone)
            email = raw_email.strip() if (raw_email and '@' in raw_email) else ''

            if not phone and not email:
                if not line.startswith('@') and not re.match(r'^\d+\s+more$', line, re.IGNORECASE):
                    errors.append(f"Line {i + 1}: Could not find a valid phone number or email")
                continue

            if not phone and email:
                phone = f"+00{abs(hash(email)) % 10000000000}"

            if raw_name and normalize_phone(raw_name) == phone:
                raw_name = ''

            if phone in existing_phones or phone in seen_in_batch:
                duplicates += 1
                continue

            if current_count + len(new_contacts) >= limits['max_contacts']:
                errors.append(f"Upload halted: Contact limit of {limits['max_contacts']} reached for your {limits['plan_name']}.")
                break

            seen_in_batch.add(phone)
            new_contacts.append(Contact(
                user=request.user,
                phone=phone,
                email=email[:255],
                name=raw_name[:200],
                tags=raw_tags[:500]
            ))

    # Bulk create contacts for high performance
    if new_contacts:
        Contact.objects.bulk_create(new_contacts, ignore_conflicts=True)
        imported = len(new_contacts)

    return Response({
        'imported': imported,
        'duplicates': duplicates,
        'errors': errors[:20],
        'total_contacts': Contact.objects.filter(user=request.user).count()
    })


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
                'email_subject': c.email_subject,
                'email_sender_name': c.email_sender_name,
                'email_preview_text': c.email_preview_text,
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
    channel = data.get('channel', 'WHATSAPP')
    campaign = Campaign.objects.create(
        user=request.user,
        name=data.get('name', 'Untitled Campaign'),
        message_template=data.get('message_template', ''),
        channel=channel,
        daily_limit=int(data.get('daily_limit', 100)),
        status='DRAFT',
        email_subject=data.get('email_subject', ''),
        email_sender_name=data.get('email_sender_name', request.user.business_name or ''),
        email_preview_text=data.get('email_preview_text', ''),
        scheduled_at=data.get('scheduled_at') if data.get('scheduled_at') else None,
        target_tags=data.get('target_tags', ''),
    )

    # Count total contacts
    contacts_qs = Contact.objects.filter(user=request.user, is_opted_out=False)
    if channel == 'EMAIL':
        contacts_qs = contacts_qs.exclude(email='')
        
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
        'email_subject': campaign.email_subject,
        'email_sender_name': campaign.email_sender_name,
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
        if 'email_subject' in data:
            campaign.email_subject = data.get('email_subject', campaign.email_subject)
        if 'email_sender_name' in data:
            campaign.email_sender_name = data.get('email_sender_name', campaign.email_sender_name)
        if 'email_preview_text' in data:
            campaign.email_preview_text = data.get('email_preview_text', campaign.email_preview_text)
        if 'scheduled_at' in data:
            campaign.scheduled_at = data.get('scheduled_at') if data.get('scheduled_at') else None
        campaign.target_tags = data.get('target_tags', campaign.target_tags)
        
        # Recalculate contacts
        contacts_qs = Contact.objects.filter(user=request.user, is_opted_out=False)
        if campaign.channel == 'EMAIL':
            contacts_qs = contacts_qs.exclude(email='')
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
            'email_subject': campaign.email_subject,
            'email_sender_name': campaign.email_sender_name,
            'email_preview_text': campaign.email_preview_text,
            'created_at': campaign.created_at,
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_batch(request):
    """
    Send HTML Email Broadcast to a batch of contacts with email addresses.
    Body: { campaign_id, batch_size (default 50, max 200) }
    Cost: 1 BizCredit per email.
    """
    campaign_id = request.data.get('campaign_id')
    batch_size = min(int(request.data.get('batch_size', 50)), 200)

    try:
        campaign = Campaign.objects.get(id=campaign_id, user=request.user, channel='EMAIL')
    except Campaign.DoesNotExist:
        return Response({'error': 'Email Campaign not found'}, status=404)

    # Get already messaged emails for this campaign
    messaged_emails = MessageLog.objects.filter(
        campaign=campaign, status__in=['SENT', 'DELIVERED']
    ).values_list('recipient', flat=True)

    contacts_qs = Contact.objects.filter(
        user=request.user, is_opted_out=False
    ).exclude(email='').exclude(email__in=messaged_emails)

    if campaign.target_tags:
        from django.db.models import Q
        target_tags_list = [t.strip() for t in campaign.target_tags.split(',') if t.strip()]
        if target_tags_list:
            tag_query = Q()
            for tag in target_tags_list:
                tag_query |= Q(tags__icontains=tag)
            contacts_qs = contacts_qs.filter(tag_query)

    contacts = list(contacts_qs[:batch_size])

    if not contacts:
        return Response({'message': 'No more contacts with email addresses to message in this campaign.', 'sent': 0})

    # Credit cost: 1 BizCredit per email sent (Admin gets bypass)
    is_admin = (request.user.email == 'meshachzax@gmail.com')
    credit_cost_per_email = 0 if is_admin else 1
    total_cost = len(contacts) * credit_cost_per_email

    if not is_admin and request.user.credits < total_cost:
        return Response({
            'error': f"Insufficient BizCredits. Sending to {len(contacts)} emails requires {total_cost} credits, but you have {request.user.credits} credits. Please top up."
        }, status=400)

    from smartbiz_backend.email_utils import send_broadcast_email
    
    sender_name = campaign.email_sender_name or request.user.business_name or request.user.get_full_name() or "SmartBiz Merchant"
    business_name = request.user.business_name or sender_name

    sent_count = 0
    failed_count = 0
    results = []

    for contact in contacts:
        contact_name = contact.name or "Valued Customer"
        rendered_subject = (campaign.email_subject or "Important update for you").replace('{{name}}', contact_name).replace('{{business_name}}', business_name)
        rendered_body = campaign.message_template.replace('{{name}}', contact_name).replace('{{business_name}}', business_name)

        success, err_msg = send_broadcast_email(
            recipient_email=contact.email,
            recipient_name=contact_name,
            subject=rendered_subject,
            body_content=rendered_body,
            sender_name=sender_name,
            business_name=business_name
        )

        if success:
            sent_count += 1
            status_val = 'SENT'
            contact.last_messaged_at = timezone.now()
            contact.save(update_fields=['last_messaged_at'])
        else:
            failed_count += 1
            status_val = 'FAILED'

        MessageLog.objects.create(
            campaign=campaign,
            contact=contact,
            phone=contact.phone or '',
            recipient=contact.email,
            message=f"Subject: {rendered_subject}\n\n{rendered_body}",
            status=status_val,
            error_message='' if success else err_msg,
            sent_at=timezone.now() if success else None
        )

        results.append({
            'contact_id': contact.id,
            'email': contact.email,
            'name': contact.name,
            'status': status_val,
            'error': '' if success else err_msg
        })

    # Update campaign counters
    campaign.sent_count += sent_count
    campaign.failed_count += failed_count
    if campaign.sent_count + campaign.failed_count >= campaign.total_contacts and campaign.total_contacts > 0:
        campaign.status = 'COMPLETED'
    elif campaign.status == 'DRAFT':
        campaign.status = 'ACTIVE'
    campaign.save()

    # Deduct credits
    actual_credit_cost = sent_count * credit_cost_per_email
    if actual_credit_cost > 0:
        request.user.credits = max(0, request.user.credits - actual_credit_cost)
        request.user.save(update_fields=['credits'])
        CreditLedger.objects.create(
            user=request.user,
            amount=-actual_credit_cost,
            activity=f"Email Broadcast ({sent_count} emails - Campaign: '{campaign.name}')"
        )

    return Response({
        'sent': sent_count,
        'failed': failed_count,
        'total_sent_in_campaign': campaign.sent_count,
        'progress_percent': campaign.progress_percent,
        'credits_deducted': actual_credit_cost,
        'remaining_credits': request.user.credits,
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

    topic = str(request.data.get('topic', 'General Promotion')).strip()
    channel = str(request.data.get('channel', 'WHATSAPP')).upper()

    # Retrieve BrandIdentity
    biz_name = getattr(request.user, 'business_name', '') or "our business"
    niche = "general retail"
    voice = "friendly and professional"
    audience = "valued customers"
    pitch = ""

    try:
        brand = BrandIdentity.objects.filter(user=request.user).first()
        if brand:
            biz_name = brand.business_name or biz_name
            niche = brand.niche or niche
            voice = brand.brand_voice or voice
            audience = brand.target_audience or audience
            pitch = brand.elevator_pitch or pitch
    except Exception as e:
        print(f"Brand retrieval note: {e}")

    prompt = f"""
You are an expert digital marketer for Nigerian SMEs and businesses.
Write a personalized, high-converting broadcast marketing message for the following business:
- Business Name: {biz_name}
- Niche/Industry: {niche}
- Target Audience: {audience}
- Vibe/Brand Voice: {voice}
- Elevator Pitch: {pitch}

The objective of this message is: {topic}
The delivery channel is: {channel}

Requirements:
1. Start the message with a greeting that includes the recipient placeholder '{{{{name}}}}' so the user can dynamically personalize each message (e.g. "Hi {{{{name}}}}! 👋" or "Hello {{{{name}}}},").
2. Write in a friendly, local, and engaging Nigerian business tone.
3. Keep it highly action-oriented with a clear Call To Action (CTA).
4. Size constraints:
   - If channel is 'SMS', make it concise (strictly under 160 characters, maximum 250 characters, no emojis).
   - If channel is 'WHATSAPP', make it attractive and well-formatted (under 700 characters, use emojis appropriately, bullet points for key value points).
   - If channel is 'EMAIL', output a JSON with "subject", "preview_text", and "message" keys.
5. If channel is 'EMAIL', respond strictly in JSON:
{{"subject": "Catchy email subject line", "preview_text": "Engaging inbox preview snippet", "message": "Compelling email body with {{{{name}}}} placeholder and CTA"}}
Otherwise return ONLY the message content text.
"""

    try:
        if channel == 'EMAIL':
            email_data = gemini_utils.generate_json_content(prompt)
            if isinstance(email_data, dict) and 'message' in email_data:
                return Response({
                    'suggestion': email_data.get('message', ''),
                    'subject': email_data.get('subject', f"Exciting update from {biz_name}"),
                    'preview_text': email_data.get('preview_text', f"Special offer on {topic}")
                })

        suggestion = gemini_utils.generate_text_content(prompt)
        
        # If response was an error string, retry with fast model
        if isinstance(suggestion, str) and suggestion.startswith("Error:"):
            try:
                suggestion = gemini_utils.make_gemini_request(prompt, model="gemini-2.0-flash")
            except Exception:
                pass

        # Clean up any potential markdown wraps
        suggestion = str(suggestion or "").strip()
        if suggestion.startswith("```"):
            try:
                parts = suggestion.split("\n", 1)
                if len(parts) > 1:
                    suggestion = parts[1].rsplit("```", 1)[0].strip()
            except Exception:
                pass

        # Fallback if empty or error string
        if not suggestion or suggestion.startswith("Error:") or len(suggestion) < 10:
            if channel == 'SMS':
                suggestion = f"Hi {{{{name}}}}, exciting news from {biz_name}! Check out our {topic} offers today. Reply to this SMS or visit us to order now!"
            elif channel == 'EMAIL':
                return Response({
                    'suggestion': f"Hello {{{{name}}}},\n\nWe are excited to share an exclusive update from {biz_name} regarding {topic}.\n\nVisit our store or reply to this email to get started today!\n\nBest regards,\n{biz_name}",
                    'subject': f"Special Update from {biz_name}: {topic}",
                    'preview_text': f"Don't miss our latest update on {topic}"
                })
            else:
                suggestion = f"Hi {{{{name}}}}! 👋\n\nExciting news from *{biz_name}*! 🚀\n\nWe have exclusive updates regarding *{topic}*. We'd love for you to be part of this special offer!\n\n👉 *Reply directly to this WhatsApp message* to place your order or learn more!\n\n– {biz_name} Team"

        return Response({
            'suggestion': suggestion,
            'subject': f"Exclusive: {topic} from {biz_name}",
            'preview_text': f"Special update on {topic}"
        })
    except Exception as e:
        print(f"AI Suggest error: {e}")
        if channel == 'SMS':
            fallback = f"Hi {{{{name}}}}, special update from {biz_name}! Check out our {topic} offers today. Reply to order now!"
        elif channel == 'EMAIL':
            return Response({
                'suggestion': f"Hello {{{{name}}}},\n\nSpecial update from {biz_name} regarding {topic}.\n\nContact us today to learn more!\n\nBest regards,\n{biz_name}",
                'subject': f"Update from {biz_name}",
                'preview_text': f"Check out {topic}"
            })
        else:
            fallback = f"Hi {{{{name}}}}! 👋\n\nSpecial update from *{biz_name}*! 🌟\n\nRegarding *{topic}*, we are giving exclusive perks for you today.\n\n📲 *Reply to this chat* to get started right away!\n\n– {biz_name}"
        return Response({'suggestion': fallback})



from rest_framework.views import APIView

class SocialConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        connect, _ = SocialConnect.objects.get_or_create(user=request.user)
        has_meta = bool(connect.meta_access_token and (connect.instagram_account_id or connect.facebook_page_id))
        has_wa = bool((connect.whatsapp_access_token or connect.meta_access_token) and connect.whatsapp_phone_number_id)
        return Response({
            'meta_access_token': connect.meta_access_token,
            'instagram_account_id': connect.instagram_account_id,
            'facebook_page_id': connect.facebook_page_id,
            'whatsapp_phone_number_id': connect.whatsapp_phone_number_id,
            'whatsapp_access_token': connect.whatsapp_access_token,
            'is_connected': has_meta or has_wa
        })

    def post(self, request):
        connect, _ = SocialConnect.objects.get_or_create(user=request.user)
        connect.meta_access_token = request.data.get('meta_access_token', connect.meta_access_token).strip()
        connect.instagram_account_id = request.data.get('instagram_account_id', connect.instagram_account_id).strip()
        connect.facebook_page_id = request.data.get('facebook_page_id', connect.facebook_page_id).strip()
        connect.whatsapp_phone_number_id = request.data.get('whatsapp_phone_number_id', connect.whatsapp_phone_number_id).strip()
        connect.whatsapp_access_token = request.data.get('whatsapp_access_token', connect.whatsapp_access_token).strip()
        connect.save()

        has_meta = bool(connect.meta_access_token and (connect.instagram_account_id or connect.facebook_page_id))
        has_wa = bool((connect.whatsapp_access_token or connect.meta_access_token) and connect.whatsapp_phone_number_id)

        return Response({
            'message': 'Meta, Instagram, and WhatsApp Cloud API credentials updated successfully!',
            'is_connected': has_meta or has_wa
        })


class PublishToMetaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        caption = request.data.get('caption', '')
        image_url = request.data.get('image_url', '')
        platforms = request.data.get('platforms', ['instagram', 'facebook'])

        try:
            connect = SocialConnect.objects.get(user=request.user)
        except SocialConnect.DoesNotExist:
            return Response({'error': 'Please connect your Meta/Instagram credentials in Settings first.'}, status=400)

        token = connect.meta_access_token
        ig_id = connect.instagram_account_id
        fb_id = connect.facebook_page_id

        if not token:
            return Response({'error': 'No Meta Access Token found. Please configure social connection in Settings.'}, status=400)

        results = []
        errors = []

        # 1. Post to Instagram
        if 'instagram' in platforms and ig_id:
            try:
                # Step A: Create Media Container
                container_url = f"https://graph.facebook.com/v19.0/{ig_id}/media"
                c_res = requests.post(container_url, params={
                    'image_url': image_url,
                    'caption': caption,
                    'access_token': token
                })
                c_data = c_res.json()

                if 'id' in c_data:
                    creation_id = c_data['id']
                    # Step B: Publish Container
                    pub_url = f"https://graph.facebook.com/v19.0/{ig_id}/media_publish"
                    p_res = requests.post(pub_url, params={
                        'creation_id': creation_id,
                        'access_token': token
                    })
                    p_data = p_res.json()
                    if 'id' in p_data:
                        results.append("Instagram Post Published Successfully!")
                    else:
                        errors.append(f"Instagram Publish Failed: {p_data.get('error', {}).get('message', 'Unknown error')}")
                else:
                    errors.append(f"Instagram Container Failed: {c_data.get('error', {}).get('message', 'Invalid image URL or permissions')}")
            except Exception as e:
                errors.append(f"Instagram Request Error: {str(e)}")

        # 2. Post to Facebook Page
        if 'facebook' in platforms and fb_id:
            try:
                fb_photo_url = f"https://graph.facebook.com/v19.0/{fb_id}/photos"
                fb_res = requests.post(fb_photo_url, params={
                    'url': image_url,
                    'caption': caption,
                    'access_token': token
                })
                fb_data = fb_res.json()
                if 'id' in fb_data:
                    results.append("Facebook Page Photo Published Successfully!")
                else:
                    errors.append(f"Facebook Publish Failed: {fb_data.get('error', {}).get('message', 'Unknown error')}")
            except Exception as e:
                errors.append(f"Facebook Request Error: {str(e)}")

        if results:
            return Response({
                'success': True,
                'message': " • ".join(results),
                'warnings': errors
            })
        else:
            return Response({
                'error': errors[0] if errors else 'No valid Instagram Account ID or Facebook Page ID connected.'
            }, status=400)


class SendWhatsAppCloudMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipient_phone = request.data.get('phone', '')
        message_text = request.data.get('message', '')
        template_name = request.data.get('template_name')

        if not recipient_phone or not message_text:
            return Response({'error': 'Recipient phone number and message text are required.'}, status=400)

        # Normalize phone number to international format (e.g. 2348012345678)
        clean_phone = recipient_phone.replace('+', '').replace('-', '').replace(' ', '').strip()
        if clean_phone.startswith('0') and len(clean_phone) == 11:
            clean_phone = '234' + clean_phone[1:]

        try:
            connect = SocialConnect.objects.get(user=request.user)
        except SocialConnect.DoesNotExist:
            connect = None

        token = (connect.whatsapp_access_token if connect and connect.whatsapp_access_token else connect.meta_access_token) if connect else ''
        phone_number_id = connect.whatsapp_phone_number_id if connect else ''

        # Fallback to system environment variables if user has not configured custom keys
        if not token:
            token = os.environ.get('WHATSAPP_CLOUD_ACCESS_TOKEN', '')
        if not phone_number_id:
            phone_number_id = os.environ.get('WHATSAPP_CLOUD_PHONE_NUMBER_ID', '')

        if not token or not phone_number_id:
            return Response({
                'error': 'WhatsApp Cloud API credentials not configured. Please add your Phone Number ID and Access Token in Settings & Wallet.'
            }, status=400)

        url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        if template_name:
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "en_US"}
                }
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_phone,
                "type": "text",
                "text": {
                    "preview_url": True,
                    "body": message_text
                }
            }

        try:
            res = requests.post(url, headers=headers, json=payload, timeout=15)
            res_data = res.json()

            if res.status_code in [200, 201] and 'messages' in res_data:
                msg_id = res_data['messages'][0]['id']
                return Response({
                    'success': True,
                    'message': f'WhatsApp message dispatched successfully to {clean_phone}!',
                    'whatsapp_message_id': msg_id
                })
            else:
                err_msg = res_data.get('error', {}).get('message', 'Failed to dispatch WhatsApp message.')
                return Response({'error': f'WhatsApp Cloud API Error: {err_msg}'}, status=400)
        except Exception as e:
            return Response({'error': f'Network error contacting WhatsApp Cloud API: {str(e)}'}, status=500)
