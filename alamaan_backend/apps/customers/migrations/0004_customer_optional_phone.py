from django.db import migrations, models
from django.db.models.functions import Trim


def normalize_missing_phones(apps, schema_editor):
    Customer = apps.get_model('customers', 'Customer')
    Customer.objects.using(schema_editor.connection.alias).annotate(
        trimmed_phone=Trim('phone'),
    ).filter(trimmed_phone='').update(phone=None)


class Migration(migrations.Migration):
    dependencies = [('customers', '0003_debt_payment_reversals')]

    operations = [
        migrations.AlterField(
            model_name='customer',
            name='phone',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True, unique=True),
        ),
        # Missing numbers cannot safely be reconstructed for a NOT NULL rollback.
        migrations.RunPython(normalize_missing_phones),
    ]
