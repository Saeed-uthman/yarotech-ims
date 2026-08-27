from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .responses import success_response


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'per_page'
    max_page_size = 100

    def get_page_size(self, request):
        """Accept the canonical `per_page` and legacy frontend `limit` parameter."""
        raw_page_size = request.query_params.get('per_page', request.query_params.get('limit'))
        if raw_page_size is None:
            return self.page_size
        try:
            return min(max(int(raw_page_size), 1), self.max_page_size)
        except (TypeError, ValueError):
            return self.page_size

    def get_paginated_response(self, data):
        return Response(
            success_response(
                data=data,
                meta={
                    'current_page': self.page.number,
                    'per_page': self.get_page_size(self.request),
                    'total': self.page.paginator.count,
                    'total_pages': self.page.paginator.num_pages,
                },
            )
        )


def paginated_response(request, queryset, serializer_class, *, context=None):
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(page, many=True, context=context or {})
    return paginator.get_paginated_response(serializer.data)
