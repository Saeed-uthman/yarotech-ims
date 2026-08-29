from django.conf import settings
from django.db import migrations, models
from django.db.models import F, Q
import django.db.models.deletion
import django.utils.timezone


def create_legacy_batches(apps, schema_editor):
    ProductVariant = apps.get_model('products', 'ProductVariant')
    InventoryBatch = apps.get_model('inventory', 'InventoryBatch')
    now = django.utils.timezone.now()
    batches = []
    for variant in ProductVariant.objects.filter(current_stock__gt=0).iterator():
        batches.append(InventoryBatch(
            variant_id=variant.id,
            batch_number=f'LEGACY-{variant.id}',
            received_quantity=variant.current_stock,
            remaining_quantity=variant.current_stock,
            unit_cost=variant.base_price,
            status='AVAILABLE',
            received_at=getattr(variant, 'created_at', None) or now,
        ))
    InventoryBatch.objects.bulk_create(batches, batch_size=500)


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0001_initial'),
        ('purchases', '0002_supplier_stockpurchase_supplier'),
        ('sales', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InventoryBatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('batch_number', models.CharField(max_length=100)),
                ('expiry_date', models.DateField(blank=True, db_index=True, null=True)),
                ('received_quantity', models.PositiveIntegerField()),
                ('remaining_quantity', models.PositiveIntegerField()),
                ('unit_cost', models.DecimalField(decimal_places=2, max_digits=12)),
                ('status', models.CharField(choices=[('AVAILABLE', 'Available'), ('QUARANTINED', 'Quarantined'), ('EXHAUSTED', 'Exhausted'), ('CANCELLED', 'Cancelled')], db_index=True, default='AVAILABLE', max_length=20)),
                ('received_at', models.DateTimeField()),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='created_inventory_batches', to=settings.AUTH_USER_MODEL)),
                ('purchase_item', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='inventory_batch', to='purchases.purchaseitem')),
                ('supplier', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='inventory_batches', to='purchases.supplier')),
                ('variant', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='inventory_batches', to='products.productvariant')),
            ],
            options={'ordering': ['expiry_date', 'received_at', 'id']},
        ),
        migrations.CreateModel(
            name='SaleBatchAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('quantity', models.PositiveIntegerField()),
                ('unit_cost', models.DecimalField(decimal_places=2, max_digits=12)),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sale_allocations', to='inventory.inventorybatch')),
                ('sale_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='batch_allocations', to='sales.saleitem')),
            ],
            options={'ordering': ['id']},
        ),
        migrations.AddConstraint(
            model_name='inventorybatch',
            constraint=models.UniqueConstraint(fields=('variant', 'batch_number'), name='unique_variant_batch_number'),
        ),
        migrations.AddConstraint(
            model_name='inventorybatch',
            constraint=models.CheckConstraint(condition=Q(remaining_quantity__lte=F('received_quantity')), name='batch_remaining_not_above_received'),
        ),
        migrations.AddIndex(
            model_name='inventorybatch',
            index=models.Index(fields=['variant', 'status', 'expiry_date'], name='inventory_i_variant_38e52d_idx'),
        ),
        migrations.AddConstraint(
            model_name='salebatchallocation',
            constraint=models.UniqueConstraint(fields=('sale_item', 'batch'), name='unique_sale_item_batch'),
        ),
        migrations.RunPython(create_legacy_batches, migrations.RunPython.noop),
    ]
