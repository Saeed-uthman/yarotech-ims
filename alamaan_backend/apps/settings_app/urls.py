from django.urls import path

from .views import SystemSettingsResetView, SystemSettingsView

urlpatterns = [
    path('settings/', SystemSettingsView.as_view(), name='system-settings'),
    path('settings/reset/', SystemSettingsResetView.as_view(), name='system-settings-reset'),
]
