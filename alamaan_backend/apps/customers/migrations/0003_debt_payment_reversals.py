from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('customers', '0002_customerdebtpayment'),
        ('sales', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='customerdebtpayment',
            name='is_reversed',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.CreateModel(
            name='CustomerDebtPaymentAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('payment', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='allocations', to='customers.customerdebtpayment')),
                ('sale', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='debt_payment_allocations', to='sales.sale')),
            ],
            options={'ordering': ['id']},
        ),
        migrations.CreateModel(
            name='DebtPaymentReversal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reason', models.CharField(max_length=500)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('payment', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='reversal', to='customers.customerdebtpayment')),
                ('reversed_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reversed_debt_payments', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddConstraint(
            model_name='customerdebtpaymentallocation',
            constraint=models.UniqueConstraint(fields=('payment', 'sale'), name='unique_payment_sale_allocation'),
        ),
    ]
