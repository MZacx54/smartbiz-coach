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
        # Business owners see their leads
        if self.request.user.is_authenticated:
            return Lead.objects.filter(brand__user=self.request.user).order_by('-created_at')
        return Lead.objects.none()

    def perform_create(self, serializer):
        # If public, we need to find the brand from the product
        product_id = self.request.data.get('product')
        if product_id:
            product = Product.objects.get(id=product_id)
            serializer.save(brand=product.brand)
        else:
            # General inquiry to the user's own brand (if authenticated)
            from brand.models import BrandIdentity
            brand = BrandIdentity.objects.get(user=self.request.user)
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get('items', [])
        reference = request.data.get('reference')
        total_amount = request.data.get('total_amount')
        
        leads_created = []
        for item in items:
            product_id = item.get('productId')
            try:
                product = Product.objects.get(id=product_id)
                lead = Lead.objects.create(
                    brand=product.brand,
                    product=product,
                    customer_name=request.user.get_full_name() or request.user.username,
                    customer_contact=request.user.email,
                    message=f"Order paid via reference: {reference}. Qty: {item.get('quantity')}",
                    lead_type='ORDER',
                    status='WON',
                    quoted_price=float(item.get('price')) * int(item.get('quantity'))
                )
                leads_created.append(lead.id)
            except Product.DoesNotExist:
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
        brand = BrandIdentity.objects.get(user=self.request.user)
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
        # Display all public products, ordering promoted/featured items to the top
        queryset = Product.objects.filter(is_public=True).order_by('-is_promoted', '-created_at')
        product_type = self.request.query_params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type=product_type)
            
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
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
        image_base64 = request.data.get('image_base64') or request.data.get('video_snapshot_base64') or request.data.get('image')
        mime_type = request.data.get('mime_type', 'image/jpeg')
        is_video = request.data.get('is_video', False)

        if not image_base64:
            return Response({'error': 'No image or video frame provided'}, status=400)

        prompt = f"""
        Analyze this product {"video frame" if is_video else "image"} and suggest details for creating a new digital inventory listing for a Nigerian small business.
        Identify what the item is and suggest:
        1. A clear, professional Name (under 50 characters).
        2. A suggested Retail Selling Price in Nigerian Naira (₦, as an integer e.g., 15000). Make it realistic for the Nigerian market.
        3. A suggested Cost Price (COGS, as an integer e.g., 9000). Make it about 55-75% of the suggested Retail Selling Price.
        4. A suitable listing product_type ('PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B').
        5. A suitable category choice.
           - If product_type is 'B2B', category MUST be one of: 'LOGISTICS', 'WHOLESALE', 'INFLUENCER', 'SERVICES', 'RAW_MATERIALS'.
           - If product_type is 'SERVICE', category can be: 'Consulting', 'Delivery', 'Catering', 'Design', 'IT Support', 'Training', 'Cleaning', 'Others'.
           - If product_type is 'PROPERTY', category can be: 'Apartment', 'Self-Contained', 'Office Space', 'Land', 'Warehouse', 'Short-Let', 'Others'.
           - If product_type is 'PHYSICAL', category should be a general niche name e.g. 'Fashion', 'Groceries', 'Electronics', 'Beauty', etc.
        6. A high-converting description (2-3 sentences) suitable for Instagram or WhatsApp sales copy, emphasizing the video demonstration features.
        
        You must respond STRICTLY with a JSON object containing these keys:
        - name: string
        - price: integer
        - cost_price: integer
        - product_type: string
        - category: string
        - description: string
        """

        try:
            from smartbiz_backend import gemini_utils
            content = gemini_utils.generate_json_content(
                prompt,
                image_base64=image_base64,
                mime_type=mime_type
            )
            return Response(content)
        except Exception as e:
            return Response({
                'name': 'Scanned Video Item' if is_video else 'Scanned Product',
                'price': 5000,
                'cost_price': 3000,
                'product_type': 'PHYSICAL',
                'category': 'General Goods',
                'description': 'Scanned product video item description. Please edit to add details.'
            })
