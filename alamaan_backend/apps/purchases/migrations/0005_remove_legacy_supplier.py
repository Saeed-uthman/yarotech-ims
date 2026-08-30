from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0006_remove_inventorybatch_supplier'),
        ('purchases', '0004_stockpurchase_supplier_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='stockpurchase',
            name='supplier',
        ),
        migrations.DeleteModel(
            name='Supplier',
        ),
    ]
