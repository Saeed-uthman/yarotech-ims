import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.common.models import AuditableModel, TimeStampedModel


def product_image_upload_path(instance, filename):
    extension = filename.rsplit('.', 1)[-1].lower()
    return f'products/{timezone.now():%Y/%m}/{uuid.uuid4().hex}.{extension}'


class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Company(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, blank=True, default='')
    country = models.CharField(max_length=50, default='Nigeria')
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'companies'

    def __str__(self):
        return self.name


class Product(AuditableModel):
    class DosageForm(models.TextChoices):
        SWITCH = 'Switch', 'Switch'
        ROUTER = 'Router', 'Router'
        ACCESS_POINT = 'Access Point', 'Access Point'
        BATTERY = 'Battery', 'Battery'
        INVERTER = 'Inverter', 'Inverter'
        CHARGE_CONTROLLER = 'Charge Controller', 'Charge Controller'
        SOLAR_PANEL = 'Solar Panel', 'Solar Panel'
        CABLE = 'Cable', 'Cable'
        ACCESSORY = 'Accessory', 'Accessory'
        COMPUTER_EQUIPMENT = 'Computer Equipment', 'Computer Equipment'
        OTHER_IT_EQUIPMENT = 'Other IT Equipment', 'Other IT Equipment'
        # Legacy values remain valid so existing records and imports continue to work.
        TABLET = 'Tablet', 'Tablet'
        CAPSULE = 'Capsule', 'Capsule'
        SYRUP = 'Syrup', 'Syrup'
        SUSPENSION = 'Suspension', 'Suspension'
        INJECTION = 'Injection', 'Injection'
        CREAM = 'Cream', 'Cream'
        OINTMENT = 'Ointment', 'Ointment'
        DROPS = 'Drops', 'Drops'
        INHALER = 'Inhaler', 'Inhaler'
        GEL = 'Gel', 'Gel'
        INFUSION = 'Infusion', 'Infusion'
        POWDER = 'Powder', 'Powder'

    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        INACTIVE = 'Inactive', 'Inactive'

    vat_enabled = models.BooleanField(default=False)
    name = models.CharField(max_length=200, db_index=True)
    generic_name = models.CharField(max_length=200, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    dosage = models.CharField(max_length=50)
    dosage_form = models.CharField(max_length=50, choices=DosageForm.choices)
    barcode = models.CharField(max_length=64, blank=True, default='', db_index=True)
    description = models.TextField(blank=True, default='')
    subtitle = models.CharField(max_length=255, blank=True, default='')
    image = models.ImageField(upload_to=product_image_upload_path, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['generic_name']),
            models.Index(fields=['barcode']),
        ]
        ordering = ['name']

    def __str__(self):
        return self.name


class ProductVariant(AuditableModel):
    class Status(models.TextChoices):
        AVAILABLE = 'Available', 'Available'
        INACTIVE = 'Inactive', 'Inactive'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='product_variants')
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    min_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    default_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    max_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    current_stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=10)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['product', 'company'], name='unique_product_company_variant'),
            models.CheckConstraint(condition=Q(current_stock__gte=0), name='product_variant_stock_non_negative'),
            models.CheckConstraint(
                condition=(
                    Q(base_price__gte=0)
                    & Q(min_selling_price__gte=0)
                    & Q(default_selling_price__gte=F('min_selling_price'))
                    & Q(max_selling_price__gte=F('default_selling_price'))
                ),
                name='product_variant_price_range_valid',
            ),
            models.CheckConstraint(
                condition=Q(base_price=0) | Q(min_selling_price__gt=F('base_price')),
                name='product_variant_min_price_above_cost',
            ),
        ]
        ordering = ['product__name', 'company__name']

    def clean(self):
        if self.current_stock < 0:
            raise ValidationError({'current_stock': 'Current stock cannot be negative.'})
        if self.default_selling_price < self.min_selling_price:
            raise ValidationError({'default_selling_price': 'Default selling price cannot be below minimum selling price.'})
        if self.max_selling_price < self.default_selling_price:
            raise ValidationError({'max_selling_price': 'Maximum selling price cannot be below default selling price.'})
        if self.base_price > 0 and self.min_selling_price <= self.base_price:
            raise ValidationError({'min_selling_price': 'Minimum selling price must be greater than base price.'})

    def __str__(self):
        return f'{self.product} - {self.company}'


class PriceAdjustmentHistory(TimeStampedModel):
    class ChangeType(models.TextChoices):
        INCREASE = 'INCREASE', 'Price Increase'
        DECREASE = 'DECREASE', 'Price Decrease'
        INITIAL = 'INITIAL', 'Initial Setup'
        CORRECTION = 'CORRECTION', 'Correction'

    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='price_history')
    old_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    old_min_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_min_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    old_default_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_default_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    old_max_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_max_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    change_type = models.CharField(max_length=30, choices=ChangeType.choices)
    reason = models.TextField()
    adjusted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='price_adjustments')
    effective_date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-effective_date', '-created_at']

    def __str__(self):
        return f'{self.variant} {self.change_type} at {self.effective_date:%Y-%m-%d %H:%M}'
