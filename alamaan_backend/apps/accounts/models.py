from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must provide an email address.')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('status', User.Status.ACTIVE)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        CASHIER = 'cashier', 'Cashier'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        ACTIVE = 'ACTIVE', 'Active'
        REJECTED = 'REJECTED', 'Rejected'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CASHIER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_users')
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='rejected_users')
    rejection_reason = models.TextField(blank=True, default='')
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='suspended_users')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'phone']

    class Meta:
        indexes = [
            models.Index(fields=['status', 'role']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.email
