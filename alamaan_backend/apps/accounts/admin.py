from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ('email', 'full_name', 'phone', 'role', 'status', 'is_active', 'is_staff')
    list_filter = ('role', 'status', 'is_active', 'is_staff')
    search_fields = ('email', 'full_name', 'phone')
    ordering = ('-created_at',)
    readonly_fields = (
        'last_login',
        'created_at',
        'updated_at',
        'approved_at',
        'approved_by',
        'rejected_at',
        'rejected_by',
        'suspended_at',
        'suspended_by',
    )
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('full_name', 'phone')}),
        ('Access', {'fields': ('role', 'status', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Approval workflow', {'fields': ('approved_at', 'approved_by', 'rejected_at', 'rejected_by', 'rejection_reason', 'suspended_at', 'suspended_by')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'phone', 'password1', 'password2', 'role', 'status', 'is_active', 'is_staff'),
        }),
    )
