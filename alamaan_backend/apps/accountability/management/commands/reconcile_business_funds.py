from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q, Sum

from apps.accountability.models import AccountabilityTransaction, BusinessFundMovement


ZERO = Decimal('0.00')


class Command(BaseCommand):
    help = 'Verify the combined business-funds balance and its owner-fund source records.'

    def handle(self, *args, **options):
        completed = AccountabilityTransaction.objects.filter(
            status=AccountabilityTransaction.Status.COMPLETED,
        )
        totals = completed.aggregate(
            money_in=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
            money_out=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
        )
        money_in = totals['money_in'] or ZERO
        money_out = totals['money_out'] or ZERO
        current_funds = money_in - money_out
        errors = []

        opening_count = BusinessFundMovement.objects.filter(
            movement_type=BusinessFundMovement.MovementType.OPENING_BALANCE,
        ).count()
        if opening_count > 1:
            errors.append(f'Expected at most one opening balance; found {opening_count}.')

        movements = BusinessFundMovement.objects.all()
        for movement in movements:
            transactions = completed.filter(
                reference_type='BusinessFundMovement',
                reference_id=str(movement.id),
            )
            if transactions.count() != 1:
                errors.append(
                    f'{movement.movement_number} has {transactions.count()} completed ledger entries; expected 1.'
                )
                continue
            ledger = transactions.first()
            expected_direction = (
                AccountabilityTransaction.Direction.OUT
                if movement.movement_type == BusinessFundMovement.MovementType.OWNER_WITHDRAWAL
                else AccountabilityTransaction.Direction.IN
            )
            if ledger.type != movement.movement_type:
                errors.append(f'{movement.movement_number} ledger type does not match its source record.')
            if ledger.direction != expected_direction:
                errors.append(f'{movement.movement_number} ledger direction is incorrect.')
            if ledger.amount != movement.amount:
                errors.append(f'{movement.movement_number} ledger amount does not match its source record.')

        source_ids = {str(value) for value in movements.values_list('id', flat=True)}
        orphan_count = completed.filter(reference_type='BusinessFundMovement').exclude(
            reference_id__in=source_ids,
        ).count()
        if orphan_count:
            errors.append(f'Found {orphan_count} orphan business-funds ledger entries.')
        if current_funds < ZERO:
            errors.append(f'Current business funds are negative ({current_funds:.2f}).')

        self.stdout.write(f'Total completed money in: {money_in:.2f}')
        self.stdout.write(f'Total completed money out: {money_out:.2f}')
        self.stdout.write(f'Current business funds: {current_funds:.2f}')
        self.stdout.write(f'Business fund movements checked: {movements.count()}')

        if errors:
            for error in errors:
                self.stderr.write(f'ERROR: {error}')
            raise CommandError(f'Business funds reconciliation failed with {len(errors)} issue(s).')

        self.stdout.write(self.style.SUCCESS('Business funds reconciliation passed.'))
