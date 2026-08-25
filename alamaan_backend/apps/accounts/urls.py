from django.urls import path

from .views import (
    ChangePasswordView,
    LoginView,
    MeView,
    RefreshTokenView,
    RegisterView,
    UserApproveView,
    UserDetailView,
    UserListView,
    UserReactivateView,
    UserRejectView,
    UserSuspendView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/token/refresh/', RefreshTokenView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('users/', UserListView.as_view(), name='users-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='users-detail'),
    path('users/<int:pk>/approve/', UserApproveView.as_view(), name='users-approve'),
    path('users/<int:pk>/reject/', UserRejectView.as_view(), name='users-reject'),
    path('users/<int:pk>/suspend/', UserSuspendView.as_view(), name='users-suspend'),
    path('users/<int:pk>/reactivate/', UserReactivateView.as_view(), name='users-reactivate'),
]
