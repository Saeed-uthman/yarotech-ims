from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('inventory', '0002_inventory_batches'), ('sales', '0002_sale_returns')]
    operations = [
        migrations.AlterField(
            model_name='inventorymovement',
            name='reference_type',
            field=models.CharField(choices=[('SALE', 'Sale Checkout'), ('STOCK_PURCHASE', 'Stock Purchase'), ('MANUAL_ADJUSTMENT', 'Manual Adjustment'), ('INITIAL_SETUP', 'Initial Inventory Setup'), ('SALE_RETURN', 'Customer Sale Return')], db_index=True, max_length=30),
        ),
    ]
