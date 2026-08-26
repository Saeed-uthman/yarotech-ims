from django.db import models

from apps.common.models import TimeStampedModel


class SystemSettings(TimeStampedModel):
    id = models.PositiveIntegerField(primary_key=True, default=1, editable=False)

    pharmacy_name = models.CharField(max_length=150, default='Al-Amaan Pharmacy')
    phone = models.CharField(max_length=50, default='+234 800 000 0000')
    email = models.EmailField(default='contact@alamaanpharmacy.com')
    address = models.TextField(default='Suite 12, Commercial Plaza, Kano, Nigeria')
    logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    business_description = models.TextField(blank=True, default='Licensed Retail Pharmacy & Healthcare Provider')

    currency = models.CharField(max_length=10, default='NGN')
    currency_symbol = models.CharField(max_length=5, default='\u20a6')
    show_decimals = models.BooleanField(default=True)

    allow_walking_sales = models.BooleanField(default=True)
    allow_credit_sales = models.BooleanField(default=True)
    require_customer_for_credit = models.BooleanField(default=True)

    low_stock_threshold = models.IntegerField(default=10)
    allow_negative_stock = models.BooleanField(default=False)

    receipt_footer = models.TextField(default='Thank you for your patronage. Get well soon!')

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
