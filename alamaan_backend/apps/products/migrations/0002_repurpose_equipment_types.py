from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('products', '0001_initial')]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='dosage_form',
            field=models.CharField(
                choices=[
                    ('Switch', 'Switch'),
                    ('Router', 'Router'),
                    ('Access Point', 'Access Point'),
                    ('Battery', 'Battery'),
                    ('Inverter', 'Inverter'),
                    ('Charge Controller', 'Charge Controller'),
                    ('Solar Panel', 'Solar Panel'),
                    ('Cable', 'Cable'),
                    ('Accessory', 'Accessory'),
                    ('Computer Equipment', 'Computer Equipment'),
                    ('Other IT Equipment', 'Other IT Equipment'),
                    ('Tablet', 'Tablet'),
                    ('Capsule', 'Capsule'),
                    ('Syrup', 'Syrup'),
                    ('Suspension', 'Suspension'),
                    ('Injection', 'Injection'),
                    ('Cream', 'Cream'),
                    ('Ointment', 'Ointment'),
                    ('Drops', 'Drops'),
                    ('Inhaler', 'Inhaler'),
                    ('Gel', 'Gel'),
                    ('Infusion', 'Infusion'),
                    ('Powder', 'Powder'),
                ],
                max_length=50,
            ),
        ),
    ]
