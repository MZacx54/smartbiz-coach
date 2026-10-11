from django.urls import path
from .views import (
    CreditScoreAnalyticsView,
    DemandForecastAnalyticsView,
    TillAnomalyAnalyticsView,
    CustomerSegmentationAnalyticsView,
    PriceElasticityAnalyticsView,
    ComprehensiveMLOverviewView,
    UnderwritingReportDataView
)

urlpatterns = [
    path('overview/', ComprehensiveMLOverviewView.as_view(), name='ml_overview'),
    path('credit-score/', CreditScoreAnalyticsView.as_view(), name='ml_credit_score'),
    path('demand-forecast/', DemandForecastAnalyticsView.as_view(), name='ml_demand_forecast'),
    path('till-anomalies/', TillAnomalyAnalyticsView.as_view(), name='ml_till_anomalies'),
    path('customer-segments/', CustomerSegmentationAnalyticsView.as_view(), name='ml_customer_segments'),
    path('price-elasticity/', PriceElasticityAnalyticsView.as_view(), name='ml_price_elasticity'),
    path('underwriting-dossier/', UnderwritingReportDataView.as_view(), name='ml_underwriting_dossier'),
]
