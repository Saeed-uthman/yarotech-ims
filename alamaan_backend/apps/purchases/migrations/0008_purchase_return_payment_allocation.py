from django.db import migrations, models
from django.db.models import F, Q, Sum


def migrate_existing_returns(apps, schema_editor):
    StockPurchase = apps.get_model('purchases', 'StockPurchase')
    PurchaseReturn = apps.get_model('purchases', 'PurchaseReturn')
    PurchaseReturn.objects.update(cash_refund_amount=F('total_amount'), payable_credit_amount=0)
    for purchase in StockPurchase.objects.all().iterator():
        returned = PurchaseReturn.objects.filter(purchase_id=purchase.id).aggregate(total=Sum('total_amount'))['total'] or 0
        if returned:
            purchase.credited_amount = returned
            purchase.amount_paid = purchase.amount_paid - returned
            purchase.save(update_fields=['credited_amount', 'amount_paid'])


class Migration(migrations.Migration):
    dependencies = [('purchases', '0007_supplierpayment')]
    operations = [
        migrations.RemoveConstraint(model_name='stockpurchase', name='purchase_payment_balances_total'),
        migrations.AddField(model_name='stockpurchase', name='credited_amount', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AddField(model_name='purchasereturn', name='cash_refund_amount', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AddField(model_name='purchasereturn', name='payable_credit_amount', field=models.DecimalField(decimal_places=2, default=0, max_digits=12)),
        migrations.AlterField(model_name='purchasereturn', name='refund_method', field=models.CharField(blank=True, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')], max_length=20, null=True)),
        migrations.RunPython(migrate_existing_returns, migrations.RunPython.noop),
        migrations.AddConstraint(model_name='stockpurchase', constraint=models.CheckConstraint(condition=Q(credited_amount__gte=0), name='purchase_credited_non_negative')),
        migrations.AddConstraint(model_name='stockpurchase', constraint=models.CheckConstraint(condition=Q(amount_paid=F('total_amount') - F('outstanding_amount') - F('credited_amount')), name='purchase_payment_balances_total')),
        migrations.AddConstraint(model_name='purchasereturn', constraint=models.CheckConstraint(condition=Q(cash_refund_amount__gte=0), name='purchase_return_cash_non_negative')),
        migrations.AddConstraint(model_name='purchasereturn', constraint=models.CheckConstraint(condition=Q(payable_credit_amount__gte=0), name='purchase_return_credit_non_negative')),
        migrations.AddConstraint(model_name='purchasereturn', constraint=models.CheckConstraint(condition=Q(total_amount=F('cash_refund_amount') + F('payable_credit_amount')), name='purchase_return_allocation_matches_total')),
    ]
