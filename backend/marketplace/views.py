from rest_framework import generics, permissions, filters, views, status
from rest_framework.response import Response
from django.db.models import Q
from .models import VendorVerification, MarketplaceListing, Product, Lead
from .serializers import VendorVerificationSerializer, MarketplaceListingSerializer, ProductSerializer, PublicProductSerializer, LeadSerializer

# ... existing views ...

class LeadListCreateView(generics.ListCreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Lead.objects.filter(brand__user=self.request.user).select_related('product', 'brand').order_by('-created_at')
        return Lead.objects.none()

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from brand.models import BrandIdentity
        product_id = self.request.data.get('product')
        if product_id:
            try:
                qs = Product.objects.select_related('brand')
                if self.request.user.is_authenticated:
                    product = qs.filter(Q(is_public=True, is_suspended=False) | Q(brand__user=self.request.user)).get(id=product_id)
                else:
                    product = qs.get(id=product_id, is_public=True, is_suspended=False)
                serializer.save(brand=product.brand)
                return
            except (Product.DoesNotExist, ValueError, TypeError):
                if not self.request.user.is_authenticated:
                    raise ValidationError({'product': 'Product not found or unavailable.'})

        if self.request.user.is_authenticated:
            brand, _ = BrandIdentity.objects.get_or_create(
                user=self.request.user,
                defaults={'business_name': getattr(self.request.user, 'business_name', '') or 'My Business'}
            )
            serializer.save(brand=brand)
        else:
            raise ValidationError({'product': 'A valid public product is required.'})

class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Lead.objects.filter(brand__user=self.request.user)

class EcosystemAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count, F
        user_products = Product.objects.filter(brand__user=request.user)
        user_leads = Lead.objects.filter(brand__user=request.user)
        
        # Calculations (multiply unit price by available stock quantity for physical inventory)
        inventory_value = user_products.filter(product_type='PHYSICAL').aggregate(total=Sum(F('price') * F('stock_count')))['total'] or 0
        property_value = user_products.filter(product_type='PROPERTY').aggregate(total=Sum('price'))['total'] or 0
        service_count = user_products.filter(product_type='SERVICE').count()
        
        total_leads = user_leads.count()
        won_leads = user_leads.filter(status='WON').count()
        conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
        
        return Response({
            'ecosystem_value': float(inventory_value + property_value),
            'inventory_value': float(inventory_value),
            'property_value': float(property_value),
            'service_count': service_count,
            'total_leads': total_leads,
            'won_leads': won_leads,
            'conversion_rate': round(conversion_rate, 1),
            'top_categories': user_products.values('category').annotate(count=Count('id')).order_by('-count')[:3]
        })

from .commerce_orders import OrderCreateView  # noqa: E402,F401  (moved: Commerce Phase 5)


class PaystackWebhookView(views.APIView):
    """
    Webhook handler for Paystack automated payment settlement notifications.
    Processes charge.success events, validates HMAC-SHA512 signature, and confirms order fulfillment atomically.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hashlib, hmac
        from django.conf import settings as dj_settings
        from django.db import transaction

        secret = getattr(dj_settings, 'PAYSTACK_SECRET_KEY', None)
        if not secret:
            return Response({'error': 'Paystack gateway secret is not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        sig = request.headers.get('x-paystack-signature') or request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')
        if not sig:
            return Response({'error': 'Missing x-paystack-signature header'}, status=status.HTTP_400_BAD_REQUEST)

        expected = hmac.new(secret.encode('utf-8'), request.body, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)

        payload = request.data or {}
        event = payload.get('event', '')
        data = payload.get('data', {})

        if event == 'charge.success':
            reference = data.get('reference', '')
            amount = data.get('amount', 0) / 100.0
            customer = data.get('customer', {})
            customer_email = customer.get('email', '')
            metadata = data.get('metadata', {})
            custom_fields = metadata.get('custom_fields', [])
            
            customer_name = 'Customer'
            customer_phone = ''
            for cf in custom_fields:
                if cf.get('variable_name') == 'customer_name':
                    customer_name = cf.get('value', customer_name)
                elif cf.get('variable_name') == 'customer_phone':
                    customer_phone = cf.get('value', customer_phone)

            # Match or update existing leads with this reference
            leads = Lead.objects.filter(message__contains=reference)
            if leads.exists():
                leads.update(status='WON')

            with transaction.atomic():
                # Phase 5: a signed charge.success confirms payment for the matching orders idempotently
                from .models import Order
                Order.objects.select_for_update().filter(reference=reference, payment_verified=False).update(payment_verified=True)

            return Response({
                "status": "success",
                "message": f"Webhook verified: Payment {reference} acknowledged for ₦{amount:,.2f}"
            }, status=status.HTTP_200_OK)

        return Response({"status": "ignored", "event": event}, status=status.HTTP_200_OK)


class VendorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = VendorVerificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Create or get the vendor profile for the logged in user
        obj, created = VendorVerification.objects.get_or_create(
            user=self.request.user,
            defaults={'business_name': self.request.user.business_name or 'My Business'}
        )
        return obj

class MarketplaceListingListView(generics.ListCreateAPIView):
    serializer_class = MarketplaceListingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # Enable search on title, description, category, and location
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description', 'category', 'location', 'vendor__business_name']

    def get_queryset(self):
        queryset = MarketplaceListing.objects.filter(is_active=True).select_related('vendor', 'vendor__user').order_by('-created_at')
        
        # Optional category filtering
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset

    def perform_create(self, serializer):
        # Ensure user has a vendor profile before listing
        vendor, created = VendorVerification.objects.get_or_create(
            user=self.request.user,
            defaults={'business_name': self.request.user.business_name or 'My Business'}
        )
        serializer.save(vendor=vendor)

class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow filtering by type for unified commerce engine
        queryset = Product.objects.filter(brand__user=self.request.user).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        )
        product_type = self.request.query_params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type=product_type)
        return queryset

    def create(self, request, *args, **kwargs):
        from users.views import is_user_apprentice_locked
        if is_user_apprentice_locked(request.user):
            return Response(
                {'error': 'Staff/Apprentice Mode is active. Only the business owner can add new products or set prices.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        from brand.models import BrandIdentity
        biz_name = getattr(self.request.user, 'business_name', '') or (self.request.user.email.split('@')[0] if self.request.user.email else 'My Business')
        brand, _ = BrandIdentity.objects.get_or_create(
            user=self.request.user,
            defaults={'business_name': biz_name, 'niche': 'General', 'vibe': 'Professional'}
        )
        serializer.save(brand=brand)

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(brand__user=self.request.user).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        )

    def _check_owner_unlock(self, request):
        from users.views import is_user_apprentice_locked
        if is_user_apprentice_locked(request.user):
            return Response(
                {'error': 'Staff/Apprentice Mode is active. Only the business owner can edit, delete, or change product prices.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def update(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().destroy(request, *args, **kwargs)

class PublicBrandProductListView(generics.ListAPIView):
    serializer_class = PublicProductSerializer
    permission_classes = [] # Public

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return Product.objects.filter(brand__slug=slug, is_public=True, is_suspended=False).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        )

class PublicProductDetailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            product = Product.objects.select_related(
                'brand',
                'brand__user',
                'brand__user__vendor_profile'
            ).get(id=pk, is_public=True, is_suspended=False)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        product_data = PublicProductSerializer(product).data
        more_from_seller = Product.objects.filter(
            brand=product.brand,
            is_public=True,
            is_suspended=False
        ).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        ).exclude(id=product.id).order_by('-is_promoted', '-created_at')[:6]

        similar_qs = Product.objects.filter(
            is_public=True,
            is_suspended=False
        ).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        ).exclude(id=product.id).exclude(brand=product.brand)
        if product.category:
            cat_qs = similar_qs.filter(category__iexact=product.category)
            if cat_qs.exists():
                similar_qs = cat_qs
        similar_items = similar_qs.order_by('-is_promoted', '-created_at')[:6]

        return Response({
            'product': product_data,
            'more_from_seller': PublicProductSerializer(more_from_seller, many=True).data,
            'similar_products': PublicProductSerializer(similar_items, many=True).data,
        })

class GlobalMarketplaceListView(generics.ListAPIView):
    serializer_class = PublicProductSerializer
    permission_classes = [] # Public
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'category', 'location', 'brand__business_name']

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()

        # Housekeeping: update any expired promoted items only when expired items exist
        expired_qs = Product.objects.filter(is_promoted=True, promoted_until__lt=now)
        if expired_qs.exists():
            expired_qs.update(is_promoted=False)

        queryset = Product.objects.filter(is_public=True, is_suspended=False).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        )

        # Flash deals only (compare-at price set, deal not expired)
        if self.request.query_params.get('deals') in ['true', '1']:
            queryset = queryset.filter(compare_at_price__isnull=False).filter(
                Q(deal_ends_at__isnull=True) | Q(deal_ends_at__gt=now)
            )
        
        # Product type filter (PHYSICAL, SERVICE, PROPERTY, B2B)
        product_type = self.request.query_params.get('product_type')
        if product_type and product_type != 'ALL':
            queryset = queryset.filter(product_type=product_type)
            
        # Category sub-filter
        category = self.request.query_params.get('category')
        if category and category.strip():
            queryset = queryset.filter(category__iexact=category.strip())
            
        # Merchant brand slug filter (view all listings from this specific MSME)
        brand_slug = self.request.query_params.get('brand_slug')
        if brand_slug and brand_slug.strip():
            queryset = queryset.filter(brand__slug=brand_slug.strip())

        # State / Geo-Location filter (e.g. Lagos, Abuja, Onitsha, etc.)
        location = self.request.query_params.get('location')
        if location and location.strip() and location.strip() != 'ALL':
            from django.db.models import Q
            loc_term = location.strip()
            queryset = queryset.filter(Q(location__icontains=loc_term) | Q(brand__address__icontains=loc_term))

        # Price range filter
        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except (ValueError, TypeError):
                pass

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        # Verified vendor filter
        verified_only = self.request.query_params.get('verified_only')
        if verified_only in ['true', '1', True]:
            queryset = queryset.filter(brand__user__vendor_profile__is_verified=True)

        # Dynamic Sorting
        sort_by = self.request.query_params.get('sort_by', 'boosted')
        if sort_by == 'price_low':
            queryset = queryset.order_by('price', '-is_promoted', '-created_at')
        elif sort_by == 'price_high':
            queryset = queryset.order_by('-price', '-is_promoted', '-created_at')
        elif sort_by == 'newest':
            queryset = queryset.order_by('-created_at')
        else: # 'boosted' or default
            queryset = queryset.order_by('-is_promoted', '-created_at')
            
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        limit_param = request.query_params.get('limit')
        if limit_param:
            try:
                limit_val = max(1, min(100, int(limit_param)))
                queryset = queryset[:limit_val]
            except (ValueError, TypeError):
                queryset = queryset[:100]
        elif 'page' in request.query_params or 'page_size' in request.query_params:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                response = self.get_paginated_response(serializer.data)
                response['Cache-Control'] = 'public, max-age=60, s-maxage=120'
                return response
        else:
            queryset = queryset[:100]
        serializer = self.get_serializer(queryset, many=True)
        response = Response(serializer.data)
        # Fast caching: 60 seconds client cache, 120 seconds edge CDN
        response['Cache-Control'] = 'public, max-age=60, s-maxage=120'
        return response

class DashboardSearchView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'category', 'location']

    def get_queryset(self):
        # Search across ALL the user's ecosystem items
        return Product.objects.filter(brand__user=self.request.user).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        ).order_by('-created_at')

class ProductSnapAndListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'ai'

    def post(self, request):
        import re
        from billing.utils import reserve_ai_credits, refund_ai_credits
        from billing.catalog import AI_CREDIT_COSTS
        from users.views import is_user_apprentice_locked

        if is_user_apprentice_locked(request.user):
            return Response(
                {'error': 'Staff/Apprentice Mode is active. Owner verification is required to snap or add products.'},
                status=status.HTTP_403_FORBIDDEN
            )

        image_base64 = request.data.get('image_base64') or request.data.get('video_snapshot_base64') or request.data.get('image')
        mime_type = request.data.get('mime_type', 'image/jpeg')
        file_name = request.data.get('file_name', '').strip()

        if not image_base64 and not file_name:
            return Response({'error': 'No image or video frame provided'}, status=400)

        MAX_B64_CHARS = 15 * 1024 * 1024
        if isinstance(image_base64, str) and len(image_base64) > MAX_B64_CHARS:
            return Response({'error': 'Uploaded media exceeds maximum size limit (10 MB).'}, status=400)

        cost = AI_CREDIT_COSTS.get('snap_and_list', 3)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, 'AI Snap & List Scanner')
        if not allowed:
            return Response({'error': f'Insufficient BizCredits (requires {cost} credits).', 'credits': remaining}, status=402)

        clean_b64 = None
        if image_base64:
            clean_b64 = str(image_base64).strip()
            if ';base64,' in clean_b64:
                clean_b64 = clean_b64.split(';base64,')[1]
            clean_b64 = "".join(clean_b64.split())

        biz_context = ""
        try:
            from brand.models import BrandIdentity
            brand = BrandIdentity.objects.filter(user=request.user).first()
            if brand:
                biz_context = f"Merchant Business: '{brand.business_name}', Niche: '{brand.niche or 'General MSME'}', Target Audience: '{brand.target_audience or 'Nigerian Consumers'}'."
        except Exception:
            pass

        clean_name = re.sub(r'[\-_.]+', ' ', file_name).strip() if file_name else ''
        prompt = f"""
        You are a top-tier Google Vision AI tailored for Nigerian commerce and retail e-commerce inventory.
        {biz_context}

        Analyze this product image/frame carefully (filename hint: "{clean_name or file_name}").
        Identify what is visible, suggest a realistic Nigerian Naira retail selling price and wholesale cost price, product_type ('PHYSICAL', 'SERVICE', 'PROPERTY', or 'B2B'), category, and accurate 2-3 sentence Nigerian sales description.
        Respond STRICTLY with valid JSON:
        {{
            "name": "Specific Product Name",
            "price": 28500,
            "cost_price": 18000,
            "product_type": "PHYSICAL",
            "category": "Fashion",
            "description": "Concise product description and WhatsApp CTA."
        }}
        """

        try:
            from smartbiz_backend import gemini_utils
            content = gemini_utils.generate_json_content(
                prompt,
                image_base64=clean_b64,
                mime_type=mime_type
            )

            if isinstance(content, dict) and 'name' in content and 'price' in content and not content.get('error'):
                try:
                    p = int(content.get('price') or 0)
                except (ValueError, TypeError):
                    p = 0
                try:
                    c = int(content.get('cost_price') or 0)
                except (ValueError, TypeError):
                    c = 0
                d = str(content.get('description') or '').strip()
                prod_name = str(content.get('name') or clean_name.title() or 'Store Item').strip()
                prod_cat = str(content.get('category') or 'General Goods').strip()
                prod_type = str(content.get('product_type') or 'PHYSICAL').strip()
                if prod_type not in ['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B']:
                    prod_type = 'PHYSICAL'

                return Response({
                    'name': prod_name,
                    'price': max(0, p),
                    'cost_price': max(0, c),
                    'product_type': prod_type,
                    'category': prod_cat,
                    'description': d or prod_name,
                    'credits': remaining,
                    'credits_deducted_server': True,
                })

            refund_ai_credits(request.user, reserved, 'Snap & List Unavailable')
            return Response({'error': 'Could not analyze image right now. Your credits were refunded—please try again or enter details manually.'}, status=502)
        except Exception as e:
            refund_ai_credits(request.user, reserved, 'Snap & List Error')
            return Response({'error': f'Snap & List failed: {str(e)}'}, status=503)


class RelatedEcosystemProductsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        category = request.query_params.get('category', '').strip()
        exclude_brand_id = request.query_params.get('exclude_brand_id', '').strip()

        qs = Product.objects.filter(is_public=True, is_suspended=False).select_related(
            'brand',
            'brand__user',
            'brand__user__vendor_profile'
        ).order_by('-created_at')

        if exclude_brand_id:
            qs = qs.exclude(brand_id=exclude_brand_id)

        if category:
            qs_cat = qs.filter(category__iexact=category)
            if qs_cat.exists():
                qs = qs_cat

        products = qs[:6]
        serializer = PublicProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


class BoostProductView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk, brand__user=request.user)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found or you do not have permission to boost this item.'}, status=status.HTTP_404_NOT_FOUND)

        duration_days = int(request.data.get('duration_days') or 3)
        # Micro-tier pricing: accessible even with 50 free welcome credits
        if duration_days <= 1:
            credits_required = 10   # 10 Credits (~N100) - 24-Hour Spotlight Trial
        elif duration_days <= 3:
            credits_required = 25   # 25 Credits (~N250) - 3-Day Priority
        elif duration_days <= 7:
            credits_required = 50   # 50 Credits (~N500) - 7-Day National VIP
        elif duration_days <= 14:
            credits_required = 90   # 90 Credits (~N900) - 14-Day Mega Spotlight
        else:
            credits_required = 150  # 150 Credits (~N1,500) - 30-Day Oga VIP

        from django.db import transaction
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from billing.models import CreditLedger
        User = get_user_model()

        with transaction.atomic():
            user = User.objects.select_for_update().get(id=request.user.id)
            if user.credits < credits_required:
                return Response({
                    'error': f'Insufficient BizCredits. You have {user.credits} credits, but {credits_required} credits are required to boost this listing for {duration_days} days.',
                    'credits_required': credits_required,
                    'current_credits': user.credits
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

            user.credits -= credits_required
            user.save(update_fields=['credits'])

            CreditLedger.objects.create(
                user=user,
                amount=-credits_required,
                activity=f"Marketplace Boost ({duration_days} Days) for '{product.name[:80]}'"
            )

            product.is_promoted = True
            product.promoted_until = timezone.now() + timezone.timedelta(days=duration_days)
            product.save(update_fields=['is_promoted', 'promoted_until'])

        return Response({
            'message': f"Product successfully boosted for {duration_days} days! It is now featured at the top of the Market Square.",
            'product_id': product.id,
            'is_promoted': product.is_promoted,
            'promoted_until': product.promoted_until,
            'remaining_credits': user.credits,
            'credits_deducted': credits_required
        }, status=status.HTTP_200_OK)


class VerifyVendorWithCreditsView(views.APIView):
    """
    Deprecated / Restricted:
    Subscriptions or BizCredits CANNOT grant verified status.
    Verification must be legitimately earned via KYC / KYB / NACCIMA institutional review.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({
            'error': 'Official verification cannot be purchased with BizCredits or subscriptions. To obtain an audited Trust Badge, apply through the Trust & Verification desk with your National ID, CAC Registration, or NACCIMA Chamber accreditation.',
            'can_purchase': False
        }, status=status.HTTP_400_BAD_REQUEST)


class VendorVerificationStatusView(views.APIView):
    """Retrieve the logged-in user's verification profile, active tier, and review status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        vendor, _ = VendorVerification.objects.get_or_create(
            user=request.user,
            defaults={
                'business_name': getattr(request.user, 'business_name', '') or request.user.username,
                'business_type': 'Retail',
                'whatsapp_number': getattr(request.user, 'phone', '') or ''
            }
        )
        serializer = VendorVerificationSerializer(vendor)
        return Response(serializer.data, status=status.HTTP_200_OK)


class VendorVerificationApplyView(views.APIView):
    """Submit or update a tiered verification application (Level 1 ID, Level 2 CAC, Level 3 NACCIMA)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        vendor, _ = VendorVerification.objects.get_or_create(
            user=request.user,
            defaults={
                'business_name': getattr(request.user, 'business_name', '') or request.user.username,
                'business_type': 'Retail',
                'whatsapp_number': getattr(request.user, 'phone', '') or ''
            }
        )

        tier = request.data.get('verification_tier', 'TIER_1_ID')
        if tier not in ['TIER_1_ID', 'TIER_2_CAC', 'TIER_3_NACCIMA']:
            return Response({'error': 'Invalid verification tier selected.'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic validations per tier
        id_type = request.data.get('id_type') or vendor.id_type
        id_number = (request.data.get('id_number') or vendor.id_number or '').strip()
        cac_number = (request.data.get('cac_number') or vendor.cac_number or '').strip()
        naccima_member_id = (request.data.get('naccima_member_id') or vendor.naccima_member_id or '').strip()

        if tier == 'TIER_1_ID':
            if not id_type or not id_number:
                return Response({'error': 'Government ID Type and ID Number are required for Identity Verification.'}, status=status.HTTP_400_BAD_REQUEST)
        elif tier == 'TIER_2_CAC':
            if not cac_number:
                return Response({'error': 'CAC Registration Number (RC/BN) is required for Business Verification.'}, status=status.HTTP_400_BAD_REQUEST)
        elif tier == 'TIER_3_NACCIMA':
            if not naccima_member_id:
                return Response({'error': 'NACCIMA / Chamber Member ID or Certificate is required for Tier 3 Accreditation.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update fields
        vendor.verification_tier = tier
        vendor.status = 'PENDING_REVIEW'
        vendor.business_name = request.data.get('business_name') or vendor.business_name or request.user.business_name or 'My Business'
        vendor.business_type = request.data.get('business_type') or vendor.business_type or 'Retail'
        vendor.whatsapp_number = request.data.get('whatsapp_number') or vendor.whatsapp_number or getattr(request.user, 'phone', '')
        
        if 'id_type' in request.data: vendor.id_type = request.data['id_type']
        if 'id_number' in request.data: vendor.id_number = request.data['id_number']
        if 'id_document_url' in request.data: vendor.id_document_url = request.data['id_document_url']
        if 'cac_number' in request.data: vendor.cac_number = request.data['cac_number']
        if 'tin_number' in request.data: vendor.tin_number = request.data['tin_number']
        if 'cac_document_url' in request.data: vendor.cac_document_url = request.data['cac_document_url']
        if 'proof_of_address_url' in request.data: vendor.proof_of_address_url = request.data['proof_of_address_url']
        if 'physical_address' in request.data: vendor.physical_address = request.data['physical_address']
        if 'operating_state' in request.data: vendor.operating_state = request.data['operating_state']
        if 'operating_lga' in request.data: vendor.operating_lga = request.data['operating_lga']
        if 'naccima_member_id' in request.data: vendor.naccima_member_id = request.data['naccima_member_id']
        if 'naccima_chamber_name' in request.data: vendor.naccima_chamber_name = request.data['naccima_chamber_name']
        if 'naccima_document_url' in request.data: vendor.naccima_document_url = request.data['naccima_document_url']
        
        vendor.rejection_reason = "" # Clear previous rejection on re-application
        vendor.save()

        serializer = VendorVerificationSerializer(vendor)
        return Response({
            'message': 'Verification application submitted successfully! Our compliance desk and NACCIMA audit team will review your credentials within 24-48 business hours.',
            'vendor': serializer.data
        }, status=status.HTTP_200_OK)


class AdminVerificationListView(views.APIView):
    """List verification requests for SmartBiz staff and NACCIMA review desk."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ADMIN_EMAILS = [
            'meshachzax@gmail.com', 'admin@smartbizcoach.com.ng',
            'partners@smartbizcoach.com.ng', 'info@smartbizcoach.com.ng', 'mzacs54@gmail.com'
        ]
        u = request.user
        is_staff = bool(u.is_staff or u.is_superuser or (getattr(u, 'email', '') or '').lower() in ADMIN_EMAILS)
        if not is_staff:
            return Response({'error': 'Access limited to SmartBiz staff and NACCIMA compliance desk.'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status', 'ALL').upper()
        tier_filter = request.query_params.get('tier', 'ALL').upper()

        qs = VendorVerification.objects.select_related('user').order_by('-updated_at')
        if status_filter != 'ALL':
            qs = qs.filter(status=status_filter)
        if tier_filter != 'ALL':
            qs = qs.filter(verification_tier=tier_filter)

        serializer = VendorVerificationSerializer(qs[:100], many=True)
        counts = {
            'pending': VendorVerification.objects.filter(status='PENDING_REVIEW').count(),
            'verified': VendorVerification.objects.filter(status='VERIFIED').count(),
            'action_required': VendorVerification.objects.filter(status='ACTION_REQUIRED').count(),
            'total': VendorVerification.objects.count()
        }
        return Response({
            'requests': serializer.data,
            'counts': counts
        }, status=status.HTTP_200_OK)


class AdminVerificationActionView(views.APIView):
    """Action on a verification request: APPROVE, REQUEST_ACTION, REJECT, SUSPEND."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        u = request.user
        is_staff = bool(u.is_staff or u.is_superuser or (getattr(u, 'email', '') or '').lower() in [
            'meshachzax@gmail.com', 'admin@smartbizcoach.com.ng',
            'partners@smartbizcoach.com.ng', 'info@smartbizcoach.com.ng', 'mzacs54@gmail.com'
        ])
        if not is_staff:
            return Response({'error': 'Access limited to SmartBiz staff and NACCIMA compliance desk.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            vendor = VendorVerification.objects.select_related('user').get(pk=pk)
        except VendorVerification.DoesNotExist:
            return Response({'error': 'Vendor verification profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', '').upper()
        note = request.data.get('note', '').strip()
        assigned_tier = request.data.get('verification_tier') or vendor.verification_tier or 'TIER_1_ID'

        reviewer_tag = u.email or u.username or 'SmartBiz Admin'
        now = timezone.now()

        if action == 'APPROVE':
            vendor.status = 'VERIFIED'
            vendor.is_verified = True
            vendor.verification_tier = assigned_tier if assigned_tier != 'NONE' else 'TIER_1_ID'
            vendor.verified_at = now
            vendor.reviewed_by = reviewer_tag
            vendor.reviewed_at = now
            vendor.rejection_reason = ""
            vendor.save()
            msg = f"Vendor '{vendor.business_name}' approved successfully for {vendor.get_verification_tier_display()}!"

        elif action == 'REQUEST_ACTION':
            vendor.status = 'ACTION_REQUIRED'
            vendor.is_verified = False
            vendor.rejection_reason = note or "Additional documentation or clearer uploads required."
            vendor.reviewed_by = reviewer_tag
            vendor.reviewed_at = now
            vendor.save()
            msg = f"Action requested from vendor: {vendor.rejection_reason}"

        elif action == 'REJECT':
            vendor.status = 'REJECTED'
            vendor.is_verified = False
            vendor.rejection_reason = note or "Application did not meet compliance criteria."
            vendor.reviewed_by = reviewer_tag
            vendor.reviewed_at = now
            vendor.save()
            msg = f"Vendor verification rejected: {vendor.rejection_reason}"

        elif action == 'SUSPEND':
            vendor.status = 'SUSPENDED'
            vendor.is_verified = False
            vendor.rejection_reason = note or "Trust badge suspended due to dispute or compliance investigation."
            vendor.reviewed_by = reviewer_tag
            vendor.reviewed_at = now
            vendor.save()
            msg = f"Vendor trust badge suspended: {vendor.rejection_reason}"

        else:
            return Response({'error': 'Invalid action. Must be APPROVE, REQUEST_ACTION, REJECT, or SUSPEND.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = VendorVerificationSerializer(vendor)
        return Response({
            'message': msg,
            'vendor': serializer.data
        }, status=status.HTTP_200_OK)


def _apply_entry_date(obj, date_str):
    """
    Honour the book date picked by the merchant. Records are normally stamped 'now';
    when the merchant is filling in a PAST day, move the record into that day (never the future).
    """
    if not date_str:
        return
    import datetime
    from django.utils import timezone
    try:
        target = datetime.date.fromisoformat(str(date_str)[:10])
    except ValueError:
        return
    today = timezone.localdate()
    if target >= today:
        return
    stamp = timezone.make_aware(datetime.datetime.combine(target, datetime.time(12, 0)))
    type(obj).objects.filter(pk=obj.pk).update(created_at=stamp)
    obj.created_at = stamp


class DailySaleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import DailySaleSerializer
        return DailySaleSerializer

    def get_queryset(self):
        from .models import DailySale
        from django.db.models import Q
        from django.utils import timezone
        import datetime

        qs = DailySale.objects.filter(user=self.request.user, is_voided=False)
        params = self.request.query_params

        # 1. Flexible Date / Period Filters
        date_str = params.get('date')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        days_str = params.get('days')

        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
                qs = qs.filter(created_at__date=target_date)
            except ValueError:
                pass
        elif date_from or date_to:
            if date_from:
                try:
                    df = datetime.date.fromisoformat(date_from)
                    qs = qs.filter(created_at__date__gte=df)
                except ValueError:
                    pass
            if date_to:
                try:
                    dt = datetime.date.fromisoformat(date_to)
                    qs = qs.filter(created_at__date__lte=dt)
                except ValueError:
                    pass
        elif days_str:
            try:
                d = int(days_str)
                start_d = timezone.localdate() - datetime.timedelta(days=max(0, d - 1))
                qs = qs.filter(created_at__date__gte=start_d)
            except ValueError:
                pass

        # 2. Payment Method Filter (CASH, TRANSFER, CREDIT)
        pm = params.get('payment_method')
        if pm and pm.upper() != 'ALL':
            qs = qs.filter(payment_method=pm.upper())

        # 3. Product Type or Specific Product Filter
        prod_id = params.get('product')
        if prod_id:
            qs = qs.filter(product_id=prod_id)
        prod_type = params.get('product_type')
        if prod_type and prod_type.upper() in ['PHYSICAL', 'DIGITAL']:
            qs = qs.filter(product__product_type=prod_type.upper())

        # 4. Search Filter
        search_query = params.get('search')
        if search_query:
            sq = search_query.strip()
            qs = qs.filter(
                Q(item_name__icontains=sq) |
                Q(customer_name__icontains=sq) |
                Q(notes__icontains=sq)
            )

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        from .models import DailySale
        from django.utils import timezone
        import datetime

        # IDEMPOTENCY GUARD 1: Exact offline ID match in notes
        offline_id = request.data.get('offline_id')
        if offline_id:
            tag = f"[offline_id:{offline_id}]"
            existing = DailySale.objects.filter(user=request.user, notes__contains=tag).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        # IDEMPOTENCY GUARD 2: Weak-network retry deduplication
        # If identical item, amount, quantity, payment method was saved by this user within 90 seconds
        item_name = str(request.data.get('item_name') or '').strip()
        total_amount = request.data.get('total_amount')
        quantity = request.data.get('quantity') or 1
        payment_method = request.data.get('payment_method') or 'CASH'

        if item_name and total_amount is not None:
            cutoff = timezone.now() - datetime.timedelta(seconds=90)
            recent_dup = DailySale.objects.filter(
                user=request.user,
                item_name__iexact=item_name,
                total_amount=total_amount,
                quantity=quantity,
                payment_method=payment_method,
                created_at__gte=cutoff
            ).first()
            if recent_dup:
                serializer = self.get_serializer(recent_dup)
                return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        from .models import Product
        offline_id = self.request.data.get('offline_id')
        notes_input = self.request.data.get('notes') or ''
        if offline_id and f"[offline_id:{offline_id}]" not in notes_input:
            tag = f"[offline_id:{offline_id}]"
            final_notes = f"{notes_input.strip()} {tag}".strip()
            sale = serializer.save(user=self.request.user, notes=final_notes)
        else:
            sale = serializer.save(user=self.request.user)

        _apply_entry_date(sale, self.request.data.get('date'))

        update_fields = []
        # Connected OS Event Bus: Auto-match catalog product by name if not explicitly linked
        if not sale.product and sale.item_name:
            matched_product = Product.objects.filter(
                brand__user=self.request.user,
                name__iexact=sale.item_name.strip()
            ).first()
            if matched_product:
                sale.product = matched_product
                update_fields.append('product')

        # Auto-populate COGS (cost_price) from catalog product if 0 so profit margins are accurate
        if sale.product and float(sale.cost_price or 0) <= 0 and float(sale.product.cost_price or 0) > 0:
            sale.cost_price = sale.product.cost_price
            update_fields.append('cost_price')

        # Ensure credit sales are flagged for Gbege Book & SmartScore™ debt velocity
        if sale.payment_method == 'CREDIT' and not sale.is_debt:
            sale.is_debt = True
            update_fields.append('is_debt')

        if update_fields:
            sale.save(update_fields=update_fields)

        # Auto-decrement physical inventory stock count atomically
        if sale.product and sale.quantity > 0 and sale.product.product_type == 'PHYSICAL':
            from django.db.models import F
            updated = Product.objects.filter(
                pk=sale.product.pk, product_type='PHYSICAL', stock_count__gte=sale.quantity
            ).update(stock_count=F('stock_count') - sale.quantity)
            if not updated:
                Product.objects.filter(pk=sale.product.pk, product_type='PHYSICAL', stock_count__gt=0).update(stock_count=0)

        try:
            from .models import LedgerAuditLog
            from users.views import is_user_apprentice_locked
            LedgerAuditLog.objects.create(
                user=self.request.user,
                entry_type='SALE',
                object_id=sale.pk,
                action='CREATE',
                actor_mode='APPRENTICE' if is_user_apprentice_locked(self.request.user) else 'OWNER',
                snapshot={
                    'item_name': sale.item_name,
                    'quantity': sale.quantity,
                    'total_amount': float(sale.total_amount),
                    'payment_method': sale.payment_method,
                },
                note='Sale recorded'
            )
        except Exception:
            pass


class DailyExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import DailyExpenseSerializer
        return DailyExpenseSerializer

    def get_queryset(self):
        from .models import DailyExpense
        from django.db.models import Q
        from django.utils import timezone
        import datetime

        qs = DailyExpense.objects.filter(user=self.request.user, is_voided=False)
        params = self.request.query_params

        date_str = params.get('date')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        days_str = params.get('days')

        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
                qs = qs.filter(created_at__date=target_date)
            except ValueError:
                pass
        elif date_from or date_to:
            if date_from:
                try:
                    df = datetime.date.fromisoformat(date_from)
                    qs = qs.filter(created_at__date__gte=df)
                except ValueError:
                    pass
            if date_to:
                try:
                    dt = datetime.date.fromisoformat(date_to)
                    qs = qs.filter(created_at__date__lte=dt)
                except ValueError:
                    pass
        elif days_str:
            try:
                d = int(days_str)
                start_d = timezone.localdate() - datetime.timedelta(days=max(0, d - 1))
                qs = qs.filter(created_at__date__gte=start_d)
            except ValueError:
                pass

        cat = params.get('category')
        if cat and cat.upper() != 'ALL':
            qs = qs.filter(category=cat.upper())

        pm = params.get('payment_method')
        if pm and pm.upper() != 'ALL':
            qs = qs.filter(payment_method=pm.upper())

        search_query = params.get('search')
        if search_query:
            sq = search_query.strip()
            qs = qs.filter(
                Q(title__icontains=sq) |
                Q(notes__icontains=sq)
            )

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        from .models import DailyExpense
        from django.utils import timezone
        import datetime

        # IDEMPOTENCY GUARD 1: Exact offline ID match in notes
        offline_id = request.data.get('offline_id')
        if offline_id:
            tag = f"[offline_id:{offline_id}]"
            existing = DailyExpense.objects.filter(user=request.user, notes__contains=tag).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        # IDEMPOTENCY GUARD 2: Weak-network retry deduplication
        title = str(request.data.get('title') or '').strip()
        amount = request.data.get('amount')
        category = request.data.get('category') or 'OTHER'
        payment_method = request.data.get('payment_method') or 'CASH'

        if title and amount is not None:
            cutoff = timezone.now() - datetime.timedelta(seconds=90)
            recent_dup = DailyExpense.objects.filter(
                user=request.user,
                title__iexact=title,
                amount=amount,
                category=category,
                payment_method=payment_method,
                created_at__gte=cutoff
            ).first()
            if recent_dup:
                serializer = self.get_serializer(recent_dup)
                return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        offline_id = self.request.data.get('offline_id')
        notes_input = self.request.data.get('notes') or ''
        if offline_id and f"[offline_id:{offline_id}]" not in notes_input:
            tag = f"[offline_id:{offline_id}]"
            final_notes = f"{notes_input.strip()} {tag}".strip()
            expense = serializer.save(user=self.request.user, notes=final_notes)
        else:
            expense = serializer.save(user=self.request.user)

        _apply_entry_date(expense, self.request.data.get('date'))


class DailySummaryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, F
        from django.utils import timezone
        import datetime
        from .models import DailySale, DailyExpense, Product

        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                target_date = timezone.localdate()
        else:
            target_date = timezone.localdate()

        sales = DailySale.objects.filter(user=request.user, is_voided=False, created_at__date=target_date)
        expenses = DailyExpense.objects.filter(user=request.user, is_voided=False, created_at__date=target_date)

        total_sales_revenue = float(sales.aggregate(total=Sum('total_amount'))['total'] or 0.00)
        cash_sales = float(sales.filter(payment_method='CASH').aggregate(total=Sum('total_amount'))['total'] or 0.00)
        transfer_sales = float(sales.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('total_amount'))['total'] or 0.00)
        credit_sales = float(sales.filter(payment_method='CREDIT').aggregate(total=Sum('total_amount'))['total'] or 0.00)

        # Cost of goods sold (COGS)
        cogs = 0.0
        for s in sales:
            cogs += float(s.cost_price or 0.0) * s.quantity
        gross_profit = total_sales_revenue - cogs

        # Expenses
        total_expenses = float(expenses.aggregate(total=Sum('amount'))['total'] or 0.00)
        cash_expenses = float(expenses.filter(payment_method='CASH').aggregate(total=Sum('amount'))['total'] or 0.00)
        transfer_expenses = float(expenses.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('amount'))['total'] or 0.00)

        # Net Cash in Till
        net_cash_in_till = cash_sales - cash_expenses

        # Low stock alert items
        low_stock_products = list(Product.objects.filter(
            brand__user=request.user,
            product_type='PHYSICAL',
            low_stock_threshold__gt=0,
            stock_count__lte=F('low_stock_threshold')
        ).values('id', 'name', 'stock_count', 'low_stock_threshold')[:10])

        return Response({
            'date': target_date.isoformat(),
            'total_sales_revenue': total_sales_revenue,
            'cash_sales': cash_sales,
            'transfer_sales': transfer_sales,
            'credit_sales': credit_sales,
            'sales_count': sales.count(),
            'cogs': round(cogs, 2),
            'gross_profit': round(gross_profit, 2),
            'total_expenses': total_expenses,
            'cash_expenses': cash_expenses,
            'transfer_expenses': transfer_expenses,
            'expenses_count': expenses.count(),
            'net_cash_in_till': round(net_cash_in_till, 2),
            'net_profit': round(gross_profit - total_expenses, 2),
            'low_stock_products': low_stock_products,
        })


class DailyTrendsView(views.APIView):
    """7 / 30 day trend for the cashbook: per-day totals, top sellers, outstanding credit, best day."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import datetime
        from collections import defaultdict
        from django.db.models import Sum, Count
        from django.utils import timezone
        from .models import DailySale, DailyExpense

        try:
            days = max(2, min(90, int(request.query_params.get('days', 7))))
        except ValueError:
            days = 7
        today = timezone.localdate()
        start = today - datetime.timedelta(days=days - 1)

        sales = list(DailySale.objects.filter(user=request.user, is_voided=False, created_at__date__gte=start))
        expenses = list(DailyExpense.objects.filter(user=request.user, is_voided=False, created_at__date__gte=start))

        per_day = {(start + datetime.timedelta(days=i)).isoformat(): {'revenue': 0.0, 'expenses': 0.0, 'cogs': 0.0}
                   for i in range(days)}
        items = defaultdict(lambda: {'count': 0, 'revenue': 0.0, 'unit_price': 0.0, 'product_type': 'PHYSICAL', 'product_id': None})

        for s in sales:
            key = timezone.localtime(s.created_at).date().isoformat()
            if key in per_day:
                per_day[key]['revenue'] += float(s.total_amount)
                per_day[key]['cogs'] += float(s.cost_price or 0) * s.quantity
            it = items[s.item_name.strip().title()]
            it['count'] += s.quantity
            it['revenue'] += float(s.total_amount)
            it['unit_price'] = float(s.unit_price)
            it['product_id'] = s.product_id
            it['product_type'] = s.product.product_type if s.product_id and s.product else it['product_type']
        for e in expenses:
            key = timezone.localtime(e.created_at).date().isoformat()
            if key in per_day:
                per_day[key]['expenses'] += float(e.amount)

        series = []
        for day, v in per_day.items():
            profit = (v['revenue'] - v['cogs']) - v['expenses']
            series.append({'date': day, 'revenue': round(v['revenue'], 2), 'expenses': round(v['expenses'], 2),
                           'profit': round(profit, 2)})

        top_items = sorted(
            ({'name': k, **v, 'revenue': round(v['revenue'], 2)} for k, v in items.items()),
            key=lambda x: (-x['count'], -x['revenue']))[:8]

        total_rev = sum(d['revenue'] for d in series)
        total_exp = sum(d['expenses'] for d in series)
        active = [d for d in series if d['revenue'] > 0]
        best = max(active, key=lambda d: d['revenue']) if active else None
        outstanding = DailySale.objects.filter(user=request.user, is_voided=False, is_debt=True, payment_method='CREDIT') \
            .aggregate(total=Sum('total_amount'), n=Count('id'))

        return Response({
            'days': days,
            'series': series,
            'total_revenue': round(total_rev, 2),
            'total_expenses': round(total_exp, 2),
            'total_profit': round(sum(d['profit'] for d in series), 2),
            'avg_daily_revenue': round(total_rev / max(1, len(active)), 2),
            'best_day': best,
            'top_items': top_items,
            'credit_outstanding': float(outstanding['total'] or 0),
            'credit_entries': outstanding['n'] or 0,
        })


class DailySaleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import DailySaleSerializer
        return DailySaleSerializer

    def get_queryset(self):
        from .models import DailySale
        return DailySale.objects.filter(user=self.request.user, is_voided=False)

    def _check_owner_unlock(self, request):
        from users.views import is_user_apprentice_locked
        if is_user_apprentice_locked(request.user):
            return Response(
                {'error': 'Apprentice / Cashier Mode is locked. Owner verification is required to edit or void entries.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def update(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        from django.utils import timezone
        from .models import LedgerAuditLog
        instance = self.get_object()
        old_qty = instance.quantity
        old_product = instance.product
        prev_snapshot = {
            'item_name': instance.item_name,
            'quantity': instance.quantity,
            'total_amount': float(instance.total_amount),
            'payment_method': instance.payment_method,
            'is_debt': instance.is_debt,
        }

        updated_sale = serializer.save(is_edited=True, edited_at=timezone.now())

        # Adjust physical inventory atomically across edits/product changes
        from django.db.models import F
        if old_product and old_product.product_type == 'PHYSICAL':
            if updated_sale.product and old_product.pk == updated_sale.product.pk:
                qty_diff = updated_sale.quantity - old_qty
                if qty_diff > 0:
                    updated_count = Product.objects.filter(pk=old_product.pk, stock_count__gte=qty_diff).update(
                        stock_count=F('stock_count') - qty_diff
                    )
                    if not updated_count:
                        Product.objects.filter(pk=old_product.pk).update(stock_count=0)
                elif qty_diff < 0:
                    Product.objects.filter(pk=old_product.pk).update(stock_count=F('stock_count') + abs(qty_diff))
            else:
                Product.objects.filter(pk=old_product.pk).update(stock_count=F('stock_count') + old_qty)
                if updated_sale.product and updated_sale.product.product_type == 'PHYSICAL':
                    updated_count = Product.objects.filter(
                        pk=updated_sale.product.pk, stock_count__gte=updated_sale.quantity
                    ).update(stock_count=F('stock_count') - updated_sale.quantity)
                    if not updated_count:
                        Product.objects.filter(pk=updated_sale.product.pk).update(stock_count=0)
        elif updated_sale.product and updated_sale.product.product_type == 'PHYSICAL':
            Product.objects.filter(
                pk=updated_sale.product.pk, stock_count__gte=updated_sale.quantity
            ).update(stock_count=F('stock_count') - updated_sale.quantity)

        LedgerAuditLog.objects.create(
            user=self.request.user,
            entry_type='SALE',
            object_id=updated_sale.pk,
            action='EDIT',
            actor_mode='OWNER',
            snapshot={
                'before': prev_snapshot,
                'after': {
                    'item_name': updated_sale.item_name,
                    'quantity': updated_sale.quantity,
                    'total_amount': float(updated_sale.total_amount),
                    'payment_method': updated_sale.payment_method,
                    'is_debt': updated_sale.is_debt,
                }
            },
            note='Owner edited sale entry'
        )

    def perform_destroy(self, instance):
        from django.utils import timezone
        from django.db.models import F
        from .models import LedgerAuditLog
        if instance.product and instance.product.product_type == 'PHYSICAL' and instance.quantity > 0:
            Product.objects.filter(pk=instance.product.pk).update(stock_count=F('stock_count') + instance.quantity)
        instance.is_voided = True
        instance.voided_at = timezone.now()
        instance.save(update_fields=['is_voided', 'voided_at'])
        LedgerAuditLog.objects.create(
            user=self.request.user,
            entry_type='SALE',
            object_id=instance.pk,
            action='VOID',
            actor_mode='OWNER',
            snapshot={
                'item_name': instance.item_name,
                'quantity': instance.quantity,
                'total_amount': float(instance.total_amount),
                'payment_method': instance.payment_method,
            },
            note='Soft-voided by owner (append-only audit trail preserved)'
        )


class DailyExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import DailyExpenseSerializer
        return DailyExpenseSerializer

    def get_queryset(self):
        from .models import DailyExpense
        return DailyExpense.objects.filter(user=self.request.user, is_voided=False)

    def _check_owner_unlock(self, request):
        from users.views import is_user_apprentice_locked
        if is_user_apprentice_locked(request.user):
            return Response(
                {'error': 'Apprentice / Cashier Mode is locked. Owner verification is required to edit or void expenses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def update(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        blocked = self._check_owner_unlock(request)
        if blocked:
            return blocked
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        from django.utils import timezone
        from .models import LedgerAuditLog
        instance = self.get_object()
        prev_snapshot = {'title': instance.title, 'amount': float(instance.amount), 'category': instance.category}
        updated = serializer.save(is_edited=True, edited_at=timezone.now())
        LedgerAuditLog.objects.create(
            user=self.request.user,
            entry_type='EXPENSE',
            object_id=updated.pk,
            action='EDIT',
            actor_mode='OWNER',
            snapshot={'before': prev_snapshot, 'after': {'title': updated.title, 'amount': float(updated.amount), 'category': updated.category}},
            note='Owner edited expense entry'
        )

    def perform_destroy(self, instance):
        from django.utils import timezone
        from .models import LedgerAuditLog
        instance.is_voided = True
        instance.voided_at = timezone.now()
        instance.save(update_fields=['is_voided', 'voided_at'])
        LedgerAuditLog.objects.create(
            user=self.request.user,
            entry_type='EXPENSE',
            object_id=instance.pk,
            action='VOID',
            actor_mode='OWNER',
            snapshot={'title': instance.title, 'amount': float(instance.amount), 'category': instance.category},
            note='Soft-voided by owner (append-only audit trail preserved)'
        )


class DailyAIInsightsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'ai'

    def post(self, request):
        from django.db.models import Sum
        from django.utils import timezone
        import datetime
        from smartbiz_backend import gemini_utils
        from billing.utils import reserve_ai_credits, refund_ai_credits
        from .models import DailySale, DailyExpense

        allowed, remaining, reserved = reserve_ai_credits(request.user, 1, 'Daily AI Insights Brief')
        if not allowed:
            return Response({"error": "Insufficient BizCredits (requires 1 credit).", "credits": remaining}, status=status.HTTP_402_PAYMENT_REQUIRED)

        date_str = request.data.get('date') or request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                target_date = timezone.localdate()
        else:
            target_date = timezone.localdate()

        sales = DailySale.objects.filter(user=request.user, is_voided=False, created_at__date=target_date)
        expenses = DailyExpense.objects.filter(user=request.user, is_voided=False, created_at__date=target_date)

        total_sales_revenue = float(sales.aggregate(total=Sum('total_amount'))['total'] or 0.00)
        cash_sales = float(sales.filter(payment_method='CASH').aggregate(total=Sum('total_amount'))['total'] or 0.00)
        transfer_sales = float(sales.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('total_amount'))['total'] or 0.00)
        credit_sales = float(sales.filter(payment_method='CREDIT').aggregate(total=Sum('total_amount'))['total'] or 0.00)

        # COGS & Margins
        cogs = sum(float(s.cost_price or 0.0) * s.quantity for s in sales)
        gross_profit = total_sales_revenue - cogs
        margin_pct = round((gross_profit / total_sales_revenue * 100), 1) if total_sales_revenue > 0 else 0

        # Expenses breakdown
        total_expenses = float(expenses.aggregate(total=Sum('amount'))['total'] or 0.00)
        cash_expenses = float(expenses.filter(payment_method='CASH').aggregate(total=Sum('amount'))['total'] or 0.00)
        transfer_expenses = float(expenses.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('amount'))['total'] or 0.00)
        net_cash_in_till = cash_sales - cash_expenses
        net_profit = gross_profit - total_expenses

        # Details
        sales_summary_list = [f"{s.item_name} (Qty: {s.quantity}, ₦{s.total_amount:,.2f}, {s.payment_method})" for s in sales[:15]]
        expense_summary_list = [f"{e.get_category_display()}: {e.title} (₦{e.amount:,.2f})" for e in expenses[:10]]
        debt_sales_list = [f"{s.customer_name or 'Customer'} owes ₦{s.total_amount:,.2f} for {s.item_name}" for s in sales.filter(payment_method='CREDIT')[:5]]

        biz_name = getattr(request.user, 'business_name', '') or request.user.username

        sparsity_rule = (
            "NOTE ON SPARSE DATA: Very few transactions are logged today. Label insights clearly as preliminary based on limited entries; do NOT make sweeping multi-week business health claims."
            if sales.count() < 5 else ""
        )

        prompt = f"""You are an elite Chief Financial Officer & Senior Retail Operations Director for Nigerian MSMEs.
Analyze this Nigerian merchant's daily trading ledger for {target_date.strftime('%A, %d %B %Y')} and provide an executive operational intelligence brief.

IMPORTANT ACCOUNTING RULES:
1. A physical drawer cash count was NOT submitted in this AI request. NEVER state or imply "zero cash discrepancy", "till verified", or "physical drawer reconciled". Always refer to ₦{net_cash_in_till:,.2f} as the "expected system cash balance (pending physical count)" and remind the owner to count the physical drawer.
2. {sparsity_rule}

Business Name: {biz_name}
Daily Trading Figures (Nigerian Naira ₦):
- Total Sales Revenue: ₦{total_sales_revenue:,.2f} ({sales.count()} transactions)
  • Cash in Till (System Expected): ₦{cash_sales:,.2f}
  • Bank Transfer / POS: ₦{transfer_sales:,.2f}
  • Debt / Credit Given: ₦{credit_sales:,.2f} ({len(debt_sales_list)} debtor sales)
- Cost of Goods Sold (COGS): ₦{cogs:,.2f}
- Estimated Gross Profit: ₦{gross_profit:,.2f} (Margin: {margin_pct}%)
- Operational Petty Cash / Expenses: ₦{total_expenses:,.2f} ({expenses.count()} expense entries)
  • Cash paid from Till: ₦{cash_expenses:,.2f}
  • Transfer paid: ₦{transfer_expenses:,.2f}
- Expected System Cash in Till (Uncounted): ₦{net_cash_in_till:,.2f}
- Net Estimated Profit: ₦{net_profit:,.2f}

Sales logged: {', '.join(sales_summary_list) if sales_summary_list else 'No sales logged today'}
Expenses logged: {', '.join(expense_summary_list) if expense_summary_list else 'No expenses logged today'}
Debtors from today: {', '.join(debt_sales_list) if debt_sales_list else 'Zero customer debt'}

TASK:
Return a JSON dictionary matching this structure EXACTLY:
{{
    "headline": "Punchy 1-sentence headline capturing today's business outcome (e.g., 'Strong cash day with 42% net margin, watch generator fuel overhead')",
    "executiveSummary": "2-3 comprehensive paragraphs summarizing today's performance, customer purchase patterns, till liquidity, and profit health in realistic Nigerian retail context.",
    "performanceGrade": "A+ or A or B or C or D (based on profitability and cashflow)",
    "healthScore": 85,
    "leakagesAndRisks": [
        "Identified leak or risk 1 (e.g. Generator fuel was ₦X which is high relative to gross profit)",
        "Identified leak or risk 2 (e.g. Customer credit exposure of ₦Y with no deposits)"
    ],
    "tomorrowActionPlan": [
        "Immediate practical operational step 1 to take tomorrow morning",
        "Step 2 to drive higher sales or recover pending balances",
        "Step 3 for stock/inventory management"
    ],
    "recommendedFeatures": [
        {{
            "title": "Feature Name (e.g. Gbege Debt Recovery or AI Photo Studio or Done-for-You CAC)",
            "description": "Specific reason why activating this feature directly solves today's challenge.",
            "actionRoute": "debtor or content or brand or marketplace or inventory"
        }}
    ],
    "whatsappBriefText": "Complete ready-to-share WhatsApp evening summary formatted with Naija emojis, bullet points, and actionable takeaways."
}}
Return ONLY valid JSON.
"""

        try:
            ai_data = gemini_utils.generate_json_content(prompt)
            if isinstance(ai_data, dict) and 'executiveSummary' in ai_data:
                ai_data['credits'] = remaining
                ai_data['credits_deducted_server'] = True
                return Response(ai_data)
        except Exception as e:
            print(f"Daily AI Insights notice: {e}")

        refund_ai_credits(request.user, reserved, 'Daily AI Insights Fallback')

        # Zero-fail fallback
        grade = "A" if net_profit > 15000 else "B" if net_profit > 0 else "C" if total_sales_revenue > 0 else "D"
        score = 85 if net_profit > 15000 else 72 if net_profit > 0 else 50
        
        leakages = []
        if total_expenses > (gross_profit * 0.5) and gross_profit > 0:
            leakages.append(f"Operating expenses (₦{total_expenses:,.2f}) consumed over 50% of your gross margins today.")
        if credit_sales > 0:
            leakages.append(f"₦{credit_sales:,.2f} in unpaid customer credit given out today. Follow up before debts age.")
        if net_cash_in_till < 0:
            leakages.append("Cash paid out of the till exceeded cash collected today. Reconcile with bank transfer balance.")
        if not leakages:
            leakages.append("Maintain strict attendant shift handovers and avoid unlogged petty cash drawings.")

        actions = [
            "Review low stock items in Product Manager to prevent morning stockouts.",
            "Send polite automated WhatsApp payment links for any credit sales logged today.",
            "Reconcile bank transfer notifications against actual bank app balances before closing shift."
        ]

        recommended_features = []
        if credit_sales > 0:
            recommended_features.append({
                "title": "Gbege Book Debt Recovery",
                "description": f"You have ₦{credit_sales:,.2f} in credit sales today. Send automated Paystack payment links via WhatsApp.",
                "actionRoute": "debtor"
            })
        recommended_features.append({
            "title": "Product Catalog & Reordering",
            "description": "Track stock movements automatically from your 5-second Day-Book checkouts.",
            "actionRoute": "inventory"
        })

        whatsapp_text = (
            f"📊 *SmartBiz Daily Executive Brief • {biz_name}*\n"
            f"📅 *Date:* {target_date.strftime('%a, %d %b %Y')}\n\n"
            f"💰 *Revenue:* ₦{total_sales_revenue:,.2f} ({sales.count()} sales)\n"
            f"💵 *Cash in Till:* ₦{cash_sales:,.2f} | 🏦 *Transfer/POS:* ₦{transfer_sales:,.2f}\n"
            f"📒 *Credit Given:* ₦{credit_sales:,.2f}\n"
            f"💸 *Total Expenses:* ₦{total_expenses:,.2f}\n"
            f"🎯 *Net Profit:* ₦{net_profit:,.2f} (Grade: {grade})\n\n"
            f"💡 *Key Takeaway for Tomorrow:*\n"
            f"• {actions[0]}\n"
            f"• {actions[1]}\n\n"
            f"_Automated AI Intelligence via SmartBiz Coach OS 🚀_"
        )

        return Response({
            "headline": f"{biz_name} recorded ₦{total_sales_revenue:,.2f} revenue with ₦{net_profit:,.2f} net profit today.",
            "executiveSummary": (
                f"Today's trading generated ₦{total_sales_revenue:,.2f} across {sales.count()} sales, "
                f"delivering an estimated gross margin of ₦{gross_profit:,.2f}. Operational expenses totaled "
                f"₦{total_expenses:,.2f}, leaving a net operational profit of ₦{net_profit:,.2f}. "
                f"Physical cash remaining in till is ₦{net_cash_in_till:,.2f}."
            ),
            "performanceGrade": grade,
            "healthScore": score,
            "leakagesAndRisks": leakages,
            "costLeakages": leakages,
            "revenueBreakdownText": f"Gross Sales: ₦{total_sales_revenue:,.2f} | Operating Costs: ₦{total_expenses:,.2f} | Net Cash: ₦{net_cash_in_till:,.2f}",
            "tomorrowActionPlan": actions,
            "recommendedFeatures": [
                {
                    "title": rec.get("title", ""),
                    "description": rec.get("description", ""),
                    "actionRoute": rec.get("actionRoute", ""),
                    "featureName": rec.get("title", ""),
                    "whyRecommended": rec.get("description", ""),
                    "featureRoute": rec.get("actionRoute", ""),
                    "icon": "📒" if "debtor" in rec.get("actionRoute", "") else "📦"
                }
                for rec in recommended_features
            ],
            "whatsappBriefText": whatsapp_text
        })


class DailyAIAskView(views.APIView):
    """
    Interactive Day-Book AI Intelligence Assistant.
    Allows merchants to ask natural-language questions about their daily/weekly sales,
    stock movements, profit margins, cash vs transfers, debtors, and expenses.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'ai'

    def post(self, request):
        from django.db.models import Sum, Count
        from django.utils import timezone
        import datetime
        from smartbiz_backend import gemini_utils
        from billing.utils import reserve_ai_credits, refund_ai_credits
        from .models import DailySale, DailyExpense, Product

        question = str(request.data.get('question') or '').strip()
        if not question:
            return Response({"error": "Please provide a question about your sales."}, status=status.HTTP_400_BAD_REQUEST)

        allowed, remaining, reserved = reserve_ai_credits(request.user, 1, 'Day-Book AI Assistant Query')
        if not allowed:
            return Response({"error": "Insufficient BizCredits (requires 1 credit).", "credits": remaining}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 1. Determine Date Range
        scope = request.data.get('scope', 'today').lower()
        date_str = request.data.get('date')
        date_from = request.data.get('date_from')
        date_to = request.data.get('date_to')
        days = request.data.get('days')

        today = timezone.localdate()
        period_label = "Today"

        sales_qs = DailySale.objects.filter(user=request.user, is_voided=False)
        expenses_qs = DailyExpense.objects.filter(user=request.user, is_voided=False)

        if scope == 'yesterday':
            target_date = today - datetime.timedelta(days=1)
            sales_qs = sales_qs.filter(created_at__date=target_date)
            expenses_qs = expenses_qs.filter(created_at__date=target_date)
            period_label = f"Yesterday ({target_date.strftime('%a, %d %b %Y')})"
        elif scope == 'week' or str(days) == '7':
            start_d = today - datetime.timedelta(days=6)
            sales_qs = sales_qs.filter(created_at__date__gte=start_d)
            expenses_qs = expenses_qs.filter(created_at__date__gte=start_d)
            period_label = f"Last 7 Days ({start_d.strftime('%d %b')} - {today.strftime('%d %b %Y')})"
        elif scope == 'month' or str(days) == '30':
            start_d = today - datetime.timedelta(days=29)
            sales_qs = sales_qs.filter(created_at__date__gte=start_d)
            expenses_qs = expenses_qs.filter(created_at__date__gte=start_d)
            period_label = f"Last 30 Days ({start_d.strftime('%d %b')} - {today.strftime('%d %b %Y')})"
        elif date_from or date_to:
            if date_from:
                try:
                    df = datetime.date.fromisoformat(date_from)
                    sales_qs = sales_qs.filter(created_at__date__gte=df)
                    expenses_qs = expenses_qs.filter(created_at__date__gte=df)
                except ValueError:
                    pass
            if date_to:
                try:
                    dt = datetime.date.fromisoformat(date_to)
                    sales_qs = sales_qs.filter(created_at__date__lte=dt)
                    expenses_qs = expenses_qs.filter(created_at__date__lte=dt)
                except ValueError:
                    pass
            period_label = f"Period ({date_from or 'Start'} to {date_to or 'Now'})"
        elif date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
                sales_qs = sales_qs.filter(created_at__date=target_date)
                expenses_qs = expenses_qs.filter(created_at__date=target_date)
                period_label = target_date.strftime('%A, %d %B %Y')
            except ValueError:
                target_date = today
                sales_qs = sales_qs.filter(created_at__date=target_date)
                expenses_qs = expenses_qs.filter(created_at__date=target_date)
                period_label = f"Today ({today.strftime('%a, %d %b %Y')})"
        else:
            target_date = today
            sales_qs = sales_qs.filter(created_at__date=target_date)
            expenses_qs = expenses_qs.filter(created_at__date=target_date)
            period_label = f"Today ({today.strftime('%a, %d %b %Y')})"

        # 2. Extract Comprehensive Ledger Facts
        total_revenue = float(sales_qs.aggregate(total=Sum('total_amount'))['total'] or 0.0)
        cash_sales = float(sales_qs.filter(payment_method='CASH').aggregate(total=Sum('total_amount'))['total'] or 0.0)
        transfer_sales = float(sales_qs.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('total_amount'))['total'] or 0.0)
        credit_sales = float(sales_qs.filter(payment_method='CREDIT').aggregate(total=Sum('total_amount'))['total'] or 0.0)
        sales_count = sales_qs.count()

        total_expenses = float(expenses_qs.aggregate(total=Sum('amount'))['total'] or 0.0)
        cash_expenses = float(expenses_qs.filter(payment_method='CASH').aggregate(total=Sum('amount'))['total'] or 0.0)
        transfer_expenses = float(expenses_qs.filter(payment_method__in=['TRANSFER', 'POS']).aggregate(total=Sum('amount'))['total'] or 0.0)
        net_cash_in_till = cash_sales - cash_expenses

        # Itemized Stock Sales Summary
        # Group sales by normalized item name
        sales_list = list(sales_qs.select_related('product'))
        item_map = {}
        for s in sales_list:
            key = s.item_name.strip()
            if key not in item_map:
                prod = s.product
                item_map[key] = {
                    'name': key,
                    'quantity_sold': 0,
                    'revenue': 0.0,
                    'cost': 0.0,
                    'profit': 0.0,
                    'stock_remaining': prod.stock_count if (prod and prod.product_type == 'PHYSICAL') else None,
                    'product_type': prod.product_type if prod else 'PHYSICAL',
                    'category': (getattr(prod, 'category', None) or 'General') if prod else 'General'
                }
            qty = s.quantity or 1
            tot = float(s.total_amount or 0.0)
            cost = float(s.cost_price or 0.0) * qty
            item_map[key]['quantity_sold'] += qty
            item_map[key]['revenue'] += tot
            item_map[key]['cost'] += cost
            item_map[key]['profit'] += (tot - cost)

        sorted_by_revenue = sorted(item_map.values(), key=lambda x: x['revenue'], reverse=True)
        sorted_by_qty = sorted(item_map.values(), key=lambda x: x['quantity_sold'], reverse=True)
        sorted_by_profit = sorted(item_map.values(), key=lambda x: x['profit'], reverse=True)

        top_by_revenue = sorted_by_revenue[0] if sorted_by_revenue else None
        top_by_qty = sorted_by_qty[0] if sorted_by_qty else None
        top_by_profit = sorted_by_profit[0] if sorted_by_profit else None

        cogs = sum(x['cost'] for x in item_map.values())
        gross_profit = total_revenue - cogs
        net_profit = gross_profit - total_expenses
        margin_pct = round((gross_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

        # Debtors
        debtors = []
        for s in sales_list:
            if s.payment_method == 'CREDIT':
                debtors.append({
                    'customer': s.customer_name or 'Walk-in Customer',
                    'item': s.item_name,
                    'amount': float(s.total_amount or 0.0),
                    'phone': s.customer_phone or '',
                    'due_date': str(s.debt_due_date or '')
                })

        # Expenses list
        expenses_list = list(expenses_qs)
        expense_breakdown = {}
        for e in expenses_list:
            cat = e.get_category_display()
            expense_breakdown[cat] = expense_breakdown.get(cat, 0.0) + float(e.amount or 0.0)

        biz_name = getattr(request.user, 'business_name', '') or request.user.username

        # Build prompt for Gemini
        products_summary_str = "\n".join([
            f"- {p['name']}: {p['quantity_sold']} units sold, Revenue: ₦{p['revenue']:,.2f}, Profit: ₦{p['profit']:,.2f}, Remaining Stock: {p['stock_remaining'] if p['stock_remaining'] is not None else 'N/A'}"
            for p in sorted_by_revenue[:15]
        ]) or "No items sold."

        debtors_summary_str = "\n".join([
            f"- {d['customer']}: ₦{d['amount']:,.2f} for {d['item']}"
            for d in debtors[:10]
        ]) or "No credit sales / zero debtors."

        expenses_summary_str = "\n".join([
            f"- {k}: ₦{v:,.2f}"
            for k, v in expense_breakdown.items()
        ]) or "No expenses logged."

        prompt = f"""You are the intelligent Day-Book AI Copilot & Retail Accountant for '{biz_name}', a Nigerian MSME.
A merchant has asked a specific question about their daily operations and sales records.

PERIOD: {period_label}
VERIFIED GROUND-TRUTH FINANCIAL & STOCK DATA:
• Total Revenue: ₦{total_revenue:,.2f} across {sales_count} sales transactions
• Cash in Till: ₦{cash_sales:,.2f}
• Bank Transfer / POS: ₦{transfer_sales:,.2f}
• Customer Credit / Debt: ₦{credit_sales:,.2f}
• Estimated Cost of Goods (COGS): ₦{cogs:,.2f}
• Gross Profit: ₦{gross_profit:,.2f} (Margin: {margin_pct}%)
• Total Petty Cash / Expenses: ₦{total_expenses:,.2f}
  - Cash paid from till: ₦{cash_expenses:,.2f}
  - Transfer paid: ₦{transfer_expenses:,.2f}
• Net Physical Cash in Till: ₦{net_cash_in_till:,.2f}
• Net Trading Profit: ₦{net_profit:,.2f}

STOCK & PRODUCTS SOLD:
{products_summary_str}

DEBTORS:
{debtors_summary_str}

EXPENSES:
{expenses_summary_str}

MERCHANT'S QUESTION:
"{question}"

GUIDELINES:
1. Answer the merchant's question DIRECTLY, accurately, and politely in crisp, natural Nigerian business English.
2. Quote exact figures with the Nigerian Naira symbol (₦) and exact quantities from the ledger.
3. Keep the answer concise (2-4 bullet points or short paragraphs), well formatted with bolding and emojis.
4. If they ask about a product, stock, debtor, payment method, or profit, give the exact numbers immediately.
5. If relevant, end with one practical tip to improve tomorrow's cashflow or stock control.
"""

        ai_answer = ""
        ai_ok = False
        try:
            ai_answer = gemini_utils.generate_text_content(prompt)
            if ai_answer and len(ai_answer.strip()) >= 10 and not ai_answer.strip().startswith("Error:"):
                ai_ok = True
        except Exception as e:
            print(f"Daily AI Ask exception: {e}")

        if not ai_ok:
            remaining = refund_ai_credits(request.user, reserved, 'Day-Book AI Assistant Fallback')

        # Deterministic Intelligent Fallback if Gemini fails or is offline
        if not ai_answer or len(ai_answer.strip()) < 10 or ai_answer.strip().startswith("Error:"):
            q_lower = question.lower()
            if any(k in q_lower for k in ['top', 'best', 'most', 'highest sale', 'bestseller']):
                if top_by_revenue:
                    ai_answer = (
                        f"🏆 **Top Selling Item ({period_label}):**\n\n"
                        f"• **By Revenue:** **{top_by_revenue['name']}** generated **₦{top_by_revenue['revenue']:,.2f}** ({top_by_revenue['quantity_sold']} units sold).\n"
                        f"• **Estimated Profit:** **₦{top_by_revenue['profit']:,.2f}**.\n"
                    )
                    if top_by_qty and top_by_qty['name'] != top_by_revenue['name']:
                        ai_answer += f"• **By Volume:** **{top_by_qty['name']}** had the highest units sold (**{top_by_qty['quantity_sold']} units**, ₦{top_by_qty['revenue']:,.2f}).\n"
                    if top_by_revenue['stock_remaining'] is not None:
                        ai_answer += f"• **Remaining Stock:** {top_by_revenue['stock_remaining']} units left in your store."
                else:
                    ai_answer = f"No sales have been logged for {period_label} yet."

            elif any(k in q_lower for k in ['cash', 'transfer', 'pos', 'bank', 'payment', 'method']):
                ai_answer = (
                    f"💳 **Payment Breakdown ({period_label}):**\n\n"
                    f"• 💵 **Cash in Till:** **₦{cash_sales:,.2f}** ({(cash_sales/total_revenue*100):.1f}% of sales)\n"
                    f"• 🏦 **Bank Transfer / POS:** **₦{transfer_sales:,.2f}** ({(transfer_sales/total_revenue*100):.1f}% of sales)\n"
                    f"• 📒 **Credit / Debt:** **₦{credit_sales:,.2f}**\n"
                    f"• 💼 **Net Cash Remaining in Till:** **₦{net_cash_in_till:,.2f}** after paying ₦{cash_expenses:,.2f} petty cash."
                ) if total_revenue > 0 else f"No payments recorded for {period_label}."

            elif any(k in q_lower for k in ['profit', 'gain', 'margin', 'make', 'earning']):
                ai_answer = (
                    f"📈 **Profit Analysis ({period_label}):**\n\n"
                    f"• **Total Revenue:** **₦{total_revenue:,.2f}**\n"
                    f"• **Cost of Goods Sold (COGS):** ₦{cogs:,.2f}\n"
                    f"• **Gross Profit:** **₦{gross_profit:,.2f}** ({margin_pct}% margin)\n"
                    f"• **Operating Expenses:** ₦{total_expenses:,.2f}\n"
                    f"• **Net Take-Home Profit:** **₦{net_profit:,.2f}**\n"
                )
                if top_by_profit:
                    ai_answer += f"\n💡 Most profitable item was **{top_by_profit['name']}** making **₦{top_by_profit['profit']:,.2f}** profit."

            elif any(k in q_lower for k in ['debt', 'owe', 'credit', 'customer']):
                if debtors:
                    debtor_lines = "\n".join([f"• **{d['customer']}**: ₦{d['amount']:,.2f} ({d['item']})" for d in debtors[:5]])
                    ai_answer = (
                        f"📒 **Debtors ({period_label}):**\n\n"
                        f"Total unpaid credit given: **₦{credit_sales:,.2f}** across {len(debtors)} transaction(s).\n\n"
                        f"{debtor_lines}\n\n"
                        f"👉 *Recommendation:* Send a polite WhatsApp payment reminder with your account number."
                    )
                else:
                    ai_answer = f"🎉 Great news! There are **zero credit sales / debtors** for {period_label}. All sales were settled via Cash or Transfer."

            elif any(k in q_lower for k in ['stock', 'inventory', 'left', 'remain', 'low']):
                low_stock = [x for x in sorted_by_revenue if x['stock_remaining'] is not None and x['stock_remaining'] <= 5]
                if low_stock:
                    low_lines = "\n".join([f"• ⚠️ **{x['name']}**: Only **{x['stock_remaining']} units** remaining!" for x in low_stock[:5]])
                    ai_answer = f"📦 **Inventory Movement & Low Stock Alert ({period_label}):**\n\n{low_lines}\n\nConsider reordering from your supplier before morning trade."
                elif sorted_by_revenue:
                    stock_lines = "\n".join([f"• **{x['name']}**: {x['quantity_sold']} sold today, {x['stock_remaining'] if x['stock_remaining'] is not None else 'N/A'} left in stock" for x in sorted_by_revenue[:5]])
                    ai_answer = f"📦 **Stock Records ({period_label}):**\n\n{stock_lines}"
                else:
                    ai_answer = f"No stock movement logged for {period_label}."

            elif any(k in q_lower for k in ['expense', 'spend', 'petty', 'fuel', 'generator', 'cost']):
                if expenses_list:
                    exp_lines = "\n".join([f"• **{k}**: ₦{v:,.2f}" for k, v in expense_breakdown.items()])
                    ai_answer = (
                        f"💸 **Expenses Recorded ({period_label}):**\n\n"
                        f"Total Operating Outflow: **₦{total_expenses:,.2f}**\n\n"
                        f"{exp_lines}\n\n"
                        f"• 💵 Cash paid from till: ₦{cash_expenses:,.2f}\n"
                        f"• 🏦 Bank transfer paid: ₦{transfer_expenses:,.2f}"
                    )
                else:
                    ai_answer = f"No expenses logged for {period_label}."

            else:
                ai_answer = (
                    f"📊 **Daily Operations Summary ({period_label}):**\n\n"
                    f"• **Revenue:** ₦{total_revenue:,.2f} ({sales_count} sales)\n"
                    f"• **Net Profit:** ₦{net_profit:,.2f} ({margin_pct}% gross margin)\n"
                    f"• **Cash in Till:** ₦{net_cash_in_till:,.2f} (Cash sales ₦{cash_sales:,.2f} minus expenses ₦{cash_expenses:,.2f})\n"
                    f"• **Bank Transfers:** ₦{transfer_sales:,.2f}\n"
                    f"• **Top Product:** {top_by_revenue['name'] if top_by_revenue else 'None'} (₦{top_by_revenue['revenue']:,.2f} sold)\n"
                )

        return Response({
            "question": question,
            "period_label": period_label,
            "answer": ai_answer,
            "credits": remaining,
            "credits_deducted_server": ai_ok,
            "metrics": {
                "total_revenue": total_revenue,
                "sales_count": sales_count,
                "cash_sales": cash_sales,
                "transfer_sales": transfer_sales,
                "credit_sales": credit_sales,
                "gross_profit": gross_profit,
                "total_expenses": total_expenses,
                "net_profit": net_profit,
                "net_cash_in_till": net_cash_in_till
            },
            "top_products": sorted_by_revenue[:10],
            "debtors": debtors[:10]
        })


from .voice_pos import VoicePOSIngestView, VoicePOSConfirmView  # noqa: E402,F401


class PaperReceiptOCRView(views.APIView):
    """
    Paper Receipt & Supplier Waybill OCR Scanner.
    Atomically reserves 1 BizCredit before calling Gemini Vision and refunds on failure.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'ai'

    def post(self, request):
        import base64
        from smartbiz_backend import gemini_utils
        from billing.utils import reserve_ai_credits, refund_ai_credits

        MAX_IMAGE_BYTES = 10 * 1024 * 1024
        img_file = request.FILES.get('receipt_image')
        img_b64 = request.data.get('image_base64') or request.data.get('receipt_image')
        mime_type = request.data.get('mimeType') or 'image/jpeg'

        if img_file:
            if getattr(img_file, 'size', 0) > MAX_IMAGE_BYTES:
                return Response({"error": "Receipt image exceeds 10 MB size limit."}, status=status.HTTP_400_BAD_REQUEST)
            raw_bytes = img_file.read(MAX_IMAGE_BYTES + 1)
            if len(raw_bytes) > MAX_IMAGE_BYTES:
                return Response({"error": "Receipt image exceeds 10 MB size limit."}, status=status.HTTP_400_BAD_REQUEST)
            img_b64 = base64.b64encode(raw_bytes).decode('utf-8')
            raw_mime = img_file.content_type or 'image/jpeg'
            mime_type = 'image/png' if 'png' in raw_mime else 'image/jpeg'
        elif isinstance(img_b64, str) and len(img_b64) > MAX_IMAGE_BYTES * 2:
            return Response({"error": "Receipt image payload exceeds maximum size limit."}, status=status.HTTP_400_BAD_REQUEST)

        if not img_b64:
            return Response({"error": "No receipt or ledger image provided."}, status=status.HTTP_400_BAD_REQUEST)

        allowed, remaining, reserved = reserve_ai_credits(request.user, 1, 'Paper Receipt OCR Scan')
        if not allowed:
            return Response({"error": "Insufficient BizCredits (requires 1 credit).", "credits": remaining}, status=status.HTTP_402_PAYMENT_REQUIRED)

        prompt = """
        You are an institutional OCR & Financial Document Vision AI for Nigerian trade receipts and handwritten shop ledger notes.
        Inspect the uploaded receipt, supplier invoice, or handwritten ledger page carefully.
        Extract all line items, supplier name, date, and totals:

        Respond STRICTLY with a valid JSON object matching this schema:
        {
            "supplier_or_store": "Supplier or Store Name",
            "receipt_date": "YYYY-MM-DD or readable date",
            "total_receipt_amount": 75000,
            "currency": "NGN",
            "line_items": [
                {
                    "item_name": "Product Name",
                    "quantity": 5,
                    "unit_cost": 15000,
                    "total_line_amount": 75000,
                    "category": "General Goods"
                }
            ],
            "document_type": "RECEIPT",
            "confidence_score": 95
        }
        """

        try:
            parsed = gemini_utils.generate_json_content(
                prompt,
                image_base64=img_b64,
                mime_type=mime_type
            )

            if not isinstance(parsed, dict) or "line_items" not in parsed:
                refund_ai_credits(request.user, reserved, 'Paper Receipt OCR Invalid Response')
                return Response(
                    {"error": "Could not clearly read receipt line items. Please take a brighter, clearer photo and try again."},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            parsed['credits'] = remaining
            parsed['credits_deducted_server'] = True
            return Response(parsed, status=status.HTTP_200_OK)

        except Exception as err:
            refund_ai_credits(request.user, reserved, 'Paper Receipt OCR Failure')
            return Response({"error": f"Failed to parse receipt image: {str(err)}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class VisualSearchProductView(views.APIView):
    """
    Cutting-Edge AI Feature: Visual Search by Image & Photo Matching.
    Authenticated users/merchants upload an image and match against catalog items.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'visual_search'

    def post(self, request):
        import base64
        from smartbiz_backend import gemini_utils
        from billing.utils import reserve_ai_credits, refund_ai_credits
        from billing.catalog import AI_CREDIT_COSTS

        MAX_IMAGE_BYTES = 10 * 1024 * 1024
        img_file = request.FILES.get('image')
        img_b64 = request.data.get('image_base64') or request.data.get('image')
        mime_type = request.data.get('mimeType') or 'image/jpeg'

        if img_file:
            if getattr(img_file, 'size', 0) > MAX_IMAGE_BYTES:
                return Response({"error": "Image exceeds 10 MB size limit."}, status=status.HTTP_400_BAD_REQUEST)
            raw_bytes = img_file.read(MAX_IMAGE_BYTES + 1)
            if len(raw_bytes) > MAX_IMAGE_BYTES:
                return Response({"error": "Image exceeds 10 MB size limit."}, status=status.HTTP_400_BAD_REQUEST)
            img_b64 = base64.b64encode(raw_bytes).decode('utf-8')
            raw_mime = img_file.content_type or 'image/jpeg'
            mime_type = 'image/png' if 'png' in raw_mime else 'image/jpeg'
        elif isinstance(img_b64, str) and len(img_b64) > MAX_IMAGE_BYTES * 2:
            return Response({"error": "Image payload exceeds maximum size limit."}, status=status.HTTP_400_BAD_REQUEST)

        if not img_b64:
            return Response({"error": "No query image provided."}, status=status.HTTP_400_BAD_REQUEST)

        cost = AI_CREDIT_COSTS.get('visual_search', 1)
        allowed, remaining, reserved = reserve_ai_credits(request.user, cost, 'Visual Product Search')
        if not allowed:
            return Response({"error": f"Insufficient BizCredits (requires {cost} credit).", "credits": remaining}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 1. Inspect image to extract search tags & visual description
        prompt = """
        You are a Visual Product Search AI for Nigerian commerce.
        Inspect the uploaded product image. Identify the primary item, style, color, category, and 3-5 search keywords.
        Respond STRICTLY with a valid JSON:
        {
            "detected_item": "Specific item name",
            "category": "Fashion / Electronics / Beauty / Groceries / etc.",
            "color": "Primary color",
            "keywords": ["keyword1", "keyword2", "keyword3"]
        }
        """

        try:
            parsed = gemini_utils.generate_json_content(prompt, image_base64=img_b64, mime_type=mime_type)
            if not isinstance(parsed, dict) or parsed.get("error"):
                refund_ai_credits(request.user, reserved, 'Visual Search Unavailable')
                return Response({"error": "Visual search temporarily unavailable."}, status=status.HTTP_502_BAD_GATEWAY)
            keywords = parsed.get("keywords", []) if isinstance(parsed, dict) else []
            detected_name = parsed.get("detected_item", "") if isinstance(parsed, dict) else ""
            category = parsed.get("category", "") if isinstance(parsed, dict) else ""

            # 2. Query matching products from catalog
            query = Q()
            if detected_name:
                query |= Q(name__icontains=detected_name)
            for kw in keywords:
                if len(kw) > 2:
                    query |= Q(name__icontains=kw) | Q(description__icontains=kw)
            if category:
                query |= Q(category__icontains=category)

            matching_products = Product.objects.filter(query, is_public=True, is_suspended=False).distinct()[:8]
            if not matching_products.exists():
                matching_products = Product.objects.filter(is_public=True, is_suspended=False).order_by('-created_at')[:6]

            serializer = PublicProductSerializer(matching_products, many=True, context={'request': request})

            return Response({
                "detected_item": detected_name or "Store Product",
                "category": category,
                "keywords": keywords,
                "matches_count": len(serializer.data),
                "products": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            fallback_prods = Product.objects.filter(is_public=True)[:6]
            from .serializers import ProductSerializer
            serializer = ProductSerializer(fallback_prods, many=True, context={'request': request})
            return Response({
                "detected_item": "Store Item",
                "category": "General",
                "keywords": ["verified"],
                "matches_count": len(serializer.data),
                "products": serializer.data
            }, status=status.HTTP_200_OK)


class WhatsAppCartRecoveryView(views.APIView):
    """
    Cutting-Edge AI Feature: Smart WhatsApp Cart Recovery Copilot.
    Predicts optimal incentive / delivery subsidy to recover abandoned leads or orders,
    and generates an instant personalized WhatsApp 1-tap conversion link.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'cart_recovery'

    def post(self, request):
        lead_id = request.data.get('lead_id')
        customer_name = request.data.get('customer_name') or 'Valued Customer'
        customer_phone = request.data.get('customer_phone') or ''
        product_name = request.data.get('product_name') or 'your selected items'
        order_amount = float(request.data.get('order_amount') or 15000.0)

        # Algorithmic sweet spot subsidy (3-5% or ₦500-₦1,500 delivery support)
        subsidy_amount = 500 if order_amount < 20000 else (1000 if order_amount < 50000 else 2000)
        biz_name = getattr(request.user, 'business_name', '') or 'our store'

        whatsapp_message = (
            f"Hello {customer_name}! 👋\n\n"
            f"We noticed you were checking out *{product_name}* at {biz_name}. "
            f"We held your reservation so you wouldn't miss out on the current batch!\n\n"
            f"🎁 *Special Courtesy Offer:* We've approved a ₦{subsidy_amount:,} dispatch subsidy on your order today to make delivery seamless for you.\n\n"
            f"Would you like us to package your order for nationwide waybill right away? Just reply 'YES' and we'll handle the rest! 🚚✨"
        )

        clean_phone = customer_phone.replace('+', '').replace(' ', '').replace('-', '')
        if clean_phone.startswith('0') and len(clean_phone) == 11:
            clean_phone = '234' + clean_phone[1:]

        import urllib.parse
        encoded_text = urllib.parse.quote(whatsapp_message)
        wa_link = f"https://wa.me/{clean_phone}?text={encoded_text}" if clean_phone else f"https://wa.me/?text={encoded_text}"

        return Response({
            "customer_name": customer_name,
            "product_name": product_name,
            "order_amount": order_amount,
            "suggested_subsidy": subsidy_amount,
            "projected_recovery_rate": "28%",
            "whatsapp_message": whatsapp_message,
            "whatsapp_link": wa_link
        }, status=status.HTTP_200_OK)


class PublicDebtorSettlementView(views.APIView):
    """
    Publicly accessible endpoint for debtors to view their debt details,
    the merchant's verified bank account, and settle their balance via unguessable token.
    """
    permission_classes = [permissions.AllowAny]

    @staticmethod
    def _find_sale(debtor_id, lock=False):
        from .models import DailySale
        token = str(debtor_id or '').strip()
        if not token or len(token) < 6:
            return None
        qs = DailySale.objects.select_for_update() if lock else DailySale.objects
        qs = qs.filter(is_voided=False)
        sale = qs.filter(settlement_token=token).first()
        if not sale:
            sale = qs.filter(notes__contains=f"#{token}").first()
        return sale

    def get(self, request, debtor_id):
        from .models import VendorVerification

        sale = self._find_sale(debtor_id, lock=False)
        if not sale:
            return Response({"found": False}, status=status.HTTP_404_NOT_FOUND)

        user = sale.user
        vendor = VendorVerification.objects.filter(user=user).first()

        # Reject any demo or placeholder bank accounts
        INVALID_PLACEHOLDERS = ['0098765432', '1012345678', '0123456789', '1234567890']
        has_verified_bank = bool(
            vendor and
            vendor.account_number and
            vendor.account_number not in INVALID_PLACEHOLDERS and
            vendor.bank_name
        )

        merchant_name = ""
        if vendor and vendor.business_name:
            merchant_name = vendor.business_name
        elif getattr(user, 'business_name', ''):
            merchant_name = user.business_name
        elif user.get_full_name():
            merchant_name = user.get_full_name()
        else:
            merchant_name = "SmartBiz Verified Merchant"

        merchant_phone = (vendor.whatsapp_number if vendor and vendor.whatsapp_number else (getattr(user, 'phone', '') or ''))

        return Response({
            "found": True,
            "id": debtor_id,
            "customer_name": sale.customer_name or "Valued Customer",
            "customer_phone": sale.customer_phone or "",
            "item_name": sale.item_name or "Credit Purchase",
            "total_amount": float(sale.total_amount),
            "outstanding": float(sale.total_amount) if sale.is_debt else 0.0,
            "is_paid": not sale.is_debt,
            "due_date": str(sale.debt_due_date) if sale.debt_due_date else "",
            "merchant_name": merchant_name,
            "merchant_phone": merchant_phone,
            "bank_name": vendor.bank_name if has_verified_bank else "",
            "bank_code": getattr(vendor, 'bank_code', '') if has_verified_bank else "",
            "account_number": vendor.account_number if has_verified_bank else "",
            "account_name": vendor.account_name if has_verified_bank else "",
            "has_verified_bank": has_verified_bank
        }, status=status.HTTP_200_OK)

    def post(self, request, debtor_id):
        """Mark debt settled ONLY after server-side Paystack verification of both status and paid amount."""
        from decimal import Decimal
        from django.db import transaction
        from billing.models import PaymentReferenceLedger
        from .commerce_orders import verify_paystack
        from .models import DailySale, LedgerAuditLog

        reference = str(request.data.get('reference') or '').strip()
        if not reference:
            return Response({"error": "Verified Paystack reference is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Look up the target debt first so same-debt retries stay idempotent while cross-debt replays fail 409
        sale_precheck = self._find_sale(debtor_id, lock=False)
        if not sale_precheck:
            return Response({"error": "Debt record not found."}, status=status.HTTP_404_NOT_FOUND)
        if sale_precheck.settlement_reference == reference or f"Paystack (Ref: {reference})" in (sale_precheck.notes or ""):
            return Response({"success": True, "idempotent": True, "message": "Debt settlement already recorded for this reference."})
        if DailySale.objects.filter(settlement_reference=reference).exists() or DailySale.objects.filter(notes__icontains=f"Paystack (Ref: {reference})").exists():
            return Response({"error": "This payment reference was already applied to another debt record."}, status=status.HTTP_409_CONFLICT)

        outcome, paid_amount = verify_paystack(reference)
        if outcome != 'success' or paid_amount is None:
            return Response(
                {"error": "Payment reference could not be verified with Paystack."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        with transaction.atomic():
            claimed = PaymentReferenceLedger.objects.select_for_update().filter(reference=reference).first()
            if claimed and (claimed.purpose != 'DEBT_SETTLEMENT' or str(claimed.target_id) != str(sale_precheck.pk)):
                return Response({"error": "This payment reference was already used for another transaction."}, status=status.HTTP_409_CONFLICT)

            sale = self._find_sale(debtor_id, lock=True)
            if not sale:
                return Response({"error": "Debt record not found."}, status=status.HTTP_404_NOT_FOUND)

            if not sale.is_debt:
                return Response({"success": True, "idempotent": True, "message": "Debt is already marked settled."})

            if paid_amount + Decimal('1') < sale.total_amount:
                return Response(
                    {"error": f"Verified Paystack amount (₦{paid_amount:,.2f}) is less than outstanding debt (₦{sale.total_amount:,.2f})."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not claimed:
                PaymentReferenceLedger.objects.create(
                    reference=reference,
                    purpose='DEBT_SETTLEMENT',
                    user=sale.user,
                    amount_ngn=paid_amount,
                    target_id=str(sale.pk),
                )

            sale.is_debt = False
            sale.settlement_reference = reference
            sale.notes = (sale.notes or "") + f" | Settled via 1-Tap Paystack (Ref: {reference})"
            sale.save(update_fields=['is_debt', 'settlement_reference', 'notes'])

            LedgerAuditLog.objects.create(
                user=sale.user,
                entry_type='SALE',
                object_id=sale.pk,
                action='SETTLE',
                actor_mode='PUBLIC_PAYSTACK',
                snapshot={
                    'reference': reference,
                    'paid_amount': float(paid_amount),
                    'debt_amount': float(sale.total_amount),
                },
                note=f'Verified Paystack settlement {reference}'
            )
            return Response({"success": True, "message": "Debt settled and reconciled successfully."})



