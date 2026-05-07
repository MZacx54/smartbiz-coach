from rest_framework import generics, permissions, filters
from django.db.models import Q
from .models import VendorVerification, MarketplaceListing
from .serializers import VendorVerificationSerializer, MarketplaceListingSerializer

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
