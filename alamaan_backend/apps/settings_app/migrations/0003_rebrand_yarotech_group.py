from django.db import migrations, models


def rebrand_default_settings(apps, schema_editor):
    SystemSettings = apps.get_model('settings_app', 'SystemSettings')
    updates = {
        'pharmacy_name': 'Yarotech Group',
        'email': 'contact@yarotechgroup.com',
        'business_description': 'Networking, Solar & IT Equipment Supplier',
        'receipt_footer': 'Thank you for choosing Yarotech Group.',
    }
    legacy_values = {
        'pharmacy_name': {'Al-Amaan Pharmacy', 'Al-Amaan Medicine Store'},
        'email': {'contact@alamaanpharmacy.com'},
        'business_description': {'Licensed Retail Pharmacy & Healthcare Provider'},
        'receipt_footer': {'Thank you for your patronage. Get well soon!'},
    }

    for settings in SystemSettings.objects.all():
        changed = []
        for field, replacement in updates.items():
            if getattr(settings, field) in legacy_values[field]:
                setattr(settings, field, replacement)
                changed.append(field)
        if changed:
            settings.save(update_fields=changed)


class Migration(migrations.Migration):
    dependencies = [('settings_app', '0002_complete_settings_contract')]

    operations = [
        migrations.AlterField(
            model_name='systemsettings',
            name='pharmacy_name',
            field=models.CharField(default='Yarotech Group', max_length=150),
        ),
        migrations.AlterField(
            model_name='systemsettings',
            name='email',
            field=models.EmailField(default='contact@yarotechgroup.com', max_length=254),
        ),
        migrations.AlterField(
            model_name='systemsettings',
            name='business_description',
            field=models.TextField(blank=True, default='Networking, Solar & IT Equipment Supplier'),
        ),
        migrations.AlterField(
            model_name='systemsettings',
            name='receipt_footer',
            field=models.TextField(default='Thank you for choosing Yarotech Group.'),
        ),
        migrations.RunPython(rebrand_default_settings, migrations.RunPython.noop),
    ]
