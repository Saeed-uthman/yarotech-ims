"""Repair a physically verified, positive batch shortfall without adding aggregate stock."""
if __name__ == '__main__':
    # Standalone VPS use: run from the deployed backend directory, using its venv.
    import os
    import sys
    from pathlib import Path
    import environ
    import django

    if not Path('manage.py').is_file() or not Path('config/settings.py').is_file():
        raise SystemExit('Run this file from the alamaan_backend directory.')
    sys.path.insert(0, str(Path.cwd()))
    environ.Env.read_env('/etc/yarotech/yarotech-api.env', overwrite=True)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import InventoryBatch, InventoryMovement
from apps.products.models import ProductVariant


class Command(BaseCommand):
    help = 'Preview a verified batch shortfall repair; --apply saves it. Does not change displayed stock.'

    def add_arguments(self, parser):
        parser.add_argument('--variant-id', type=int, required=True)
        parser.add_argument('--expected-stock', type=int, required=True, help='Physically counted stock; must equal displayed stock.')
        parser.add_argument('--actor-email', required=True)
        parser.add_argument('--unit-cost', required=True, help='Verified unit purchase cost of the unbatched stock (not selling price).')
        parser.add_argument('--reason', required=True)
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        actor = get_user_model().objects.filter(email__iexact=options['actor_email'].strip(), is_active=True, role='admin').first()
        if not actor:
            raise CommandError('An existing active administrator is required.')
        try:
            cost = Decimal(options['unit_cost'])
            if not cost.is_finite() or cost < 0 or cost >= Decimal('10000000000') or cost != cost.quantize(Decimal('0.01')):
                raise ValueError()
        except (InvalidOperation, ValueError):
            raise CommandError('Unit cost must be a nonnegative amount with at most two decimal places.')
        reason = options['reason'].strip()
        if not reason or options['expected_stock'] < 0:
            raise CommandError('A reason and nonnegative physical stock count are required.')
        with transaction.atomic():
            try:
                variant = ProductVariant.objects.select_for_update().get(pk=options['variant_id'])
            except ProductVariant.DoesNotExist:
                raise CommandError('Variant does not exist.')
            if variant.current_stock != options['expected_stock']:
                raise CommandError('Displayed stock differs from the physical count supplied. Recount and investigate before proceeding.')
            batches = list(InventoryBatch.objects.select_for_update().filter(variant=variant).order_by('pk'))
            if any(b.remaining_quantity > 0 and b.status != InventoryBatch.Status.AVAILABLE for b in batches):
                raise CommandError('There are non-available batches with remaining units. Investigate their status first.')
            batch_stock = sum(b.remaining_quantity for b in batches)
            gap = variant.current_stock - batch_stock
            self.stdout.write(f'Variant {variant.pk}: {variant.product.name} ({variant.company.name})')
            self.stdout.write(f'Displayed/confirmed stock: {variant.current_stock}; batch stock: {batch_stock}; shortfall: {gap}; unit cost: {cost}')
            if gap < 0:
                raise CommandError('Batch stock exceeds displayed stock; this command cannot repair that case.')
            if gap == 0:
                self.stdout.write('Already reconciled. No changes made.')
                return
            if not options['apply']:
                self.stdout.write('PREVIEW ONLY. Review the count and unit cost, then rerun with --apply.')
                return
            batch = InventoryBatch.objects.create(
                variant=variant, batch_number=f'RECON-{variant.pk}-{uuid4().hex}',
                received_quantity=gap, remaining_quantity=gap, unit_cost=cost,
                received_at=timezone.now(), created_by=actor,
            )
            InventoryMovement.objects.create(
                variant=variant, movement_type=InventoryMovement.MovementType.ADJUSTMENT,
                quantity=0, previous_stock=variant.current_stock, new_stock=variant.current_stock,
                reason='Batch reconciliation after physical count',
                notes=f'{reason}\nCreated batch {batch.pk}: {gap} units at {cost}. Aggregate stock unchanged.',
                reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
                reference_id=str(batch.pk), created_by=actor,
            )
            self.stdout.write(self.style.SUCCESS(f'Repaired {gap} batch units. Displayed stock remains {variant.current_stock}.'))


if __name__ == '__main__':
    Command().run_from_argv([sys.argv[0], 'reconcile_stock_batches', *sys.argv[1:]])
