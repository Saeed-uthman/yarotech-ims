from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.responses import success_response

from .models import User
from .selectors import list_users, user_profile
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserActionApproveSerializer,
    UserActionRejectSerializer,
    UserSerializer,
)
from .services import approve_user, reactivate_user, reject_user, suspend_user


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            success_response(UserSerializer(user).data, 'Registration submitted for administrator approval.'),
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    @extend_schema(request=LoginSerializer, responses={200: None})
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(success_response(serializer.validated_data, 'Login successful.'))


class RefreshTokenView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_refresh'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        response.data = success_response(response.data, 'Token refreshed successfully.')
        return response


class LogoutView(TokenBlacklistView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_refresh'

    @extend_schema(responses={200: None})
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        response.data = success_response(message='Signed out successfully.')
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        serializer = UserSerializer(user_profile(user=request.user))
        return Response(success_response(serializer.data))


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={200: None})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response(message='Password changed successfully.'))


class UserListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: UserSerializer(many=True)})
    def get(self, request):
        queryset = list_users(
            status=request.query_params.get('status'),
            role=request.query_params.get('role'),
            search=request.query_params.get('search', ''),
        )
        return paginated_response(request, queryset, UserSerializer)


class UserDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(success_response(UserSerializer(user).data))


class UserApproveView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=UserActionApproveSerializer, responses={200: UserSerializer})
    def post(self, request, pk):
        serializer = UserActionApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=pk)
        user = approve_user(
            user=user,
            approved_by=request.user,
            assigned_role=serializer.validated_data['assigned_role'],
        )
        return Response(success_response(UserSerializer(user).data, 'User approved successfully.'))


class UserRejectView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=UserActionRejectSerializer, responses={200: UserSerializer})
    def post(self, request, pk):
        serializer = UserActionRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=pk)
        user = reject_user(user=user, rejected_by=request.user, reason=serializer.validated_data['reason'])
        return Response(success_response(UserSerializer(user).data, 'User rejected successfully.'))


class UserSuspendView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=None, responses={200: UserSerializer})
    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user = suspend_user(user=user, suspended_by=request.user)
        return Response(success_response(UserSerializer(user).data, 'User suspended successfully.'))


class UserReactivateView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=None, responses={200: UserSerializer})
    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user = reactivate_user(user=user, reactivated_by=request.user)
        return Response(success_response(UserSerializer(user).data, 'User reactivated successfully.'))
