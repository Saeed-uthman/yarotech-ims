from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accountability', '0003_debt_payment_reversal_type')]
    operations = [
        migrations.AlterField(
            model_name='accountabilitytransaction',
            name='type',
            field=models.CharField(choices=[('SALE', 'Sales Revenue'), ('DEBT_PAYMENT', 'Customer Debt Recovery'), ('STOCK_PURCHASE', 'Stock Purchase Disbursement'), ('OTHER_EXPENSE', 'Operational Expense'), ('DEBT_PAYMENT_REVERSAL', 'Debt Payment Reversal'), ('SALE_REFUND', 'Customer Sale Refund')], db_index=True, max_length=30),
        ),
    ]
