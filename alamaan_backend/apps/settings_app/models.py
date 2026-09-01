from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class SystemSettings(TimeStampedModel):
    class Theme(models.TextChoices):
        LIGHT = 'light', 'Light'
        DARK = 'dark', 'Dark'
        SYSTEM = 'system', 'System Default'

    class SessionTimeout(models.TextChoices):
        FIFTEEN_MINUTES = '15m', '15 minutes'
        THIRTY_MINUTES = '30m', '30 minutes'
        SIXTY_MINUTES = '60m', '60 minutes'
        NEVER = 'never', 'Never'

    id = models.PositiveIntegerField(primary_key=True, default=1, editable=False)

    pharmacy_name = models.CharField(max_length=150, default='Yarotech Group')
    phone = models.CharField(max_length=50, default='+234 800 000 0000')
    email = models.EmailField(default='contact@yarotechgroup.com')
    address = models.TextField(default='Suite 12, Commercial Plaza, Kano, Nigeria')
    logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    business_description = models.TextField(blank=True, default='Networking, Solar & IT Equipment Supplier')

    currency = models.CharField(max_length=10, default='NGN')
    currency_symbol = models.CharField(max_length=5, default='\u20a6')
    show_decimals = models.BooleanField(default=True)

    allow_walking_sales = models.BooleanField(default=True)
    allow_credit_sales = models.BooleanField(default=True)
    require_customer_for_credit = models.BooleanField(default=True)
    require_sale_confirmation = models.BooleanField(default=False)

    low_stock_threshold = models.PositiveIntegerField(default=10)
    allow_negative_stock = models.BooleanField(default=False)
    require_admin_stock_adjustment = models.BooleanField(default=True)

    receipt_logo = models.BooleanField(default=True)
    receipt_phone = models.BooleanField(default=True)
    receipt_address = models.BooleanField(default=True)
    receipt_cashier = models.BooleanField(default=True)
    receipt_customer = models.BooleanField(default=True)
    receipt_datetime = models.BooleanField(default=True)
    receipt_number = models.BooleanField(default=True)
    receipt_footer = models.TextField(default='Thank you for choosing Yarotech Group.')

    low_stock_notifications = models.BooleanField(default=True)
    out_of_stock_notifications = models.BooleanField(default=True)
    new_debt_notifications = models.BooleanField(default=True)
    large_transaction_alert = models.BooleanField(default=False)
    large_transaction_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=100000)

    theme = models.CharField(max_length=10, choices=Theme.choices, default=Theme.SYSTEM)
    language = models.CharField(max_length=20, default='English')
    session_timeout = models.CharField(
        max_length=10,
        choices=SessionTimeout.choices,
        default=SessionTimeout.THIRTY_MINUTES,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_settings_updates',
    )

    class Meta:
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.pharmacy_name
