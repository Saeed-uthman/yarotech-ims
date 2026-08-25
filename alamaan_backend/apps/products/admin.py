from django.contrib import admin

from .models import Category, Company, PriceAdjustmentHistory, Product, ProductVariant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    search_fields = ('name',)
    list_filter = ('is_active',)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'country', 'is_active', 'created_at')
    search_fields = ('name', 'code')
    list_filter = ('is_active', 'country')


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    fields = (
        'company',
        'base_price',
        'min_selling_price',
        'default_selling_price',
        'max_selling_price',
        'current_stock',
        'reorder_level',
        'status',
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'generic_name', 'category', 'dosage', 'dosage_form', 'status', 'created_at')
    search_fields = ('name', 'generic_name', 'barcode')
    list_filter = ('status', 'dosage_form', 'category')
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'company', 'default_selling_price', 'current_stock', 'reorder_level', 'status')
    search_fields = ('product__name', 'product__generic_name', 'company__name')
    list_filter = ('status', 'company')


@admin.register(PriceAdjustmentHistory)
class PriceAdjustmentHistoryAdmin(admin.ModelAdmin):
    list_display = ('variant', 'change_type', 'old_default_selling_price', 'new_default_selling_price', 'adjusted_by', 'effective_date')
    search_fields = ('variant__product__name', 'variant__company__name', 'reason')
    list_filter = ('change_type', 'effective_date')
    readonly_fields = [field.name for field in PriceAdjustmentHistory._meta.fields]
