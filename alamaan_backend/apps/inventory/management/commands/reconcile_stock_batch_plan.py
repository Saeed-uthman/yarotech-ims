"""Apply a reviewed physical-count plan atomically; never change aggregate stock."""
if __name__ == '__main__':
    import os
    import sys
    from pathlib import Path
    import environ
    import django

    if not Path('config/settings.py').is_file():
        raise SystemExit('Run from the alamaan_backend directory using the backend virtual environment.')
    sys.path.insert(0, str(Path.cwd()))
    environ.Env.read_env('/etc/yarotech/yarotech-api.env', overwrite=True)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.products.models import ProductVariant
from apps.inventory.models import InventoryBatch, InventoryMovement


def read_plan(path):
    try:
        plan = json.loads(Path(path).read_text(encoding='utf-8'))
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,32}', plan['plan_id']) or not plan['reason'].strip():
            raise ValueError('Invalid plan ID or reason')
        items = plan['items']
        if not isinstance(items, list) or not items or len(items) > 500:
            raise ValueError('Plan must contain 1 to 500 items')
        ids = set()
        for item in items:
            for key in ('variant_id', 'stock', 'batch_stock'):
                if type(item[key]) is not int or item[key] < 0:
                    raise ValueError(f'Invalid {key}')
            if item['variant_id'] in ids or item['variant_id'] == 0:
                raise ValueError('Duplicate or invalid variant ID')
            ids.add(item['variant_id'])
            if not isinstance(item['name'], str) or not isinstance(item['company'], str):
                raise ValueError('Product and company names are required')
            if item['stock'] > item['batch_stock']:
                cost = Decimal(str(item['unit_cost']))
                if not cost.is_finite() or cost < 0 or cost >= Decimal('10000000000') or cost != cost.quantize(Decimal('.01')):
                    raise ValueError('Invalid unit cost')
        return plan
    except (OSError, KeyError, ValueError, TypeError, InvalidOperation) as exc:
        raise CommandError(f'Invalid reconciliation plan: {exc}') from exc


class Command(BaseCommand):
    help = 'Preview or apply a reviewed batch reconciliation JSON plan. Aggregate stock is unchanged.'

    def add_arguments(self, parser):
        parser.add_argument('--plan', required=True)
        parser.add_argument('--actor-email', required=True)
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        plan = read_plan(options['plan'])
        actor = get_user_model().objects.filter(email__iexact=options['actor_email'].strip(), is_active=True, role='admin').first()
        if not actor:
            raise CommandError('An existing active administrator is required.')
        actions = []
        with transaction.atomic():
            # Same lock order as checkout: variant first, then its batches.
            items = sorted(plan['items'], key=lambda item: item['variant_id'])
            variants = {v.pk: v for v in ProductVariant.objects.select_for_update().filter(
                pk__in=[item['variant_id'] for item in items]).order_by('pk')}
            for item in items:
                variant_id = item['variant_id']
                variant = variants.get(variant_id)
                if variant is None:
                    raise CommandError(f'Variant {variant_id} does not exist.')
                reference = f"BR:{plan['plan_id']}:{variant_id}"
                previous = InventoryMovement.objects.filter(variant=variant,
                    reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
                    reference_id=reference).first()
                if previous:
                    if json.loads(previous.notes)['confirmed_item'] != item:
                        raise CommandError(f'Plan was changed after application for variant {variant_id}.')
                    self.stdout.write(f'{variant_id}: already applied; skipped (including any subsequent sales).')
                    continue
                if variant.product.name != item['name'] or variant.company.name != item['company']:
                    raise CommandError(f'Variant {variant_id}: product/company differs from the confirmed plan.')
                if variant.current_stock != item['stock']:
                    raise CommandError(f'Variant {variant_id}: stock changed to {variant.current_stock}; recount before repair. No changes saved.')
                batches = list(InventoryBatch.objects.select_for_update().filter(variant=variant).order_by('received_at', 'pk'))
                if any(b.remaining_quantity and b.status != InventoryBatch.Status.AVAILABLE for b in batches):
                    raise CommandError(f'Variant {variant_id}: non-available batch units require separate review.')
                total = sum(b.remaining_quantity for b in batches)
                if total != item['batch_stock']:
                    raise CommandError(f'Variant {variant_id}: batch stock changed to {total}; review again. No changes saved.')
                delta = item['stock'] - total
                self.stdout.write(f"{variant_id} {item['name']}: batch stock {total} -> {item['stock']}; displayed stock stays {item['stock']}."
                    + (f" New units cost {item['unit_cost']} each." if delta > 0 else ' Reduce oldest remaining batches first.'))
                actions.append((item, variant, batches, delta, reference))
            if not options['apply']:
                self.stdout.write(f'PREVIEW ONLY: {len(actions)} variants to reconcile. No changes saved.')
                return
            for item, variant, batches, delta, reference in actions:
                changes = []
                if delta > 0:
                    batch = InventoryBatch.objects.create(variant=variant,
                        batch_number=f'RECON-{variant.pk}-{uuid4().hex}', received_quantity=delta,
                        remaining_quantity=delta, unit_cost=Decimal(str(item['unit_cost'])),
                        received_at=timezone.now(), created_by=actor)
                    changes.append({'batch_id': batch.pk, 'before': 0, 'after': delta, 'unit_cost': str(batch.unit_cost), 'created': True})
                else:
                    remaining = -delta
                    for batch in batches:
                        if not remaining:
                            break
                        taken = min(remaining, batch.remaining_quantity)
                        if not taken:
                            continue
                        before = batch.remaining_quantity
                        batch.remaining_quantity -= taken
                        if not batch.remaining_quantity:
                            batch.status = InventoryBatch.Status.EXHAUSTED
                        batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])
                        changes.append({'batch_id': batch.pk, 'before': before, 'after': batch.remaining_quantity, 'unit_cost': str(batch.unit_cost), 'created': False})
                        remaining -= taken
                InventoryMovement.objects.create(variant=variant, quantity=0,
                    previous_stock=variant.current_stock, new_stock=variant.current_stock,
                    movement_type=InventoryMovement.MovementType.ADJUSTMENT,
                    reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
                    reference_id=reference, reason='Batch reconciliation after confirmed physical count',
                    notes=json.dumps({'confirmed_item': item, 'reason': plan['reason'], 'batch_changes': changes}),
                    created_by=actor)
        self.stdout.write(self.style.SUCCESS(f'COMMITTED: {len(actions)} variants reconciled. Displayed stock unchanged.'))


if __name__ == '__main__':
    Command().run_from_argv([sys.argv[0], 'reconcile_stock_batch_plan', *sys.argv[1:]])
