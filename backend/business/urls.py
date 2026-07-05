from django.urls import path
from .views import (
    GenerateBusinessPlanView, FindGrantsView, AnalyzeBusinessNameView,
    AnalyzeNeighborhoodView, SearchLocalVendorsView, BusinessHealthScoreView,
    PricingAssistantView
)

urlpatterns = [
    path('generate-plan/', GenerateBusinessPlanView.as_view(), name='generate-plan'),
    path('find-grants/', FindGrantsView.as_view(), name='find-grants'),
    path('analyze-name/', AnalyzeBusinessNameView.as_view(), name='analyze-name'),
    path('analyze-neighborhood/', AnalyzeNeighborhoodView.as_view(), name='analyze-neighborhood'),
    path('search-vendors/', SearchLocalVendorsView.as_view(), name='search-vendors'),
    path('health-score/', BusinessHealthScoreView.as_view(), name='health-score'),
    path('pricing-assistant/', PricingAssistantView.as_view(), name='pricing-assistant'),
]
