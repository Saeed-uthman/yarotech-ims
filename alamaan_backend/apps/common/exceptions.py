from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler

from .responses import error_response


class AccountPendingApproval(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Your account is pending administrator approval.'
    default_code = 'ACCOUNT_PENDING_APPROVAL'


class AccountRegistrationRejected(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Your account registration was rejected.'
    default_code = 'ACCOUNT_REGISTRATION_REJECTED'


class AccountSuspended(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Your account has been suspended.'
    default_code = 'ACCOUNT_SUSPENDED'


class AccountInactive(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Your account is not active.'
    default_code = 'ACCOUNT_INACTIVE'


def _first_error_code(codes):
    if isinstance(codes, dict):
        for value in codes.values():
            return _first_error_code(value)
    if isinstance(codes, list) and codes:
        return _first_error_code(codes[0])
    return str(codes or 'REQUEST_FAILED').upper()


def _first_error_message(detail):
    if isinstance(detail, dict):
        if 'detail' in detail:
            return _first_error_message(detail['detail'])
        for value in detail.values():
            return _first_error_message(value)
    if isinstance(detail, list) and detail:
        return _first_error_message(detail[0])
    return str(detail or 'Request failed.')


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data
    message = _first_error_message(detail)
    get_codes = getattr(exc, 'get_codes', None)
    if callable(get_codes):
        error_code = _first_error_code(get_codes())
    else:
        # Django's Http404 and PermissionDenied are normalized into DRF
        # responses by ``exception_handler`` but do not implement
        # APIException.get_codes(). Keep the public envelope stable instead
        # of turning an expected client error into a server error.
        error_code = {
            status.HTTP_400_BAD_REQUEST: 'BAD_REQUEST',
            status.HTTP_401_UNAUTHORIZED: 'NOT_AUTHENTICATED',
            status.HTTP_403_FORBIDDEN: 'PERMISSION_DENIED',
            status.HTTP_404_NOT_FOUND: 'NOT_FOUND',
            status.HTTP_405_METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
            status.HTTP_429_TOO_MANY_REQUESTS: 'THROTTLED',
        }.get(response.status_code, 'REQUEST_FAILED')
    response.data = error_response(message=message, error=error_code, errors=detail)
    return response
