from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0003_sale_return_reference_type'),
        ('purchases', '0002_supplier_stockpurchase_supplier'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name='PurchaseReturn',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('return_number', models.CharField(db_index=True, max_length=32, unique=True)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('refund_method', models.CharField(choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')], max_length=20)),
                ('reason', models.CharField(max_length=500)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('processed_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='processed_purchase_returns', to=settings.AUTH_USER_MODEL)),
                ('purchase', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='returns', to='purchases.stockpurchase')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='PurchaseReturnItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('quantity', models.PositiveIntegerField()),
                ('unit_refund_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('subtotal', models.DecimalField(decimal_places=2, max_digits=12)),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='purchase_return_items', to='inventory.inventorybatch')),
                ('purchase_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='return_items', to='purchases.purchaseitem')),
                ('return_record', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='items', to='purchases.purchasereturn')),
            ],
            options={'ordering': ['id']},
        ),
    ]
