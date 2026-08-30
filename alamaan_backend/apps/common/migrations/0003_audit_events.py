from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('common', '0002_documentsequence'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name='AuditEvent',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('request_id', models.UUIDField(db_index=True)),
                ('method', models.CharField(max_length=10)),
                ('path', models.CharField(db_index=True, max_length=255)),
                ('action', models.CharField(db_index=True, max_length=100)),
                ('outcome', models.CharField(choices=[('SUCCESS', 'Success'), ('DENIED', 'Denied'), ('FAILED', 'Failed')], db_index=True, max_length=10)),
                ('status_code', models.PositiveSmallIntegerField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, default='', max_length=255)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddIndex(
            model_name='auditevent',
            index=models.Index(fields=['action', 'created_at'], name='common_aud_action_7f2f86_idx'),
        ),
    ]
