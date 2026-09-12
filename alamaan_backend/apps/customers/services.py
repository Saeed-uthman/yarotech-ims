from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.accountability.sequences import next_accountability_transaction_number
from apps.common.sequences import next_document_number
from apps.sales.models import Sale
from apps.sales.vat import record_vat_position

from .models import Customer, CustomerDebtPayment, CustomerDebtPaymentAllocation, DebtPaymentReversal


def _generate_receipt_number():
    now = timezone.now()
    prefix = f'RCT-{now:%Y%m}-'
    return next_document_number(
        sequence_name=f'debt-receipt:{now:%Y%m}',
        prefix=prefix,
        queryset=CustomerDebtPayment.objects.all(),
        field_name='receipt_number',
        width=6,
    )


@transaction.atomic
def create_customer(*, created_by, name, phone=None, email='', address='', notes=''):
    phone = (phone or "").strip() or None
    if phone is not None and Customer.objects.filter(phone=phone).exists():
        raise ValidationError({'phone': 'A customer with this phone number already exists.'})

    return Customer.objects.create(
        name=name.strip(),
        phone=phone,
        email=email.strip(),
        address=address.strip(),
        notes=notes.strip(),
        created_by=created_by,
        updated_by=created_by,
    )


@transaction.atomic
def update_customer(*, customer, updated_by, **fields):
    for field, value in fields.items():
        if field == 'phone':
            value = (value or "").strip() or None
            if value is not None and Customer.objects.filter(phone=value).exclude(pk=customer.pk).exists():
                raise ValidationError({'phone': 'A customer with this phone number already exists.'})
        setattr(customer, field, value)

    customer.updated_by = updated_by
    customer.save()
    return customer


@transaction.atomic
def toggle_customer_status(*, customer, toggled_by):
    new_status = (
        Customer.Status.INACTIVE
        if customer.status == Customer.Status.ACTIVE
        else Customer.Status.ACTIVE
    )
    customer.status = new_status
    customer.updated_by = toggled_by
    customer.save(update_fields=['status', 'updated_by', 'updated_at'])
    return customer


@transaction.atomic
def record_customer_debt_payment(*, user, customer, amount, payment_method, notes=''):
    customer = Customer.objects.select_for_update().get(pk=customer.pk)

    unpaid_sales = (
        Sale.objects.select_for_update()
        .filter(
            customer=customer,
            status=Sale.Status.COMPLETED,
            payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
        )
        .order_by('created_at', 'pk')
    )

    total_outstanding = sum(sale.outstanding_amount for sale in unpaid_sales)

    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValidationError({'amount': 'Payment amount must be greater than zero.'})

    if amount > total_outstanding:
        raise ValidationError({'amount': 'Payment amount exceeds total outstanding debt.'})

    balance_before = total_outstanding

    remaining_payment = amount
    allocation_rows = []
    for sale in unpaid_sales:
        if remaining_payment <= 0:
            break

        needed = sale.outstanding_amount
        pay_for_sale = min(remaining_payment, needed)

        sale.amount_paid += pay_for_sale
        sale.outstanding_amount -= pay_for_sale
        sale.payment_status = (
            Sale.PaymentStatus.PAID if sale.outstanding_amount == 0 else Sale.PaymentStatus.PARTIAL
        )
        sale.save(update_fields=['amount_paid', 'outstanding_amount', 'payment_status', 'updated_at'])
        allocation_rows.append((sale, pay_for_sale))

        remaining_payment -= pay_for_sale

    balance_after = balance_before - amount

    payment = CustomerDebtPayment.objects.create(
        receipt_number=_generate_receipt_number(),
        customer=customer,
        amount=amount,
        payment_method=payment_method,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_notes=notes.strip(),
        recorded_by=user,
        created_by=user,
        updated_by=user,
    )
    CustomerDebtPaymentAllocation.objects.bulk_create([
        CustomerDebtPaymentAllocation(payment=payment, sale=sale, amount=allocated_amount)
        for sale, allocated_amount in allocation_rows
    ])

    for sale, _ in allocation_rows:
        record_vat_position(sale, f'payment:{payment.pk}')

    AccountabilityTransaction.objects.create(
        transaction_number=next_accountability_transaction_number(),
        direction=AccountabilityTransaction.Direction.IN,
        type=AccountabilityTransaction.TxType.DEBT_PAYMENT,
        category='Customer Debt Recovery',
        amount=amount,
        payment_method=payment_method,
        reference_type='CustomerDebtPayment',
        reference_id=str(payment.id),
        description=f'Debt recovery from {customer.name}',
        customer_name=customer.name,
        created_by=user,
        updated_by=user,
    )

    return payment


@transaction.atomic
def reverse_customer_debt_payment(*, payment, reversed_by, reason):
    payment = CustomerDebtPayment.objects.select_for_update().select_related('customer').get(pk=payment.pk)
    Customer.objects.select_for_update().get(pk=payment.customer_id)
    if payment.is_reversed:
        raise ValidationError({'detail': 'This debt payment has already been reversed.'})

    allocations = list(payment.allocations.select_related('sale').order_by('-sale__created_at'))
    if not allocations:
        raise ValidationError({
            'detail': 'This legacy payment has no allocation trail and requires manual reconciliation.'
        })

    locked_sales = {
        sale.id: sale
        for sale in Sale.objects.select_for_update().filter(
            id__in=[allocation.sale_id for allocation in allocations]
        ).order_by('created_at', 'pk')
    }
    for allocation in allocations:
        sale = locked_sales[allocation.sale_id]
        sale.amount_paid -= allocation.amount
        sale.outstanding_amount += allocation.amount
        sale.payment_status = (
            Sale.PaymentStatus.UNPAID if sale.amount_paid == 0 else Sale.PaymentStatus.PARTIAL
        )
        sale.save(update_fields=['amount_paid', 'outstanding_amount', 'payment_status', 'updated_at'])

    reversal = DebtPaymentReversal.objects.create(
        payment=payment,
        reason=reason.strip(),
        reversed_by=reversed_by,
        created_by=reversed_by,
        updated_by=reversed_by,
    )
    payment.is_reversed = True
    payment.updated_by = reversed_by
    payment.save(update_fields=['is_reversed', 'updated_by', 'updated_at'])

    AccountabilityTransaction.objects.create(
        transaction_number=next_accountability_transaction_number(),
        direction=AccountabilityTransaction.Direction.OUT,
        type=AccountabilityTransaction.TxType.DEBT_PAYMENT_REVERSAL,
        category='Customer Debt Payment Reversal',
        amount=payment.amount,
        payment_method=payment.payment_method,
        reference_type='DebtPaymentReversal',
        reference_id=str(reversal.id),
        description=f'Reversal of debt receipt {payment.receipt_number}',
        customer_name=payment.customer.name,
        note=reason.strip(),
        created_by=reversed_by,
        updated_by=reversed_by,
    )
    for sale in locked_sales.values():
        record_vat_position(sale, f'payment-reversal:{reversal.pk}')
    return reversal
