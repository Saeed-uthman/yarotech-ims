from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.common.models import AuditEvent


class Command(BaseCommand):
    help = 'Delete audit events older than the configured retention period.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=settings.AUDIT_RETENTION_DAYS,
            help='Retention period in days (defaults to DJANGO_AUDIT_RETENTION_DAYS).',
        )
        parser.add_argument('--dry-run', action='store_true', help='Report without deleting records.')

    def handle(self, *args, **options):
        days = options['days']
        if days < 30:
            raise CommandError('Audit retention cannot be shorter than 30 days.')

        cutoff = timezone.now() - timedelta(days=days)
        queryset = AuditEvent.objects.filter(created_at__lt=cutoff)
        count = queryset.count()
        if options['dry_run']:
            self.stdout.write(f'DRY RUN - {count} audit event(s) are older than {days} days.')
            return

        deleted, _ = queryset.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} audit event(s) older than {days} days.'))
