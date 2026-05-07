from django.urls import path
from .views import (
    GenerateSocialContentView, GenerateVideoScriptView, GenerateTrendIdeasView, 
    EditImageView, TranscribeAudioView, GenerateDailyMotivationView, 
    GenerateSeasonalTipsView, ChatWithSmartBizView, GenerateSuggestedPromptsView,
    GenerateWeeklyPlanView, GenerateMarketingVideoView, GenerateDebtReminderView,
    ListModelsView, GetTrendingTopicsView, AnalyzeProductView
)

urlpatterns = [
    path('generate-social-content/', GenerateSocialContentView.as_view(), name='generate-social-content'),
    path('generate-social/', GenerateSocialContentView.as_view(), name='generate-social'),  # Alias
    path('generate-video-script/', GenerateVideoScriptView.as_view(), name='generate-video-script'),
    path('generate-script/', GenerateVideoScriptView.as_view(), name='generate-script'),  # Alias
    path('generate-trend-ideas/', GenerateTrendIdeasView.as_view(), name='generate-trend-ideas'),
    path('generate-trends/', GenerateTrendIdeasView.as_view(), name='generate-trends'),  # Alias
    path('edit-image/', EditImageView.as_view(), name='edit-image'),
    path('transcribe/', TranscribeAudioView.as_view(), name='transcribe'),
    path('transcribe-audio/', TranscribeAudioView.as_view(), name='transcribe-audio'),  # Alias
    path('generate-motivation/', GenerateDailyMotivationView.as_view(), name='generate-motivation'),
    path('generate-seasonal-tips/', GenerateSeasonalTipsView.as_view(), name='generate-seasonal-tips'),
    path('chat/', ChatWithSmartBizView.as_view(), name='chat'),
    path('generate-prompts/', GenerateSuggestedPromptsView.as_view(), name='generate-prompts'),
    path('suggest-prompts/', GenerateSuggestedPromptsView.as_view(), name='suggest-prompts'),  # Alias
    path('generate-weekly-plan/', GenerateWeeklyPlanView.as_view(), name='generate-weekly-plan'),
    path('generate-video/', GenerateMarketingVideoView.as_view(), name='generate-video'),
    path('generate-audio/', GenerateMarketingVideoView.as_view(), name='generate_video'),
    path('generate-marketing-video/', GenerateMarketingVideoView.as_view(), name='generate-marketing-video'),  # Alias
    path('generate-debt-reminder/', GenerateDebtReminderView.as_view(), name='generate-debt-reminder'),
    path('trends/today/', GetTrendingTopicsView.as_view(), name='trending_topics'),
    path('analyze-product/', AnalyzeProductView.as_view(), name='analyze-product'),
    path('debug/models/', ListModelsView.as_view(), name='debug-models'),
]
