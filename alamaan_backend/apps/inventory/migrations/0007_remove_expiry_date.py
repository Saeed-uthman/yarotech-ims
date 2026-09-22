from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0006_remove_inventorybatch_supplier'),
    ]

    operations = [
        # Clear any expiry dates on existing batches before dropping the column
        migrations.RunSQL(
            sql="UPDATE inventory_inventorybatch SET expiry_date = NULL WHERE expiry_date IS NOT NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RemoveIndex(
            model_name='inventorybatch',
            name='inventory_i_variant_38e52d_idx',
        ),
        migrations.RemoveField(
            model_name='inventorybatch',
            name='expiry_date',
        ),
        migrations.AddIndex(
            model_name='inventorybatch',
            index=models.Index(
                fields=['variant', 'status'],
                name='inventory_i_variant_status_idx',
            ),
        ),
        migrations.AlterModelOptions(
            name='inventorybatch',
            options={'ordering': ['received_at', 'id']},
        ),
    ]
