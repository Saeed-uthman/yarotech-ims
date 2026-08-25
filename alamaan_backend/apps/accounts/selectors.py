from django.db.models import Q

from .models import User


def user_profile(*, user):
    return user


def list_users(*, status=None, role=None, search=''):
    queryset = User.objects.all()

    if status:
        queryset = queryset.filter(status=status)
    if role:
        queryset = queryset.filter(role=role)
    if search:
        queryset = queryset.filter(
            Q(email__icontains=search)
            | Q(full_name__icontains=search)
            | Q(phone__icontains=search)
        )

    return queryset.order_by('-created_at')


def list_pending_users():
    return list_users(status=User.Status.PENDING)
