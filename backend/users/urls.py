from django.urls import path
from .views import RegisterView, LoginView, ProfileView, UserStatsView, UserActionsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('stats/', UserStatsView.as_view(), name='stats'),
    path('actions/', UserActionsView.as_view(), name='actions'),
]
