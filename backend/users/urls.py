from django.urls import path
from .views import (
    RegisterView, LoginView, ProfileView, UserStatsView, UserActionsView,
    ForgotPasswordView, ResetPasswordView, ComplianceStatusView, AgentHireRequestView,
    SetupAdminView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('stats/', UserStatsView.as_view(), name='stats'),
    path('actions/', UserActionsView.as_view(), name='actions'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('compliance/', ComplianceStatusView.as_view(), name='compliance'),
    path('hire-agent/', AgentHireRequestView.as_view(), name='hire-agent'),
    path('setup-admin/', SetupAdminView.as_view(), name='setup-admin'),
]

