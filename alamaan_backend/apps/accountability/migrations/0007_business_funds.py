from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accountability', '0006_supplier_payment_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='accountabilitytransaction',
            name='type',
            field=models.CharField(choices=[('SALE', 'Sales Revenue'), ('DEBT_PAYMENT', 'Customer Debt Recovery'), ('STOCK_PURCHASE', 'Stock Purchase Disbursement'), ('OTHER_EXPENSE', 'Operational Expense'), ('DEBT_PAYMENT_REVERSAL', 'Debt Payment Reversal'), ('SALE_REFUND', 'Customer Sale Refund'), ('PURCHASE_RETURN', 'Stock Purchase Return'), ('SUPPLIER_PAYMENT', 'Supplier Payment'), ('OPENING_BALANCE', 'Opening Business Funds'), ('OWNER_CAPITAL', 'Owner Capital Added'), ('OWNER_WITHDRAWAL', 'Owner Withdrawal')], db_index=True, max_length=30),
        ),
        migrations.CreateModel(
            name='BusinessFundMovement',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('movement_number', models.CharField(db_index=True, max_length=32, unique=True)),
                ('movement_type', models.CharField(choices=[('OPENING_BALANCE', 'Opening Balance'), ('OWNER_CAPITAL', 'Owner Capital Added'), ('OWNER_WITHDRAWAL', 'Owner Withdrawal')], db_index=True, max_length=30)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('note', models.TextField(blank=True, default='')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddConstraint(
            model_name='businessfundmovement',
            constraint=models.CheckConstraint(condition=models.Q(amount__gt=0), name='business_fund_movement_positive_amount'),
        ),
        migrations.AddConstraint(
            model_name='businessfundmovement',
            constraint=models.UniqueConstraint(condition=models.Q(movement_type='OPENING_BALANCE'), fields=('movement_type',), name='one_business_opening_balance'),
        ),
    ]
