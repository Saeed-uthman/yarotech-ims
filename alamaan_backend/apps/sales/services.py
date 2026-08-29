from decimal import Decimal

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.accountability.sequences import next_accountability_transaction_number
from apps.common.sequences import next_document_number
from apps.inventory.models import InventoryBatch, InventoryMovement, SaleBatchAllocation
from apps.inventory.services import record_stock_movement
from apps.products.models import ProductVariant
from apps.settings_app.models import SystemSettings

from .models import Sale, SaleItem


def _generate_invoice_number():
    today = timezone.now()
    prefix = f'SAL-{today:%Y%m%d}-'
    return next_document_number(
        sequence_name=f'sale:{today:%Y%m%d}',
        prefix=prefix,
        queryset=Sale.objects.all(),
        field_name='invoice_number',
        width=6,
    )


@transaction.atomic
def process_pos_sale(*, user, customer_id=None, items, discount=Decimal('0.00'), amount_paid, payment_method, notes=''):
    system_settings = SystemSettings.load()
    variant_ids = [item['product_variant_id'] for item in items]
    variants = {
        v.id: v
        for v in ProductVariant.objects.select_for_update().filter(id__in=variant_ids).order_by('id')
    }

    requested_by_variant = {}
    for item in items:
        variant_id = item['product_variant_id']
        requested_by_variant[variant_id] = requested_by_variant.get(variant_id, 0) + item['quantity']

    for variant_id, requested_quantity in requested_by_variant.items():
        variant = variants.get(variant_id)
        if variant is None:
            raise ValidationError({'items': f'Product variant {variant_id} not found.'})
        if variant.current_stock < requested_quantity:
            raise ValidationError({
                'items': f'Insufficient stock for {variant.product.name} ({variant.company.name}). '
                         f'Available: {variant.current_stock}, requested: {requested_quantity}.'
            })

    for item in items:
        variant = variants.get(item['product_variant_id'])
        if variant is None:
            raise ValidationError({'items': f'Product variant {item["product_variant_id"]} not found.'})

        quantity = item['quantity']
        actual_price = Decimal(str(item['actual_selling_price']))

        if actual_price < variant.min_selling_price or actual_price > variant.max_selling_price:
            raise ValidationError({
                'items': f'Selling price for {variant.product.name} must be between '
                         f'{variant.min_selling_price} and {variant.max_selling_price}.'
            })

    subtotal = Decimal('0.00')
    for item in items:
        variant = variants[item['product_variant_id']]
        actual_price = Decimal(str(item['actual_selling_price']))
        subtotal += actual_price * item['quantity']

    discount = Decimal(str(discount))
    total_amount = subtotal - discount
    if total_amount < 0:
        raise ValidationError({'discount': 'Discount cannot exceed subtotal.'})

    amount_paid = Decimal(str(amount_paid))
    if amount_paid < 0:
        raise ValidationError({'amount_paid': 'Amount paid cannot be negative.'})

    outstanding_amount = total_amount - amount_paid
    if outstanding_amount < 0:
        raise ValidationError({'amount_paid': 'Amount paid cannot exceed total amount.'})

    if customer_id is None and not system_settings.allow_walking_sales:
        raise ValidationError({'customer_id': 'Walk-in sales are disabled in system settings.'})
    if outstanding_amount > 0 and not system_settings.allow_credit_sales:
        raise ValidationError({'amount_paid': 'Credit and partial-payment sales are disabled in system settings.'})

    if outstanding_amount == 0:
        payment_status = Sale.PaymentStatus.PAID
    elif amount_paid > 0:
        payment_status = Sale.PaymentStatus.PARTIAL
    else:
        payment_status = Sale.PaymentStatus.UNPAID

    if payment_status in (Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID) and customer_id is None:
        raise ValidationError({'customer_id': 'Credit sales require a registered customer.'})

    invoice_number = _generate_invoice_number()

    sale = Sale.objects.create(
        invoice_number=invoice_number,
        customer_id=customer_id,
        subtotal=subtotal,
        discount=discount,
        total_amount=total_amount,
        amount_paid=amount_paid,
        outstanding_amount=outstanding_amount,
        payment_status=payment_status,
        payment_method=payment_method,
        notes=notes.strip(),
        served_by=user,
        created_by=user,
        updated_by=user,
    )

    for item in items:
        variant = variants[item['product_variant_id']]
        actual_price = Decimal(str(item['actual_selling_price']))
        quantity = item['quantity']

        item_subtotal = actual_price * quantity
        if not InventoryBatch.objects.filter(variant=variant).exists() and variant.current_stock > 0:
            InventoryBatch.objects.create(
                variant=variant,
                batch_number=f'LEGACY-{variant.id}',
                received_quantity=variant.current_stock,
                remaining_quantity=variant.current_stock,
                unit_cost=variant.base_price,
                received_at=timezone.now(),
                created_by=user,
            )

        sellable_batches = list(
            InventoryBatch.objects.select_for_update()
            .filter(
                variant=variant,
                status=InventoryBatch.Status.AVAILABLE,
                remaining_quantity__gt=0,
            )
            .filter(Q(expiry_date__isnull=True) | Q(expiry_date__gte=timezone.localdate()))
            .order_by(F('expiry_date').asc(nulls_last=True), 'received_at', 'id')
        )
        if sum(batch.remaining_quantity for batch in sellable_batches) < quantity:
            raise ValidationError({
                'items': f'Insufficient non-expired batch stock for {variant.product.name} ({variant.company.name}).'
            })

        remaining_to_allocate = quantity
        allocations = []
        historical_cost = Decimal('0.00')
        for batch in sellable_batches:
            if remaining_to_allocate == 0:
                break
            allocated = min(remaining_to_allocate, batch.remaining_quantity)
            batch.remaining_quantity -= allocated
            if batch.remaining_quantity == 0:
                batch.status = InventoryBatch.Status.EXHAUSTED
            batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])
            allocations.append((batch, allocated))
            historical_cost += batch.unit_cost * allocated
            remaining_to_allocate -= allocated

        weighted_unit_cost = historical_cost / quantity
        item_profit = (actual_price * quantity) - historical_cost

        sale_item = SaleItem.objects.create(
            sale=sale,
            variant=variant,
            quantity=quantity,
            actual_selling_price=actual_price,
            unit_selling_price=actual_price,
            historical_base_price=weighted_unit_cost,
            unit_base_price=weighted_unit_cost,
            min_selling_price=variant.min_selling_price,
            default_selling_price=variant.default_selling_price,
            max_selling_price=variant.max_selling_price,
            subtotal=item_subtotal,
            profit=item_profit,
        )
        SaleBatchAllocation.objects.bulk_create([
            SaleBatchAllocation(
                sale_item=sale_item,
                batch=batch,
                quantity=allocated,
                unit_cost=batch.unit_cost,
            )
            for batch, allocated in allocations
        ])

        previous_stock = variant.current_stock
        new_stock = previous_stock - quantity
        variant.current_stock = new_stock
        variant.updated_by = user
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_OUT,
            quantity=-quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Sale {invoice_number}',
            created_by=user,
            reference_type=InventoryMovement.ReferenceType.SALE,
            reference_id=str(sale.id),
        )

    if amount_paid > 0:
        AccountabilityTransaction.objects.create(
            transaction_number=next_accountability_transaction_number(),
            direction=AccountabilityTransaction.Direction.IN,
            type=AccountabilityTransaction.TxType.SALE,
            category='Sales Revenue',
            amount=amount_paid,
            payment_method=payment_method,
            reference_type='Sale',
            reference_id=str(sale.id),
            description=f'Sale revenue for {invoice_number}',
            customer_name=sale.customer.name if sale.customer_id else '',
            created_by=user,
            updated_by=user,
        )

    return sale


@transaction.atomic
def cancel_sale(*, sale, cancelled_by, reason=''):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if sale.status == Sale.Status.CANCELLED:
        raise ValidationError({'detail': 'Sale is already cancelled.'})

    # Debt recoveries update ``Sale.amount_paid`` but are posted to the
    # accountability ledger under their own CustomerDebtPayment reference.
    # Without a dedicated refund/reversal workflow, cancelling such a sale
    # would restore its stock while leaving recovered cash completed.
    initially_collected = (
        AccountabilityTransaction.objects.filter(
            reference_type='Sale',
            reference_id=str(sale.id),
            type=AccountabilityTransaction.TxType.SALE,
        )
        .values_list('amount', flat=True)
        .first()
        or Decimal('0.00')
    )
    if sale.amount_paid > initially_collected:
        raise ValidationError({
            'detail': (
                'This sale has received a debt payment and cannot be cancelled. '
                'Record a supervised refund or payment reversal instead.'
            ),
        })

    sale_items = list(sale.items.select_related('variant').all())
    locked_variants = {
        variant.id: variant
        for variant in (
            ProductVariant.objects.select_for_update()
            .filter(id__in=[item.variant_id for item in sale_items])
            .order_by('id')
        )
    }

    for item in sale_items:
        variant = locked_variants[item.variant_id]
        for allocation in item.batch_allocations.select_related('batch').all():
            batch = InventoryBatch.objects.select_for_update().get(pk=allocation.batch_id)
            batch.remaining_quantity += allocation.quantity
            batch.status = InventoryBatch.Status.AVAILABLE
            batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])
        previous_stock = variant.current_stock
        new_stock = previous_stock + item.quantity

        variant.current_stock = new_stock
        variant.updated_by = cancelled_by
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_IN,
            quantity=item.quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Cancelled sale {sale.invoice_number}. {reason}'.strip(),
            created_by=cancelled_by,
            reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
            reference_id=str(sale.id),
        )

    AccountabilityTransaction.objects.filter(
        reference_type='Sale',
        reference_id=str(sale.id),
        status=AccountabilityTransaction.Status.COMPLETED,
    ).update(status=AccountabilityTransaction.Status.CANCELLED)

    sale.status = Sale.Status.CANCELLED
    sale.updated_by = cancelled_by
    sale.save(update_fields=['status', 'updated_by', 'updated_at'])

    return sale
