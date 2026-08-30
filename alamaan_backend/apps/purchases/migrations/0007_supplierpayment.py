from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ('accountability', '0006_supplier_payment_type'),
        ('purchases', '0006_purchase_payment_tracking'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name='SupplierPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('payment_number', models.CharField(db_index=True, max_length=32, unique=True)),
                ('supplier_name', models.CharField(blank=True, default='', max_length=200)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_method', models.CharField(choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')], max_length=20)),
                ('payment_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('balance_before', models.DecimalField(decimal_places=2, max_digits=12)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=12)),
                ('note', models.TextField(blank=True, default='')),
                ('is_reversed', models.BooleanField(db_index=True, default=False)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
                ('recorded_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='recorded_supplier_payments', to=settings.AUTH_USER_MODEL)),
                ('purchase', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='supplier_payments', to='purchases.stockpurchase')),
            ],
            options={'ordering': ['-payment_date', '-id']},
        ),
        migrations.AddConstraint(model_name='supplierpayment', constraint=models.CheckConstraint(condition=models.Q(amount__gt=0), name='supplier_payment_positive')),
    ]
