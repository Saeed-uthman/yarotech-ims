from rest_framework.views import exception_handler

from .responses import error_response


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data
    message = 'Request failed.'

    if isinstance(detail, dict) and 'detail' in detail:
        message = str(detail['detail'])
    elif isinstance(detail, list) and detail:
        message = str(detail[0])

    response.data = error_response(message=message, errors=detail)
    return response
