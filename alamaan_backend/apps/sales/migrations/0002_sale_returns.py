from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0002_inventory_batches'),
        ('sales', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SaleReturn',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('return_number', models.CharField(db_index=True, max_length=32, unique=True)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('debt_reduction', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('refund_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('refund_method', models.CharField(choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS'), ('CREDIT', 'Credit')], max_length=20)),
                ('reason', models.CharField(max_length=500)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('processed_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='processed_sale_returns', to=settings.AUTH_USER_MODEL)),
                ('sale', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='returns', to='sales.sale')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='SaleReturnItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('quantity', models.PositiveIntegerField()),
                ('unit_refund_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('subtotal', models.DecimalField(decimal_places=2, max_digits=12)),
                ('historical_cost', models.DecimalField(decimal_places=2, max_digits=12)),
                ('profit_reversal', models.DecimalField(decimal_places=2, max_digits=12)),
                ('return_record', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='items', to='sales.salereturn')),
                ('sale_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='return_items', to='sales.saleitem')),
            ],
            options={'ordering': ['id']},
        ),
        migrations.CreateModel(
            name='SaleReturnBatchRestoration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('quantity', models.PositiveIntegerField()),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='return_restorations', to='inventory.inventorybatch')),
                ('return_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='batch_restorations', to='sales.salereturnitem')),
            ],
        ),
        migrations.AddConstraint(
            model_name='salereturnbatchrestoration',
            constraint=models.UniqueConstraint(fields=('return_item', 'batch'), name='unique_return_item_batch'),
        ),
    ]
