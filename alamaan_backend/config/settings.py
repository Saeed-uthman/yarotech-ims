from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent
REPOSITORY_ROOT = BASE_DIR.parent

env = environ.Env()

# Load repository-wide values first, then fill any missing backend-specific
# values from alamaan_backend/.env. Existing process environment variables
# retain the highest priority because django-environ does not overwrite them.
for environment_file in (REPOSITORY_ROOT / '.env', BASE_DIR / '.env'):
    if environment_file.exists():
        environ.Env.read_env(environment_file)

DEBUG = env.bool('DJANGO_DEBUG', default=True)

DEVELOPMENT_SECRET_KEY = 'local-development-only-key-change-before-production-2026'
SECRET_KEY = env.str('DJANGO_SECRET_KEY', default=DEVELOPMENT_SECRET_KEY)
if not DEBUG and SECRET_KEY == DEVELOPMENT_SECRET_KEY:
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when DJANGO_DEBUG=False.')

ALLOWED_HOSTS = env.list(
    'DJANGO_ALLOWED_HOSTS',
    default=['localhost', '127.0.0.1', '[::1]', 'testserver'],
)
if not DEBUG and not env.str('DJANGO_ALLOWED_HOSTS', default='').strip():
    raise ImproperlyConfigured('DJANGO_ALLOWED_HOSTS must be set when DJANGO_DEBUG=False.')

CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:3000'],
)
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_HEADERS = (*default_headers, 'idempotency-key')
CORS_EXPOSE_HEADERS = ['Idempotency-Replayed']
CSRF_TRUSTED_ORIGINS = env.list(
    'CSRF_TRUSTED_ORIGINS',
    default=['http://localhost:3000', 'http://127.0.0.1:5173'],
)

if not DEBUG:
    for setting_name, origins in (
        ('CORS_ALLOWED_ORIGINS', CORS_ALLOWED_ORIGINS),
        ('CSRF_TRUSTED_ORIGINS', CSRF_TRUSTED_ORIGINS),
    ):
        if not origins or any(origin == '*' or not origin.startswith('https://') for origin in origins):
            raise ImproperlyConfigured(
                f'{setting_name} must contain only explicit HTTPS origins when DJANGO_DEBUG=False.'
            )


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    'apps.common',
    'apps.accounts',
    'apps.products',
    'apps.inventory',
    'apps.customers',
    'apps.sales',
    'apps.purchases',
    'apps.accountability',
    'apps.reports',
    'apps.dashboard',
    'apps.settings_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'apps.common.middleware.RequestAuditMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.common.middleware.BrowserSecurityHeadersMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


DATABASE_ENGINE = env.str('DB_ENGINE', default='postgresql').strip().lower()
if DATABASE_ENGINE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': env.str('SQLITE_PATH', default=str(BASE_DIR / 'db.sqlite3')),
        },
    }
elif DATABASE_ENGINE in {'postgres', 'postgresql'}:
    database_options = {}
    database_ssl_mode = env.str('DB_SSLMODE', default='prefer').strip()
    if database_ssl_mode:
        database_options['sslmode'] = database_ssl_mode
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env.str('DB_NAME'),
            'USER': env.str('DB_USER'),
            'PASSWORD': env.str('DB_PASSWORD'),
            'HOST': env.str('DB_HOST', default='127.0.0.1'),
            'PORT': env.str('DB_PORT', default='5432'),
            'CONN_MAX_AGE': env.int('DB_CONN_MAX_AGE', default=60),
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': database_options,
        },
    }
else:
    raise ImproperlyConfigured(
        f'Unsupported DB_ENGINE {DATABASE_ENGINE!r}. Use sqlite or postgresql.'
    )


# Password validation
# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = env.str('DJANGO_LANGUAGE_CODE', default='en-us')

TIME_ZONE = env.str('DJANGO_TIME_ZONE', default='Africa/Lagos')

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = Path(env.str('DJANGO_MEDIA_ROOT', default=str(BASE_DIR / 'media')))

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.common.exceptions.api_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'auth_login': env.str('AUTH_LOGIN_RATE', default='10/min'),
        'auth_register': env.str('AUTH_REGISTER_RATE', default='5/min'),
        'auth_refresh': env.str('AUTH_REFRESH_RATE', default='30/min'),
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=env.int('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60),
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=env.int('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7),
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'CHECK_REVOKE_TOKEN': True,
    'UPDATE_LAST_LOGIN': False,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Yarotech Group IMS API',
    'DESCRIPTION': 'Backend API for Yarotech Group networking, solar and IT equipment management and financial accountability',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api/v1/',
    'ENUM_NAME_OVERRIDES': {
        'PaymentMethodEnum': [
            ('CASH', 'Cash'),
            ('TRANSFER', 'Bank Transfer'),
            ('POS', 'Card / POS'),
        ],
        'SalePaymentMethodEnum': [
            ('CASH', 'Cash'),
            ('TRANSFER', 'Bank Transfer'),
            ('POS', 'Card / POS'),
            ('CREDIT', 'Credit'),
        ],
        'SalePaymentStatusEnum': [
            ('PAID', 'Fully Paid'),
            ('PARTIAL', 'Partially Paid'),
            ('UNPAID', 'Credit / Unpaid'),
        ],
        'PurchasePaymentStatusEnum': [
            ('PAID', 'Fully Paid'),
            ('PARTIAL', 'Partially Paid'),
            ('UNPAID', 'Unpaid'),
        ],
        'CompletionStatusEnum': [
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled'),
        ],
        'ActiveStatusEnum': [
            ('Active', 'Active'),
            ('Inactive', 'Inactive'),
        ],
        'AvailabilityStatusEnum': [
            ('Available', 'Available'),
            ('Inactive', 'Inactive'),
        ],
        'UserRoleEnum': [
            ('admin', 'Administrator'),
            ('cashier', 'Cashier'),
        ],
        'InventoryMovementTypeEnum': [
            ('STOCK_IN', 'Stock In'),
            ('STOCK_OUT', 'Stock Out'),
            ('ADJUSTMENT', 'Manual Adjustment'),
        ],
        'BusinessFundMovementTypeEnum': [
            ('OPENING_BALANCE', 'Opening Balance'),
            ('OWNER_CAPITAL', 'Owner Capital Added'),
            ('OWNER_WITHDRAWAL', 'Owner Withdrawal'),
        ],
    },
}

ENABLE_API_DOCS = env.bool('DJANGO_ENABLE_API_DOCS', default=DEBUG)


EMAIL_BACKEND = env.str(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)
MAILERS = {
    'default': {
        'BACKEND': EMAIL_BACKEND,
    },
}

DEFAULT_FROM_EMAIL = env.str('DEFAULT_FROM_EMAIL', default='noreply@localhost')
SERVER_EMAIL = env.str('SERVER_EMAIL', default=DEFAULT_FROM_EMAIL)

# HTTPS and browser safeguards remain disabled where necessary for local HTTP,
# and default to secure values as soon as DJANGO_DEBUG=False.
SECURE_SSL_REDIRECT = env.bool('DJANGO_SECURE_SSL_REDIRECT', default=not DEBUG)
SESSION_COOKIE_SECURE = env.bool('DJANGO_SESSION_COOKIE_SECURE', default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool('DJANGO_CSRF_COOKIE_SECURE', default=not DEBUG)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = env.int('DJANGO_SECURE_HSTS_SECONDS', default=0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    'DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS',
    default=not DEBUG,
)
SECURE_HSTS_PRELOAD = env.bool('DJANGO_SECURE_HSTS_PRELOAD', default=not DEBUG)
SECURE_PROXY_SSL_HEADER = (
    ('HTTP_X_FORWARDED_PROTO', 'https')
    if env.bool('DJANGO_TRUST_PROXY_HEADERS', default=False)
    else None
)

if not DEBUG:
    insecure_production_settings = [
        name for name, enabled in (
            ('DJANGO_SECURE_SSL_REDIRECT', SECURE_SSL_REDIRECT),
            ('DJANGO_SESSION_COOKIE_SECURE', SESSION_COOKIE_SECURE),
            ('DJANGO_CSRF_COOKIE_SECURE', CSRF_COOKIE_SECURE),
        ) if not enabled
    ]
    if insecure_production_settings:
        raise ImproperlyConfigured(
            'Production security settings cannot be disabled: '
            + ', '.join(insecure_production_settings)
        )

DATA_UPLOAD_MAX_MEMORY_SIZE = env.int('DJANGO_MAX_REQUEST_BYTES', default=5 * 1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = env.int('DJANGO_MAX_UPLOAD_BYTES', default=5 * 1024 * 1024)
AUDIT_RETENTION_DAYS = env.int('DJANGO_AUDIT_RETENTION_DAYS', default=365)
if AUDIT_RETENTION_DAYS < 30:
    raise ImproperlyConfigured('DJANGO_AUDIT_RETENTION_DAYS must be at least 30.')

LOG_DIR = Path(env.str('DJANGO_LOG_DIR', default=str(BASE_DIR / 'logs')))
if not LOG_DIR.is_absolute():
    LOG_DIR = REPOSITORY_ROOT / LOG_DIR
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
        'json': {
            '()': 'apps.common.logging.JsonFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
        'application_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOG_DIR / 'application.json.log'),
            'maxBytes': env.int('DJANGO_LOG_MAX_BYTES', default=10 * 1024 * 1024),
            'backupCount': env.int('DJANGO_LOG_BACKUP_COUNT', default=10),
            'formatter': 'json',
            'encoding': 'utf-8',
        },
        'audit_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOG_DIR / 'audit.json.log'),
            'maxBytes': env.int('DJANGO_LOG_MAX_BYTES', default=10 * 1024 * 1024),
            'backupCount': env.int('DJANGO_LOG_BACKUP_COUNT', default=10),
            'formatter': 'json',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console', 'application_file'],
        'level': env.str('DJANGO_LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django.request': {
            'handlers': ['console', 'application_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'application_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'pharmacy.audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

SENTRY_DSN = env.str('SENTRY_DSN', default='').strip()
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=env.str('SENTRY_ENVIRONMENT', default='production'),
        send_default_pii=False,
        traces_sample_rate=env.float('SENTRY_TRACES_SAMPLE_RATE', default=0.0),
    )
