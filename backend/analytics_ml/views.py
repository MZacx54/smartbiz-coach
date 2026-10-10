from rest_framework import views, permissions, status
from rest_framework.response import Response
from .services import CreditScoringService, DemandForecastService, TillAnomalyService

class CreditScoreAnalyticsView(views.APIView):
    """
    Returns algorithmic credit score (300-850), risk tier, breakdown, and loan eligibility.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            result = CreditScoringService.calculate_credit_score(request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to compute credit score: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DemandForecastAnalyticsView(views.APIView):
    """
    Returns time-series inventory velocity, days of stock remaining, and reorder projections.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            result = DemandForecastService.forecast_inventory(request.user)
            return Response({"forecasts": result}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to compute demand forecast: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TillAnomalyAnalyticsView(views.APIView):
    """
    Returns unsupervised Isolation Forest outlier analysis for petty cash and till variances.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            result = TillAnomalyService.detect_anomalies(request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to run anomaly detector: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComprehensiveMLOverviewView(views.APIView):
    """
    Consolidated single-request ML intelligence dashboard payload.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            credit = CreditScoringService.calculate_credit_score(request.user)
            forecasts = DemandForecastService.forecast_inventory(request.user)
            anomalies = TillAnomalyService.detect_anomalies(request.user)

            return Response({
                "credit": credit,
                "forecasts": forecasts,
                "anomalies": anomalies,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"ML pipeline error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
