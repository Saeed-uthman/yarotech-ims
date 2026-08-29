from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import User


def register_user(*, email, password, full_name, phone):
    validate_password(password)
    return User.objects.create_user(
        email=email,
        password=password,
        full_name=full_name.strip(),
        phone=phone.strip(),
        role=User.Role.CASHIER,
        status=User.Status.PENDING,
        is_active=False,
    )


@transaction.atomic
def approve_user(*, user, approved_by, assigned_role=User.Role.CASHIER):
    if user.status != User.Status.PENDING:
        raise ValidationError({'detail': 'Only pending users can be approved.'})

    user.role = assigned_role
    user.status = User.Status.ACTIVE
    user.is_active = True
    user.is_staff = assigned_role == User.Role.ADMIN
    user.approved_at = timezone.now()
    user.approved_by = approved_by
    user.rejection_reason = ''
    user.rejected_at = None
    user.rejected_by = None
    user.save(update_fields=[
        'role',
        'status',
        'is_active',
        'is_staff',
        'approved_at',
        'approved_by',
        'rejection_reason',
        'rejected_at',
        'rejected_by',
        'updated_at',
    ])
    return user


@transaction.atomic
def reject_user(*, user, rejected_by, reason):
    if user.status != User.Status.PENDING:
        raise ValidationError({'detail': 'Only pending users can be rejected.'})

    user.status = User.Status.REJECTED
    user.is_active = False
    user.rejected_at = timezone.now()
    user.rejected_by = rejected_by
    user.rejection_reason = reason.strip()
    user.save(update_fields=[
        'status',
        'is_active',
        'rejected_at',
        'rejected_by',
        'rejection_reason',
        'updated_at',
    ])
    return user


@transaction.atomic
def suspend_user(*, user, suspended_by):
    if user.status != User.Status.ACTIVE:
        raise ValidationError({'detail': 'Only active users can be suspended.'})
    if user.pk == suspended_by.pk:
        raise ValidationError({'detail': 'Administrators cannot suspend their own account.'})
    if user.role == User.Role.ADMIN and not User.objects.filter(
        role=User.Role.ADMIN,
        status=User.Status.ACTIVE,
        is_active=True,
    ).exclude(pk=user.pk).exists():
        raise ValidationError({'detail': 'The final active administrator cannot be suspended.'})

    user.status = User.Status.SUSPENDED
    user.is_active = False
    user.suspended_at = timezone.now()
    user.suspended_by = suspended_by
    user.save(update_fields=['status', 'is_active', 'suspended_at', 'suspended_by', 'updated_at'])
    return user


@transaction.atomic
def reactivate_user(*, user, reactivated_by):
    if user.status != User.Status.SUSPENDED:
        raise ValidationError({'detail': 'Only suspended users can be reactivated.'})

    user.status = User.Status.ACTIVE
    user.is_active = True
    user.approved_at = timezone.now()
    user.approved_by = reactivated_by
    user.save(update_fields=['status', 'is_active', 'approved_at', 'approved_by', 'updated_at'])
    return user
