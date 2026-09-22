from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.accountability.sequences import next_accountability_transaction_number
from apps.common.sequences import next_document_number
from apps.inventory.models import InventoryBatch, InventoryMovement, SaleBatchAllocation
from apps.inventory.services import record_stock_movement
from apps.products.models import ProductVariant
from apps.settings_app.models import SystemSettings

from .vat import money, price_lines, record_vat_position
from .models import Sale, SaleItem, SaleReturn, SaleReturnBatchRestoration, SaleReturnItem


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


def _generate_return_number():
    today = timezone.now()
    return next_document_number(
        sequence_name=f'sale-return:{today:%Y%m}',
        prefix=f'RET-{today:%Y%m}-',
        queryset=SaleReturn.objects.all(),
        field_name='return_number',
        width=6,
    )


@transaction.atomic
def process_pos_sale(*, user, customer_id=None, items, discount=Decimal('0.00'), amount_paid, payment_method, notes='', expected_total=None):
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
    priced_lines = price_lines([
        {'subtotal': Decimal(str(item['actual_selling_price'])) * item['quantity'],
         'vat_enabled': variants[item['product_variant_id']].product.vat_enabled}
        for item in items
    ], discount, system_settings.vat_rate if system_settings.vat_enabled else Decimal('0.00'))
    vat_amount = sum((line['vat_amount'] for line in priced_lines), Decimal('0.00'))
    total_amount = subtotal - discount + vat_amount
    if expected_total is not None and money(expected_total) != total_amount:
        raise ValidationError({'expected_total': 'The sale total changed. Refresh products and settings, then review the sale before retrying.'})

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
        vat_amount=vat_amount,
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

    for item, tax in zip(items, priced_lines):
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
            .order_by('received_at', 'id')
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
            **tax,
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

    record_vat_position(sale, 'sale')
    return sale


@transaction.atomic
def cancel_sale(*, sale, cancelled_by, reason=''):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if sale.status == Sale.Status.CANCELLED:
        raise ValidationError({'detail': 'Sale is already cancelled.'})
    if sale.returns.exists():
        raise ValidationError({'detail': 'A sale with recorded returns cannot be cancelled.'})

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
    record_vat_position(sale, 'cancel')

    return sale


@transaction.atomic
def process_sale_return(*, sale, items, refund_method, reason, processed_by):
    # Lock only the sale row. Joining the nullable customer relation here makes
    # PostgreSQL reject FOR UPDATE on the nullable side of the outer join.
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if sale.status != Sale.Status.COMPLETED:
        raise ValidationError({'detail': 'Only completed sales can be returned.'})
    if sale.debt_payment_allocations.filter(payment__is_reversed=False).exists():
        raise ValidationError({
            'detail': 'Reverse all debt recovery payments allocated to this sale before recording a return.'
        })

    requested_ids = [item['sale_item_id'] for item in items]
    sale_items = {
        item.id: item
        for item in SaleItem.objects.select_for_update()
        .select_related('variant')
        .filter(sale=sale, id__in=requested_ids)
    }
    if len(sale_items) != len(set(requested_ids)):
        raise ValidationError({'items': 'One or more sale items do not belong to this sale.'})

    prepared = []
    total_amount = Decimal('0.00')
    for request_item in items:
        sale_item = sale_items[request_item['sale_item_id']]
        quantity = request_item['quantity']
        already_returned = sale_item.return_items.aggregate(total=Sum('quantity'))['total'] or 0
        if quantity <= 0 or quantity > sale_item.quantity - already_returned:
            raise ValidationError({
                'items': f'Return quantity for item {sale_item.id} exceeds the remaining returnable quantity.'
            })
        if sale.vat_amount:
            line_total = sale_item.subtotal - sale_item.line_discount + sale_item.vat_amount
            subtotal = money(line_total * (already_returned + quantity) / sale_item.quantity) - money(line_total * already_returned / sale_item.quantity)
            return_vat = money(sale_item.vat_amount * (already_returned + quantity) / sale_item.quantity) - money(sale_item.vat_amount * already_returned / sale_item.quantity)
            unit_refund_price = money(subtotal / quantity)
        else:
            discount_factor = sale.total_amount / sale.subtotal if sale.subtotal else Decimal('0.00')
            unit_refund_price = money(sale_item.actual_selling_price * discount_factor)
            subtotal = unit_refund_price * quantity
            return_vat = Decimal('0.00')
        prepared.append((sale_item, quantity, unit_refund_price, subtotal, return_vat))
        total_amount += subtotal

    previously_returned = sale.returns.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
    if total_amount > sale.total_amount - previously_returned:
        raise ValidationError({'items': 'Return amount exceeds the remaining refundable sale amount.'})

    debt_reduction = min(total_amount, sale.outstanding_amount)
    refund_amount = total_amount - debt_reduction
    if refund_amount > sale.amount_paid:
        raise ValidationError({'detail': 'Refund exceeds the cash collected for this sale.'})

    return_record = SaleReturn.objects.create(
        return_number=_generate_return_number(),
        sale=sale,
        total_amount=total_amount,
        vat_amount=sum((entry[4] for entry in prepared), Decimal('0.00')),
        debt_reduction=debt_reduction,
        refund_amount=refund_amount,
        refund_method=refund_method,
        reason=reason.strip(),
        processed_by=processed_by,
        created_by=processed_by,
        updated_by=processed_by,
    )

    locked_variants = {
        variant.id: variant
        for variant in ProductVariant.objects.select_for_update().filter(
            id__in=[sale_item.variant_id for sale_item, _, _, _, _ in prepared]
        )
    }
    for sale_item, quantity, unit_refund_price, subtotal, return_vat in prepared:
        cost = sale_item.unit_base_price * quantity
        return_item = SaleReturnItem.objects.create(
            return_record=return_record,
            sale_item=sale_item,
            quantity=quantity,
            unit_refund_price=unit_refund_price,
            subtotal=subtotal,
            historical_cost=cost,
            profit_reversal=subtotal - return_vat - cost,
            vat_amount=return_vat,
        )

        remaining = quantity
        for allocation in sale_item.batch_allocations.select_related('batch').order_by('id'):
            restored = SaleReturnBatchRestoration.objects.filter(
                return_item__sale_item=sale_item,
                batch=allocation.batch,
            ).aggregate(total=Sum('quantity'))['total'] or 0
            available = allocation.quantity - restored
            if available <= 0:
                continue
            restore_quantity = min(remaining, available)
            batch = InventoryBatch.objects.select_for_update().get(pk=allocation.batch_id)
            batch.remaining_quantity += restore_quantity
            batch.status = InventoryBatch.Status.AVAILABLE
            batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])
            SaleReturnBatchRestoration.objects.create(
                return_item=return_item,
                batch=batch,
                quantity=restore_quantity,
            )
            remaining -= restore_quantity
            if remaining == 0:
                break
        if remaining:
            raise ValidationError({'items': f'Batch allocation history is incomplete for sale item {sale_item.id}.'})

        variant = locked_variants[sale_item.variant_id]
        previous_stock = variant.current_stock
        variant.current_stock += quantity
        variant.updated_by = processed_by
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])
        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_IN,
            quantity=quantity,
            previous_stock=previous_stock,
            new_stock=variant.current_stock,
            reason=f'Sale return {return_record.return_number}',
            created_by=processed_by,
            reference_type=InventoryMovement.ReferenceType.SALE_RETURN,
            reference_id=str(return_record.id),
        )

    sale.outstanding_amount -= debt_reduction
    sale.amount_paid -= refund_amount
    if sale.outstanding_amount == 0:
        sale.payment_status = Sale.PaymentStatus.PAID
    elif sale.amount_paid == 0:
        sale.payment_status = Sale.PaymentStatus.UNPAID
    else:
        sale.payment_status = Sale.PaymentStatus.PARTIAL
    sale.updated_by = processed_by
    sale.save(update_fields=['outstanding_amount', 'amount_paid', 'payment_status', 'updated_by', 'updated_at'])

    if refund_amount > 0:
        AccountabilityTransaction.objects.create(
            transaction_number=next_accountability_transaction_number(),
            direction=AccountabilityTransaction.Direction.OUT,
            type=AccountabilityTransaction.TxType.SALE_REFUND,
            category='Customer Sale Refund',
            amount=refund_amount,
            payment_method=refund_method,
            reference_type='SaleReturn',
            reference_id=str(return_record.id),
            description=f'Refund for {sale.invoice_number}',
            customer_name=sale.customer.name if sale.customer_id else '',
            note=reason.strip(),
            created_by=processed_by,
            updated_by=processed_by,
        )
    record_vat_position(sale, f'return:{return_record.pk}')
    return return_record
