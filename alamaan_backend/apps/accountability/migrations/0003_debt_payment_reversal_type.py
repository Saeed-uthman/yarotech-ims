from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accountability', '0002_manualexpense')]

    operations = [
        migrations.AlterField(
            model_name='accountabilitytransaction',
            name='type',
            field=models.CharField(
                choices=[
                    ('SALE', 'Sales Revenue'),
                    ('DEBT_PAYMENT', 'Customer Debt Recovery'),
                    ('STOCK_PURCHASE', 'Stock Purchase Disbursement'),
                    ('OTHER_EXPENSE', 'Operational Expense'),
                    ('DEBT_PAYMENT_REVERSAL', 'Debt Payment Reversal'),
                ],
                db_index=True,
                max_length=30,
            ),
        ),
    ]
