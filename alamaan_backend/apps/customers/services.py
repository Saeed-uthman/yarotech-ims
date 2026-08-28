from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.accountability.sequences import next_accountability_transaction_number
from apps.common.sequences import next_document_number
from apps.sales.models import Sale

from .models import Customer, CustomerDebtPayment


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
def create_customer(*, created_by, name, phone, email='', address='', notes=''):
    phone = phone.strip()
    if Customer.objects.filter(phone=phone).exists():
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
            value = value.strip()
            if Customer.objects.filter(phone=value).exclude(pk=customer.pk).exists():
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
        Sale.objects
        .filter(
            customer=customer,
            status=Sale.Status.COMPLETED,
            payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
        )
        .order_by('created_at')
    )

    total_outstanding = sum(sale.outstanding_amount for sale in unpaid_sales)

    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValidationError({'amount': 'Payment amount must be greater than zero.'})

    if amount > total_outstanding:
        raise ValidationError({'amount': 'Payment amount exceeds total outstanding debt.'})

    balance_before = total_outstanding

    remaining_payment = amount
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
