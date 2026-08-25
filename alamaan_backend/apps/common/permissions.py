from rest_framework.permissions import BasePermission


class IsAdminUserRole(BasePermission):
    """Allows access only to active administrator accounts."""

    message = 'Administrator privileges are required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'is_active', False)
            and getattr(user, 'role', None) == 'admin'
        )
