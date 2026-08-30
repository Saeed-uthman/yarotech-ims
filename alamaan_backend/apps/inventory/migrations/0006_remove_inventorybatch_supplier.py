from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0005_inventorybatch_supplier_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='inventorybatch',
            name='supplier',
        ),
    ]
