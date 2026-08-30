from django.db import migrations, models
from django.db.models import F, Q


def mark_existing_purchases_paid(apps, schema_editor):
    StockPurchase = apps.get_model('purchases', 'StockPurchase')
    StockPurchase.objects.update(
        amount_paid=F('total_amount'),
        outstanding_amount=0,
        payment_status='PAID',
    )


class Migration(migrations.Migration):
    dependencies = [('purchases', '0005_remove_legacy_supplier')]

    operations = [
        migrations.AddField(model_name='stockpurchase', name='amount_paid', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AddField(model_name='stockpurchase', name='outstanding_amount', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AddField(model_name='stockpurchase', name='payment_status', field=models.CharField(choices=[('PAID', 'Fully Paid'), ('PARTIAL', 'Partially Paid'), ('UNPAID', 'Unpaid')], db_index=True, default='PAID', max_length=20)),
        migrations.AlterField(model_name='stockpurchase', name='payment_method', field=models.CharField(blank=True, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')], max_length=20, null=True)),
        migrations.RunPython(mark_existing_purchases_paid, migrations.RunPython.noop),
        migrations.AddConstraint(model_name='stockpurchase', constraint=models.CheckConstraint(condition=Q(amount_paid__gte=0), name='purchase_paid_non_negative')),
        migrations.AddConstraint(model_name='stockpurchase', constraint=models.CheckConstraint(condition=Q(outstanding_amount__gte=0), name='purchase_outstanding_non_negative')),
        migrations.AddConstraint(model_name='stockpurchase', constraint=models.CheckConstraint(condition=Q(amount_paid__lte=F('total_amount')), name='purchase_paid_not_above_total')),
        migrations.AddConstraint(model_name='stockpurchase', constraint=models.CheckConstraint(condition=Q(amount_paid=F('total_amount') - F('outstanding_amount')), name='purchase_payment_balances_total')),
    ]
