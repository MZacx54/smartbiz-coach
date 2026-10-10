from django.urls import path
from .views import (
    CreditScoreAnalyticsView,
    DemandForecastAnalyticsView,
    TillAnomalyAnalyticsView,
    ComprehensiveMLOverviewView
)

urlpatterns = [
    path('overview/', ComprehensiveMLOverviewView.as_view(), name='ml_overview'),
    path('credit-score/', CreditScoreAnalyticsView.as_view(), name='ml_credit_score'),
    path('demand-forecast/', DemandForecastAnalyticsView.as_view(), name='ml_demand_forecast'),
    path('till-anomalies/', TillAnomalyAnalyticsView.as_view(), name='ml_till_anomalies'),
]
