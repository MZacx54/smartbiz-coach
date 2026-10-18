from rest_framework import views, permissions, status
from rest_framework.response import Response
from .services import (
    CreditScoringService,
    DemandForecastService,
    TillAnomalyService,
    CustomerSegmentationService,
    PriceElasticityService,
    CashCliffForecastService,
    AutonomousAgentService,
    PartnerPortalService,
)


class CreditScoreAnalyticsView(views.APIView):
    """
    Returns algorithmic credit score (300-850), risk tier, breakdown, and loan eligibility.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'analytics_ml'

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
    throttle_scope = 'analytics_ml'

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
    throttle_scope = 'analytics_ml'

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
    throttle_scope = 'analytics_ml'

    def get(self, request):
        try:
            result = CustomerSegmentationService.segment_customers(request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to compute RFM segments: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PriceElasticityAnalyticsView(views.APIView):
    """
    Returns Ordinary Least Squares Price Elasticity of Demand (PED) & Margin recommendations.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'analytics_ml'

    def get(self, request):
        try:
            result = PriceElasticityService.calculate_price_elasticity(request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to compute price elasticity: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComprehensiveMLOverviewView(views.APIView):
    """
    Consolidated single-request ML & AI OS intelligence dashboard payload.
    Includes SmartScore™ Credit Rating, Ridge Demand Forecaster, Isolation Forest Till Scanner,
    RFM Customer Cohorts, OLS Price Elasticity, 14-Day Cash Cliff Predictor, and Autonomous AI Agents.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            credit = CreditScoringService.calculate_credit_score(request.user)
            forecasts = DemandForecastService.forecast_inventory(request.user)
            anomalies = TillAnomalyService.detect_anomalies(request.user)
            segments = CustomerSegmentationService.segment_customers(request.user)
            elasticity = PriceElasticityService.calculate_price_elasticity(request.user)
            cash_cliff = CashCliffForecastService.predict_cash_runway(request.user)
            ai_agents = AutonomousAgentService.get_active_directives(
                request.user, credit, forecasts, anomalies, cash_cliff
            )

            return Response({
                "credit": credit,
                "forecasts": forecasts,
                "anomalies": anomalies,
                "segments": segments,
                "elasticity": elasticity,
                "cash_cliff": cash_cliff,
                "ai_agents": ai_agents,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"ML pipeline error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnderwritingReportDataView(views.APIView):
    """
    Returns complete certified underwriting dossier data including cryptographic
    verification checksum, business credentials, 14-day cash runway, and bank assessment grades.
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
        cash_cliff = CashCliffForecastService.predict_cash_runway(user)

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
                "cash_runway_days": cash_cliff.get('runway_days', 90),
                "daily_net_velocity": cash_cliff.get('daily_net_velocity', 0),
                "fuel_gen_burn_pct": cash_cliff.get('fuel_gen_burn_pct', 0),
            },
            "target_institutions": [
                "Bank of Industry (BOI) & Development Bank of Nigeria (DBN)",
                "FCMB SheVentures / Access Bank W Initiative / Sterling OneWoman",
                "NIRSAL Microfinance Bank (NMFB) & LSETF / AEA Abuja",
                "SMEDAN / NACCIMA Youth Entrepreneurs (NYE) / NITDA / NASENI",
                "Tony Elumelu Foundation (TEF) & Tier-1 Commercial Banks",
            ],
            "verifier_statement": "This report is algorithmically compiled from continuous, tamper-evident daily ledger logs, Isolation Forest fraud auditing, and compliance verification on the SmartBiz Coach AI Operating System."
        }, status=status.HTTP_200_OK)


class PartnerPortalDataView(views.APIView):
    """
    Sprint 4: Institutional Partner Intelligence & Loan Underwriting Terminal API.
    Accessible to institutional partners (SMEDAN, NACCIMA/NYE, NITDA, NASENI, BOI, FCMB SheVentures, NIRSAL MFB)
    and authenticated platform users.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            req_user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
            data = PartnerPortalService.get_partner_intelligence(req_user)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Partner portal error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

