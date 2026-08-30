from rest_framework import generics, permissions, filters, views, status
from rest_framework.response import Response
from django.db.models import Q
from .models import VendorVerification, MarketplaceListing, Product, Lead
from .serializers import VendorVerificationSerializer, MarketplaceListingSerializer, ProductSerializer, LeadSerializer

# ... existing views ...

class LeadListCreateView(generics.ListCreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Lead.objects.filter(brand__user=self.request.user).order_by('-created_at')
        return Lead.objects.none()

    def perform_create(self, serializer):
        from brand.models import BrandIdentity
        product_id = self.request.data.get('product')
        if product_id:
            try:
                product = Product.objects.get(id=product_id)
                serializer.save(brand=product.brand)
                return
            except Product.DoesNotExist:
                pass

        if self.request.user.is_authenticated:
            brand, _ = BrandIdentity.objects.get_or_create(
                user=self.request.user,
                defaults={'business_name': getattr(self.request.user, 'business_name', '') or 'My Business'}
            )
            serializer.save(brand=brand)

class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Lead.objects.filter(brand__user=self.request.user)

class EcosystemAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count
        user_products = Product.objects.filter(brand__user=request.user)
        user_leads = Lead.objects.filter(brand__user=request.user)
        
        # Calculations
        inventory_value = user_products.filter(product_type='PHYSICAL').aggregate(total=Sum('price'))['total'] or 0
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

class OrderCreateView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        items = request.data.get('items', [])
        reference = request.data.get('reference', '')
        total_amount = request.data.get('total_amount', 0)
        
        # Extract rich customer profile details
        customer_name = (request.data.get('customer_name') or 
                         (request.user.is_authenticated and (request.user.get_full_name() or request.user.username)) or 
                         'Customer').strip()
        customer_contact = (request.data.get('customer_phone') or 
                            request.data.get('customer_contact') or 
                            (request.user.is_authenticated and request.user.email) or 
                            'Direct Buyer').strip()
        customer_address = (request.data.get('customer_address') or 
                            request.data.get('delivery_address') or 
                            'Standard Waybill / Delivery').strip()
        order_notes = (request.data.get('notes') or '').strip()
        
        leads_created = []
        for item in items:
            product_id = item.get('productId') or item.get('product_id') or item.get('id')
            try:
                product = Product.objects.get(id=product_id)
                qty = int(item.get('quantity') or 1)
                item_price = float(item.get('price') or product.price)
                
                # Compose detailed order lead message
                msg_parts = [
                    f"🛒 Order Paid & Confirmed (Ref: {reference or 'DIRECT'})",
                    f"Item: {product.name} (Qty: {qty})",
                    f"Total: ₦{item_price * qty:,.2f}",
                    f"Customer: {customer_name} ({customer_contact})",
                    f"Delivery Address: {customer_address}"
                ]
                if order_notes:
                    msg_parts.append(f"Notes: {order_notes}")

                lead = Lead.objects.create(
                    brand=product.brand,
                    product=product,
                    customer_name=customer_name,
                    customer_contact=customer_contact,
                    message="\n".join(msg_parts),
                    lead_type='ORDER',
                    status='WON',
                    quoted_price=item_price * qty
                )
                leads_created.append(lead.id)
            except (Product.DoesNotExist, ValueError, TypeError):
                continue

        return Response({
            "message": "Order processed and leads created for vendors",
            "leads": leads_created
        }, status=status.HTTP_201_CREATED)

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
        queryset = MarketplaceListing.objects.filter(is_active=True).order_by('-created_at')
        
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
        queryset = Product.objects.filter(brand__user=self.request.user)
        product_type = self.request.query_params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type=product_type)
        return queryset

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
        return Product.objects.filter(brand__user=self.request.user)

class PublicBrandProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [] # Public

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return Product.objects.filter(brand__slug=slug, is_public=True)

class GlobalMarketplaceListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [] # Public
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'category', 'location', 'brand__business_name']

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()

        # Housekeeping: update any expired promoted items
        Product.objects.filter(is_promoted=True, promoted_until__lt=now).update(is_promoted=False)

        queryset = Product.objects.filter(is_public=True)
        
        # Product type filter (PHYSICAL, SERVICE, PROPERTY, B2B)
        product_type = self.request.query_params.get('product_type')
        if product_type and product_type != 'ALL':
            queryset = queryset.filter(product_type=product_type)
            
        # Category sub-filter
        category = self.request.query_params.get('category')
        if category and category.strip():
            queryset = queryset.filter(category__iexact=category.strip())
            
        # State / Geo-Location filter (e.g. Lagos, Abuja, Onitsha, etc.)
        location = self.request.query_params.get('location')
        if location and location.strip() and location.strip() != 'ALL':
            queryset = queryset.filter(location__icontains=location.strip())

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

class DashboardSearchView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'category', 'location']

    def get_queryset(self):
        # Search across ALL the user's ecosystem items
        return Product.objects.filter(brand__user=self.request.user).order_by('-created_at')

class ProductSnapAndListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import re, random
        image_base64 = request.data.get('image_base64') or request.data.get('video_snapshot_base64') or request.data.get('image')
        mime_type = request.data.get('mime_type', 'image/jpeg')
        file_name = request.data.get('file_name', '').strip()
        is_video = request.data.get('is_video', False)

        if not image_base64 and not file_name:
            return Response({'error': 'No image or video frame provided'}, status=400)

        # Sanitize image base64 if present
        clean_b64 = None
        if image_base64:
            clean_b64 = str(image_base64).strip()
            if ';base64,' in clean_b64:
                clean_b64 = clean_b64.split(';base64,')[1]
            clean_b64 = "".join(clean_b64.split())

        # Retrieve user's brand profile context if available
        biz_context = ""
        try:
            from brand.models import BrandIdentity
            brand = BrandIdentity.objects.filter(user=request.user).first()
            if brand:
                biz_context = f"Merchant Business: '{brand.business_name}', Niche: '{brand.niche or 'General MSME'}', Target Audience: '{brand.target_audience or 'Nigerian Consumers'}'."
        except Exception:
            pass

        # Smart contextual heuristic builder for fallback
        clean_name = re.sub(r'[\-_.]+', ' ', file_name).strip() if file_name else ''
        name_lower = clean_name.lower()

        # Determine smart defaults based on filename / context
        if any(w in name_lower for w in ['tech', 'ssl', 'web', 'code', 'software', 'error', 'issue', 'screen', 'laptop', 'phone', 'gadget', 'electronic']):
            default_name = clean_name.title() if len(clean_name) > 3 else "Tech & Digital Solution Asset"
            default_price = random.choice([25000, 35000, 48000, 18500])
            default_cost = int(default_price * 0.60)
            default_type = "SERVICE" if any(w in name_lower for w in ['service', 'support', 'issue', 'ssl', 'consult']) else "PHYSICAL"
            default_cat = "Electronics" if default_type == "PHYSICAL" else "IT Support"
            default_desc = f"Verified {default_name} solution built for reliable performance and business efficiency. Includes technical setup, direct WhatsApp assistance, and prompt support."
        elif any(w in name_lower for w in ['naccima', 'meeting', 'consult', 'counsel', 'biz', 'plan', 'coaching', 'training', 'audit', 'strategy']):
            default_name = clean_name.title() if len(clean_name) > 3 else "Executive Business Consultation Session"
            default_price = random.choice([30000, 45000, 60000, 25000])
            default_cost = int(default_price * 0.50)
            default_type = "SERVICE"
            default_cat = "Consulting"
            default_desc = f"Strategic advisory and {default_name} structured for Nigerian founders and growing enterprises. Includes personalized roadmapping, compliance guidance, and direct 1-on-1 support."
        elif any(w in name_lower for w in ['shoe', 'bag', 'cloth', 'dress', 'wear', 'shirt', 'cap', 'fashion', 'ankara', 'lace', 'suit', 'jeans']):
            default_name = clean_name.title() if len(clean_name) > 3 else "Handcrafted Nigerian Fashion Piece"
            default_price = random.choice([12500, 18500, 24000, 15000, 32000])
            default_cost = int(default_price * 0.65)
            default_type = "PHYSICAL"
            default_cat = "Fashion"
            default_desc = f"Premium {default_name} tailored with top-grade fabrics for superior comfort, durability, and elegance. Perfect for casual or special occasions with fast nationwide delivery."
        elif any(w in name_lower for w in ['food', 'rice', 'oil', 'soup', 'snack', 'cake', 'pepper', 'agro', 'grain', 'flour']):
            default_name = clean_name.title() if len(clean_name) > 3 else "Fresh Farm Agro-Commodity Pack"
            default_price = random.choice([8500, 14000, 22000, 6500])
            default_cost = int(default_price * 0.70)
            default_type = "PHYSICAL"
            default_cat = "Groceries"
            default_desc = f"Fresh, hygienically packaged {default_name} sourced directly from verified local suppliers. 100% natural, premium quality, ready for immediate delivery."
        else:
            default_name = clean_name.title() if len(clean_name) > 3 else ("Verified Product Video Item" if is_video else "Premium Quality Store Item")
            default_price = random.choice([12500, 16000, 22500, 18000, 28000])
            default_cost = int(default_price * 0.65)
            default_type = "PHYSICAL"
            default_cat = "General Goods"
            default_desc = f"High-quality {default_name} verified for authenticity, durability, and value. Enjoy swift door-step dispatch and seamless WhatsApp order checkout."

        prompt = f"""
        You are a top-tier Google Vision AI tailored for Nigerian commerce and retail e-commerce inventory.
        {biz_context}

        Analyze this product image/frame carefully (filename hint: "{file_name}"). Inspect all visible visual details:
        - Product identification (what is it specifically: shoes, phone, wig, fabric, food item, software dashboard, service certificate, etc.).
        - Color, material, finish, style, packaging, and visible features.
        - Realistic Nigerian market retail selling price in Nigerian Naira (₦ integer, realistic for Nigerian consumers e.g. 8500, 15000, 28500, 45000, 85000).
        - Estimated Cost Price (COGS, integer approx 60-70% of retail price).
        - Correct Product Type: 'PHYSICAL', 'SERVICE', 'PROPERTY', or 'B2B'.
        - Accurate Category (e.g., 'Fashion', 'Electronics', 'Beauty & Hair', 'Groceries', 'Home & Living', 'IT Support', 'Consulting', 'Real Estate').
        - Persuasive, high-converting Nigerian sales copy (2-3 sentences) suitable for WhatsApp and Instagram sales. Highlight genuine durability, key benefits, fast nationwide waybill delivery, and direct order CTA.

        Respond STRICTLY with a valid JSON object matching this schema:
        {{
            "name": "Specific Product Name",
            "price": 28500,
            "cost_price": 18000,
            "product_type": "PHYSICAL",
            "category": "Fashion",
            "description": "High-converting 2-3 sentence product sales description with benefit hooks and WhatsApp call to action."
        }}
        """

        try:
            from smartbiz_backend import gemini_utils
            content = gemini_utils.generate_json_content(
                prompt,
                image_base64=clean_b64,
                mime_type=mime_type
            )
            
            if isinstance(content, dict) and 'name' in content and 'price' in content and 'description' in content:
                # Ensure price is valid number and description is not empty
                try:
                    p = int(content.get('price') or default_price)
                except (ValueError, TypeError):
                    p = default_price

                try:
                    c = int(content.get('cost_price') or int(p * 0.65))
                except (ValueError, TypeError):
                    c = int(p * 0.65)

                d = str(content.get('description') or '').strip()
                if not d or len(d) < 15:
                    d = default_desc

                prod_name = str(content.get('name') or default_name).strip()
                prod_cat = str(content.get('category') or default_cat).strip()
                prod_type = str(content.get('product_type') or default_type).strip()
                if prod_type not in ['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B']:
                    prod_type = default_type

                return Response({
                    'name': prod_name,
                    'price': p if p > 0 else default_price,
                    'cost_price': c if c > 0 else default_cost,
                    'product_type': prod_type,
                    'category': prod_cat,
                    'description': d
                })
            else:
                return Response({
                    'name': default_name,
                    'price': default_price,
                    'cost_price': default_cost,
                    'product_type': default_type,
                    'category': default_cat,
                    'description': default_desc
                })
        except Exception as e:
            print(f"Product snap view exception: {e}")
            return Response({
                'name': default_name,
                'price': default_price,
                'cost_price': default_cost,
                'product_type': default_type,
                'category': default_cat,
                'description': default_desc
            })


class RelatedEcosystemProductsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        category = request.query_params.get('category', '').strip()
        exclude_brand_id = request.query_params.get('exclude_brand_id', '').strip()

        qs = Product.objects.all().order_by('-created_at')

        if exclude_brand_id:
            qs = qs.exclude(brand_id=exclude_brand_id)

        if category:
            qs_cat = qs.filter(category__iexact=category)
            if qs_cat.exists():
                qs = qs_cat

        # Return up to 6 items for ecosystem cross-discovery
        products = qs[:6]
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


class BoostProductView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk, brand__user=request.user)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found or you do not have permission to boost this item.'}, status=status.HTTP_404_NOT_FOUND)

        duration_days = int(request.data.get('duration_days') or 3)
        credits_required = 150 if duration_days <= 3 else 300

        if request.user.credits < credits_required:
            return Response({
                'error': f'Insufficient BizCredits. You have {request.user.credits} credits, but {credits_required} credits are required to boost this listing for {duration_days} days.',
                'credits_required': credits_required,
                'current_credits': request.user.credits
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Deduct credits
        request.user.credits -= credits_required
        request.user.save(update_fields=['credits'])

        # Record in CreditLedger
        from billing.models import CreditLedger
        CreditLedger.objects.create(
            user=request.user,
            amount=-credits_required,
            activity=f"Marketplace Boost ({duration_days} Days) for '{product.name}'"
        )

        # Set product promoted state & duration
        from django.utils import timezone
        product.is_promoted = True
        product.promoted_until = timezone.now() + timezone.timedelta(days=duration_days)
        product.save(update_fields=['is_promoted', 'promoted_until'])

        return Response({
            'message': f"Product successfully boosted for {duration_days} days! It is now featured across the Marketplace.",
            'product_id': product.id,
            'is_promoted': product.is_promoted,
            'promoted_until': product.promoted_until,
            'remaining_credits': request.user.credits
        }, status=status.HTTP_200_OK)


class VerifyVendorWithCreditsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import VendorVerification
        vendor, _ = VendorVerification.objects.get_or_create(
            user=request.user,
            defaults={
                'business_name': getattr(request.user, 'business_name', '') or request.user.username,
                'business_type': 'Retail',
                'whatsapp_number': getattr(request.user, 'phone', '') or '2348000000000'
            }
        )

        if vendor.is_verified:
            return Response({
                'message': 'Your vendor profile is already verified with an official badge.',
                'is_verified': True
            }, status=status.HTTP_200_OK)

        credits_required = 500
        if request.user.credits < credits_required:
            return Response({
                'error': f'Insufficient BizCredits. You have {request.user.credits} credits, but {credits_required} credits are required to obtain the Verified Vendor Badge.',
                'credits_required': credits_required,
                'current_credits': request.user.credits
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Deduct credits
        request.user.credits -= credits_required
        request.user.save(update_fields=['credits'])

        # Record in CreditLedger
        from billing.models import CreditLedger
        CreditLedger.objects.create(
            user=request.user,
            amount=-credits_required,
            activity="Official Verified Vendor Badge Activation"
        )

        vendor.is_verified = True
        vendor.save(update_fields=['is_verified'])

        return Response({
            'message': 'Congratulations! Your Vendor profile is now verified with the official Verified Badge on all Marketplace listings.',
            'is_verified': True,
            'remaining_credits': request.user.credits
        }, status=status.HTTP_200_OK)

