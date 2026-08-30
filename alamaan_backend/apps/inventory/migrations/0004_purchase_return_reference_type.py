from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('inventory', '0003_sale_return_reference_type'), ('purchases', '0003_purchase_returns')]
    operations = [
        migrations.AlterField(
            model_name='inventorymovement',
            name='reference_type',
            field=models.CharField(choices=[('SALE', 'Sale Checkout'), ('STOCK_PURCHASE', 'Stock Purchase'), ('MANUAL_ADJUSTMENT', 'Manual Adjustment'), ('INITIAL_SETUP', 'Initial Inventory Setup'), ('SALE_RETURN', 'Customer Sale Return'), ('PURCHASE_RETURN', 'Stock Purchase Return')], db_index=True, max_length=30),
        ),
    ]
