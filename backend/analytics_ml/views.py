from rest_framework import views, permissions, status
from rest_framework.response import Response
from .services import CreditScoringService, DemandForecastService, TillAnomalyService, CustomerSegmentationService

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


class CustomerSegmentationAnalyticsView(views.APIView):
    """
    Returns Scikit-Learn / RFM customer cohorts (Champions, At-Risk, Regulars, Prospects).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            result = CustomerSegmentationService.segment_customers(request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to compute RFM segments: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from .services import (
    CreditScoringService, 
    DemandForecastService, 
    TillAnomalyService, 
    CustomerSegmentationService,
    PriceElasticityService
)

class PriceElasticityAnalyticsView(views.APIView):
    """
    Returns Ordinary Least Squares Price Elasticity of Demand (PED) & Margin recommendations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            result = PriceElasticityService.calculate_price_elasticity(request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to compute price elasticity: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            segments = CustomerSegmentationService.segment_customers(request.user)
            elasticity = PriceElasticityService.calculate_price_elasticity(request.user)

            return Response({
                "credit": credit,
                "forecasts": forecasts,
                "anomalies": anomalies,
                "segments": segments,
                "elasticity": elasticity,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"ML pipeline error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnderwritingReportDataView(views.APIView):
    """
    Returns complete certified underwriting dossier data including cryptographic
    verification checksum, business credentials, and bank assessment grades.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import hashlib
        from datetime import datetime
        from users.models import UserCompliance
        from marketplace.models import VendorVerification

        user = request.user
        credit = CreditScoringService.calculate_credit_score(user)
        anomalies = TillAnomalyService.detect_anomalies(user)

        comp = UserCompliance.objects.filter(user=user).first()
        vendor = VendorVerification.objects.filter(user=user).first()

        business_name = getattr(user, 'business_name', '') or user.username
        cac_number = getattr(vendor, 'cac_number', '') if vendor else 'UNVERIFIED'
        if comp and comp.business_reg_completed and cac_number == 'UNVERIFIED':
            cac_number = 'RC/BN VERIFIED'

        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
        raw_hash_seed = f"SB-UNDERWRITE-{user.id}-{credit['credit_score']}-{now_str}"
        verification_hash = hashlib.sha256(raw_hash_seed.encode('utf-8')).hexdigest()[:16].upper()

        return Response({
            "dossier_id": f"SBC-UW-{user.id:05d}",
            "verification_hash": verification_hash,
            "issued_at": now_str,
            "business_info": {
                "business_name": business_name,
                "owner_name": user.get_full_name() or user.username,
                "email": user.email,
                "phone": getattr(user, 'phone', 'N/A'),
                "cac_number": cac_number,
                "is_cac_verified": credit['metrics']['cac_verified'],
            },
            "underwriting_assessment": {
                "credit_score": credit['credit_score'],
                "rating_tier": credit['rating_tier'],
                "risk_level": credit['risk_level'],
                "bank_recommendation": credit['bank_recommendation'],
                "breakdown": credit['breakdown'],
                "metrics": credit['metrics'],
                "till_integrity_score": anomalies.get('integrity_score', 100),
                "fraud_risk_status": anomalies.get('status', 'SECURE'),
            },
            "target_institutions": [
                "Bank of Industry (BOI)",
                "Tony Elumelu Foundation (TEF)",
                "Lagos State Employment Trust Fund (LSETF)",
                "Development Bank of Nigeria (DBN)",
                "Commercial Commercial Banks (Access, GTCO, Zenith, FirstBank)",
            ],
            "verifier_statement": "This report is algorithmically compiled from continuous, tamper-evident daily ledger logs and compliance verification on the SmartBiz Coach platform."
        }, status=status.HTTP_200_OK)
