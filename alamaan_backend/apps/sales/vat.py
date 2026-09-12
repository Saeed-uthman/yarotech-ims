from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from .models import Sale, VatMovement

ZERO = Decimal('0.00')


def money(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def price_lines(lines, discount, rate):
    """Allocate discount cumulatively so rounding never loses invoice pennies."""
    subtotal = sum((line['subtotal'] for line in lines), ZERO)
    if discount < 0 or discount > subtotal:
        raise ValidationError({'discount': 'Discount cannot exceed subtotal or be negative.'})
    cumulative = allocated = ZERO
    result = []
    for line in lines:
        cumulative += line['subtotal']
        share = money(discount * cumulative / subtotal) if subtotal else ZERO
        line_discount = share - allocated
        allocated = share
        line_rate = rate if line['vat_enabled'] else ZERO
        result.append({
            'line_discount': line_discount,
            'vat_rate': line_rate,
            'vat_amount': money((line['subtotal'] - line_discount) * line_rate / 100),
        })
    return result


def record_vat_position(sale, source):
    """Called inside the sale's locked transaction; ledger deltas retain event dates."""
    if not sale.vat_amount:
        return
    returns = sale.returns.aggregate(total=Sum('total_amount'), vat=Sum('vat_amount'))
    billed = sale.vat_amount - (returns['vat'] or ZERO)
    net_total = sale.total_amount - (returns['total'] or ZERO)
    collected = money(billed * min(sale.amount_paid, net_total) / net_total) if net_total else ZERO
    if sale.status == Sale.Status.CANCELLED:
        billed = collected = ZERO
    previous = sale.vat_movements.aggregate(billed=Sum('vat_billed'), collected=Sum('vat_collected'))
    VatMovement.objects.create(
        sale=sale, source=source,
        vat_billed=billed - (previous['billed'] or ZERO),
        vat_collected=collected - (previous['collected'] or ZERO),
    )
