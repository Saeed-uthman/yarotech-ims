def success_response(data=None, message='Success', meta=None):
    response = {
        'success': True,
        'message': message,
        'data': data,
    }
    if meta is not None:
        response['meta'] = meta
    return response


def error_response(message='Error', error='REQUEST_FAILED', errors=None):
    return {
        'success': False,
        'error': error,
        'message': message,
        'errors': errors,
    }
