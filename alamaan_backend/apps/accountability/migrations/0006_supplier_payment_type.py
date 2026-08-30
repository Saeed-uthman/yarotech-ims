from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accountability', '0005_purchase_return_type')]
    operations = [
        migrations.AlterField(
            model_name='accountabilitytransaction',
            name='type',
            field=models.CharField(choices=[('SALE', 'Sales Revenue'), ('DEBT_PAYMENT', 'Customer Debt Recovery'), ('STOCK_PURCHASE', 'Stock Purchase Disbursement'), ('OTHER_EXPENSE', 'Operational Expense'), ('DEBT_PAYMENT_REVERSAL', 'Debt Payment Reversal'), ('SALE_REFUND', 'Customer Sale Refund'), ('PURCHASE_RETURN', 'Stock Purchase Return'), ('SUPPLIER_PAYMENT', 'Supplier Payment')], db_index=True, max_length=30),
        ),
    ]
