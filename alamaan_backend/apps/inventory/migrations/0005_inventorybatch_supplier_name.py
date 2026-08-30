from django.db import migrations, models


def copy_batch_supplier_names(apps, schema_editor):
    InventoryBatch = apps.get_model('inventory', 'InventoryBatch')
    for batch in InventoryBatch.objects.select_related('supplier').exclude(supplier=None).iterator():
        batch.supplier_name = batch.supplier.name
        batch.save(update_fields=['supplier_name'])


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0004_purchase_return_reference_type'),
        ('purchases', '0004_stockpurchase_supplier_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventorybatch',
            name='supplier_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.RunPython(copy_batch_supplier_names, migrations.RunPython.noop),
    ]
