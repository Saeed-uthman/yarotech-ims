from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('settings_app', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(model_name='systemsettings', name='require_sale_confirmation', field=models.BooleanField(default=False)),
        migrations.AlterField(model_name='systemsettings', name='low_stock_threshold', field=models.PositiveIntegerField(default=10)),
        migrations.AddField(model_name='systemsettings', name='require_admin_stock_adjustment', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_logo', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_phone', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_address', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_cashier', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_customer', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_datetime', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='receipt_number', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='low_stock_notifications', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='out_of_stock_notifications', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='new_debt_notifications', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='systemsettings', name='large_transaction_alert', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='systemsettings', name='large_transaction_threshold', field=models.DecimalField(decimal_places=2, default=100000, max_digits=12)),
        migrations.AddField(model_name='systemsettings', name='theme', field=models.CharField(choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System Default')], default='system', max_length=10)),
        migrations.AddField(model_name='systemsettings', name='language', field=models.CharField(default='English', max_length=20)),
        migrations.AddField(model_name='systemsettings', name='session_timeout', field=models.CharField(choices=[('15m', '15 minutes'), ('30m', '30 minutes'), ('60m', '60 minutes'), ('never', 'Never')], default='30m', max_length=10)),
        migrations.AddField(
            model_name='systemsettings',
            name='updated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='system_settings_updates', to=settings.AUTH_USER_MODEL),
        ),
    ]
