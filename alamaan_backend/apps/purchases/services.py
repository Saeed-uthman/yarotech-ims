from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.accountability.sequences import next_accountability_transaction_number
from apps.common.sequences import next_document_number
from apps.inventory.models import InventoryBatch, InventoryMovement
from apps.inventory.services import record_stock_movement
from apps.products.models import ProductVariant

from .models import PurchaseItem, PurchaseReturn, PurchaseReturnItem, StockPurchase, SupplierPayment


def _generate_purchase_number():
    now = timezone.now()
    prefix = f'PUR-{now:%Y%m}-'
    return next_document_number(
        sequence_name=f'purchase:{now:%Y%m}',
        prefix=prefix,
        queryset=StockPurchase.objects.all(),
        field_name='purchase_number',
        width=5,
    )


def _generate_purchase_return_number():
    now = timezone.now()
    return next_document_number(
        sequence_name=f'purchase-return:{now:%Y%m}',
        prefix=f'PRT-{now:%Y%m}-',
        queryset=PurchaseReturn.objects.all(),
        field_name='return_number',
        width=5,
    )


def _generate_supplier_payment_number():
    now = timezone.now()
    return next_document_number(
        sequence_name=f'supplier-payment:{now:%Y%m}',
        prefix=f'SPP-{now:%Y%m}-',
        queryset=SupplierPayment.objects.all(),
        field_name='payment_number',
        width=6,
    )


@transaction.atomic
def record_supplier_payment(*, purchase, user, amount, payment_method, payment_date=None, note=''):
    purchase = StockPurchase.objects.select_for_update().get(pk=purchase.pk)
    if purchase.status != StockPurchase.Status.COMPLETED:
        raise ValidationError({'detail': 'Payments can only be recorded against completed purchases.'})
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValidationError({'amount': 'Payment amount must be greater than zero.'})
    if amount > purchase.outstanding_amount:
        raise ValidationError({'amount': 'Payment amount exceeds the outstanding purchase balance.'})

    balance_before = purchase.outstanding_amount
    purchase.amount_paid += amount
    purchase.outstanding_amount -= amount
    purchase.payment_status = (
        StockPurchase.PaymentStatus.PAID
        if purchase.outstanding_amount == 0
        else StockPurchase.PaymentStatus.PARTIAL
    )
    purchase.updated_by = user
    purchase.save(update_fields=['amount_paid', 'outstanding_amount', 'payment_status', 'updated_by', 'updated_at'])

    payment = SupplierPayment.objects.create(
        payment_number=_generate_supplier_payment_number(),
        purchase=purchase,
        supplier_name=purchase.supplier_name,
        amount=amount,
        payment_method=payment_method,
        payment_date=payment_date or timezone.now(),
        balance_before=balance_before,
        balance_after=purchase.outstanding_amount,
        note=note.strip(),
        recorded_by=user,
        created_by=user,
        updated_by=user,
    )
    AccountabilityTransaction.objects.create(
        transaction_number=next_accountability_transaction_number(),
        direction=AccountabilityTransaction.Direction.OUT,
        type=AccountabilityTransaction.TxType.SUPPLIER_PAYMENT,
        category='Supplier Payment',
        amount=amount,
        payment_method=payment_method,
        reference_type='SupplierPayment',
        reference_id=str(payment.id),
        description=f'Supplier payment for {purchase.purchase_number}',
        note=note.strip(),
        created_by=user,
        updated_by=user,
    )
    return payment


@transaction.atomic
def create_stock_purchase(*, user, items, payment_method=None, amount_paid=None, supplier_name='', purchase_date=None, note=''):
    variant_ids = [item['product_variant_id'] for item in items]
    variants = {
        v.id: v
        for v in ProductVariant.objects.select_for_update().filter(id__in=variant_ids).order_by('id')
    }

    total_amount = Decimal('0.00')
    purchase_items_data = []

    for item in items:
        variant = variants.get(item['product_variant_id'])
        if variant is None:
            raise ValidationError({'items': f'Product variant {item["product_variant_id"]} not found.'})

        quantity = item['quantity']
        unit_price = Decimal(str(item['unit_purchase_price']))

        if quantity <= 0:
            raise ValidationError({'items': 'Quantity must be greater than zero.'})
        if unit_price <= 0:
            raise ValidationError({'items': 'Unit purchase price must be greater than zero.'})

        item_subtotal = unit_price * quantity
        total_amount += item_subtotal

        purchase_items_data.append({
            'variant': variant,
            'quantity': quantity,
            'unit_purchase_price': unit_price,
            'subtotal': item_subtotal,
            'batch_number': item.get('batch_number', ''),
            'expiry_date': item.get('expiry_date'),
        })

    purchase_number = _generate_purchase_number()
    amount_paid = total_amount if amount_paid is None else Decimal(str(amount_paid))
    if amount_paid < 0 or amount_paid > total_amount:
        raise ValidationError({'amount_paid': 'Amount paid must be between zero and the purchase total.'})
    if amount_paid > 0 and not payment_method:
        raise ValidationError({'payment_method': 'Payment method is required when money is paid.'})
    outstanding_amount = total_amount - amount_paid
    payment_status = (
        StockPurchase.PaymentStatus.PAID if outstanding_amount == 0
        else StockPurchase.PaymentStatus.PARTIAL if amount_paid > 0
        else StockPurchase.PaymentStatus.UNPAID
    )

    resolved_supplier_name = supplier_name.strip()
    purchase = StockPurchase.objects.create(
        purchase_number=purchase_number,
        purchase_date=purchase_date or timezone.now(),
        total_amount=total_amount,
        amount_paid=amount_paid,
        outstanding_amount=outstanding_amount,
        payment_status=payment_status,
        payment_method=payment_method,
        note=note.strip(),
        recorded_by=user,
        supplier_name=resolved_supplier_name,
        created_by=user,
        updated_by=user,
    )

    for item_data in purchase_items_data:
        variant = item_data['variant']
        quantity = item_data['quantity']
        unit_price = item_data['unit_purchase_price']
        item_subtotal = item_data['subtotal']

        purchase_item = PurchaseItem.objects.create(
            purchase=purchase,
            variant=variant,
            quantity=quantity,
            unit_purchase_price=unit_price,
            subtotal=item_subtotal,
        )

        batch_number = item_data.get('batch_number', '').strip() or f'{purchase_number}-{purchase_item.id}'
        InventoryBatch.objects.create(
            variant=variant,
            purchase_item=purchase_item,
            supplier_name=resolved_supplier_name,
            batch_number=batch_number,
            expiry_date=item_data.get('expiry_date'),
            received_quantity=quantity,
            remaining_quantity=quantity,
            unit_cost=unit_price,
            received_at=purchase.purchase_date,
            created_by=user,
        )

        previous_stock = variant.current_stock
        new_stock = previous_stock + quantity
        variant.current_stock = new_stock
        variant.updated_by = user
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_IN,
            quantity=quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Purchase {purchase_number}',
            created_by=user,
            reference_type=InventoryMovement.ReferenceType.STOCK_PURCHASE,
            reference_id=str(purchase.id),
        )

    if amount_paid > 0:
        AccountabilityTransaction.objects.create(
            transaction_number=next_accountability_transaction_number(),
            direction=AccountabilityTransaction.Direction.OUT,
            type=AccountabilityTransaction.TxType.STOCK_PURCHASE,
            category='Stock Purchase',
            amount=amount_paid,
            payment_method=payment_method,
            reference_type='StockPurchase',
            reference_id=str(purchase.id),
            description=f'Stock purchase {purchase_number}',
            created_by=user,
            updated_by=user,
        )

    return purchase


@transaction.atomic
def cancel_purchase(*, purchase, cancelled_by, reason=''):
    purchase = StockPurchase.objects.select_for_update().get(pk=purchase.pk)
    if purchase.status == StockPurchase.Status.CANCELLED:
        raise ValidationError({'detail': 'Purchase is already cancelled.'})
    if purchase.returns.exists():
        raise ValidationError({'detail': 'A purchase with recorded returns cannot be cancelled.'})
    if purchase.supplier_payments.exists():
        raise ValidationError({'detail': 'A purchase with later supplier payments cannot be cancelled.'})

    purchase_items = list(purchase.items.select_related('variant').all())
    locked_variants = {
        variant.id: variant
        for variant in (
            ProductVariant.objects.select_for_update()
            .filter(id__in=[item.variant_id for item in purchase_items])
            .order_by('id')
        )
    }

    for item in purchase_items:
        variant = locked_variants[item.variant_id]
        batch = InventoryBatch.objects.select_for_update().get(purchase_item=item)
        if batch.remaining_quantity != batch.received_quantity:
            raise ValidationError({
                'detail': f'Cannot cancel purchase: batch {batch.batch_number} has already been used or adjusted.'
            })
        previous_stock = variant.current_stock
        new_stock = previous_stock - item.quantity

        if new_stock < 0:
            raise ValidationError({
                'detail': f'Cannot cancel purchase: stock for {variant.product.name} ({variant.company.name}) '
                          f'would go negative (current: {previous_stock}, to reverse: {item.quantity}).'
            })

        variant.current_stock = new_stock
        variant.updated_by = cancelled_by
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])
        batch.remaining_quantity = 0
        batch.status = InventoryBatch.Status.CANCELLED
        batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_OUT,
            quantity=-item.quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Cancelled purchase {purchase.purchase_number}. {reason}'.strip(),
            created_by=cancelled_by,
            reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
            reference_id=str(purchase.id),
        )

    AccountabilityTransaction.objects.filter(
        reference_type='StockPurchase',
        reference_id=str(purchase.id),
        status=AccountabilityTransaction.Status.COMPLETED,
    ).update(status=AccountabilityTransaction.Status.CANCELLED)

    purchase.status = StockPurchase.Status.CANCELLED
    purchase.updated_by = cancelled_by
    purchase.save(update_fields=['status', 'updated_by', 'updated_at'])

    return purchase


@transaction.atomic
def process_purchase_return(
    *, purchase, items, refund_method, reason, processed_by,
    cash_refund_amount=None, payable_credit_amount=None,
):
    purchase = StockPurchase.objects.select_for_update().get(pk=purchase.pk)
    if purchase.status != StockPurchase.Status.COMPLETED:
        raise ValidationError({'detail': 'Only completed purchases can be returned.'})

    requested_ids = [item['purchase_item_id'] for item in items]
    purchase_items = {
        item.id: item
        for item in PurchaseItem.objects.select_for_update().select_related('variant')
        .filter(purchase=purchase, id__in=requested_ids)
    }
    if len(purchase_items) != len(set(requested_ids)):
        raise ValidationError({'items': 'One or more purchase items do not belong to this purchase.'})

    prepared = []
    total_amount = Decimal('0.00')
    for requested in items:
        purchase_item = purchase_items[requested['purchase_item_id']]
        quantity = requested['quantity']
        already_returned = purchase_item.return_items.aggregate(total=Sum('quantity'))['total'] or 0
        if quantity <= 0 or quantity > purchase_item.quantity - already_returned:
            raise ValidationError({'items': f'Return quantity for item {purchase_item.id} exceeds the returnable quantity.'})
        batch = InventoryBatch.objects.select_for_update().get(purchase_item=purchase_item)
        if quantity > batch.remaining_quantity:
            raise ValidationError({
                'items': f'Only {batch.remaining_quantity} unsold unit(s) remain in batch {batch.batch_number}.'
            })
        subtotal = purchase_item.unit_purchase_price * quantity
        prepared.append((purchase_item, batch, quantity, subtotal))
        total_amount += subtotal

    if cash_refund_amount is None and payable_credit_amount is None:
        payable_credit_amount = min(total_amount, purchase.outstanding_amount)
        cash_refund_amount = total_amount - payable_credit_amount
    elif cash_refund_amount is None:
        payable_credit_amount = Decimal(str(payable_credit_amount))
        cash_refund_amount = total_amount - payable_credit_amount
    elif payable_credit_amount is None:
        cash_refund_amount = Decimal(str(cash_refund_amount))
        payable_credit_amount = total_amount - cash_refund_amount
    else:
        cash_refund_amount = Decimal(str(cash_refund_amount))
        payable_credit_amount = Decimal(str(payable_credit_amount))

    if cash_refund_amount < 0 or payable_credit_amount < 0 or cash_refund_amount + payable_credit_amount != total_amount:
        raise ValidationError({'allocation': 'Cash refund plus payable credit must equal the return total.'})
    if cash_refund_amount > purchase.amount_paid:
        raise ValidationError({'cash_refund_amount': 'Cash refund exceeds the net amount paid on this purchase.'})
    if payable_credit_amount > purchase.outstanding_amount:
        raise ValidationError({'payable_credit_amount': 'Payable credit exceeds the outstanding supplier balance.'})
    if cash_refund_amount > 0 and not refund_method:
        raise ValidationError({'refund_method': 'Refund method is required when cash is received.'})

    purchase.amount_paid -= cash_refund_amount
    purchase.outstanding_amount -= payable_credit_amount
    purchase.credited_amount += total_amount
    purchase.payment_status = (
        StockPurchase.PaymentStatus.PAID if purchase.outstanding_amount == 0
        else StockPurchase.PaymentStatus.PARTIAL if purchase.amount_paid > 0
        else StockPurchase.PaymentStatus.UNPAID
    )
    purchase.updated_by = processed_by
    purchase.save(update_fields=[
        'amount_paid', 'outstanding_amount', 'credited_amount', 'payment_status',
        'updated_by', 'updated_at',
    ])

    return_record = PurchaseReturn.objects.create(
        return_number=_generate_purchase_return_number(),
        purchase=purchase,
        total_amount=total_amount,
        cash_refund_amount=cash_refund_amount,
        payable_credit_amount=payable_credit_amount,
        refund_method=refund_method,
        reason=reason.strip(),
        processed_by=processed_by,
        created_by=processed_by,
        updated_by=processed_by,
    )

    locked_variants = {
        variant.id: variant
        for variant in ProductVariant.objects.select_for_update().filter(
            id__in=[item.variant_id for item, _, _, _ in prepared]
        ).order_by('id')
    }
    for purchase_item, batch, quantity, subtotal in prepared:
        PurchaseReturnItem.objects.create(
            return_record=return_record,
            purchase_item=purchase_item,
            batch=batch,
            quantity=quantity,
            unit_refund_price=purchase_item.unit_purchase_price,
            subtotal=subtotal,
        )
        batch.remaining_quantity -= quantity
        if batch.remaining_quantity == 0:
            batch.status = InventoryBatch.Status.EXHAUSTED
        batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])

        variant = locked_variants[purchase_item.variant_id]
        previous_stock = variant.current_stock
        if quantity > previous_stock:
            raise ValidationError({'items': f'Stock for {variant} would become negative.'})
        variant.current_stock -= quantity
        variant.updated_by = processed_by
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])
        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_OUT,
            quantity=-quantity,
            previous_stock=previous_stock,
            new_stock=variant.current_stock,
            reason=f'Purchase return {return_record.return_number}',
            created_by=processed_by,
            reference_type=InventoryMovement.ReferenceType.PURCHASE_RETURN,
            reference_id=str(return_record.id),
        )

    if cash_refund_amount > 0:
        AccountabilityTransaction.objects.create(
            transaction_number=next_accountability_transaction_number(),
            direction=AccountabilityTransaction.Direction.IN,
            type=AccountabilityTransaction.TxType.PURCHASE_RETURN,
            category='Stock Purchase Return',
            amount=cash_refund_amount,
            payment_method=refund_method,
            reference_type='PurchaseReturn',
            reference_id=str(return_record.id),
            description=f'Purchase refund for {purchase.purchase_number}',
            note=reason.strip(),
            created_by=processed_by,
            updated_by=processed_by,
        )
    return return_record
