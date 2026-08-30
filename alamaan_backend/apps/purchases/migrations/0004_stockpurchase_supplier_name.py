from django.db import migrations, models


def copy_purchase_supplier_names(apps, schema_editor):
    StockPurchase = apps.get_model('purchases', 'StockPurchase')
    for purchase in StockPurchase.objects.select_related('supplier').exclude(supplier=None).iterator():
        purchase.supplier_name = purchase.supplier.name
        purchase.save(update_fields=['supplier_name'])


class Migration(migrations.Migration):
    dependencies = [
        ('purchases', '0003_purchase_returns'),
    ]

    operations = [
        migrations.AddField(
            model_name='stockpurchase',
            name='supplier_name',
            field=models.CharField(blank=True, db_index=True, default='', max_length=200),
        ),
        migrations.RunPython(copy_purchase_supplier_names, migrations.RunPython.noop),
    ]
