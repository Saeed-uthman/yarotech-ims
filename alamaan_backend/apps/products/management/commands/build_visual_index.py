import json

from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import APIException
from apps.products.visual_search import rebuild_index


class Command(BaseCommand):
    help = 'Refresh the local product-photo index atomically; never changes products or stock.'

    def handle(self, *args, **options):
        try:
            self.stdout.write(json.dumps(rebuild_index()))
        except APIException as exc:
            raise CommandError(str(exc.detail)) from exc
