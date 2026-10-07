"""Environment-only settings. Never open dotenv files."""
import os
from cryptography.fernet import Fernet


def validate_environment():
    if not os.getenv('DATABASE_URL'):
        raise RuntimeError('DATABASE_URL is required')
    if os.getenv('APP_ENV', 'development') == 'production':
        if len(os.getenv('JWT_SECRET_KEY', '')) < 32:
            raise RuntimeError('Production requires JWT_SECRET_KEY with at least 32 characters')
        try:
            Fernet(os.environ['SOCIAL_TOKEN_KEY'].encode())
        except (KeyError, ValueError):
            raise RuntimeError('Production requires a valid SOCIAL_TOKEN_KEY') from None
        origins = os.getenv('CORS_ORIGINS', '').split(',')
        if not all(o.strip().startswith(('https://', 'http://localhost:', 'http://127.0.0.1:')) for o in origins):
            raise RuntimeError('Production requires explicit HTTPS CORS_ORIGINS (localhost allowed for Docker)')


class SecurityHeaders:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        async def secure_send(message):
            if message['type'] == 'http.response.start':
                message['headers'] = list(message.get('headers', [])) + [
                    (b'x-content-type-options', b'nosniff'),
                    (b'x-frame-options', b'DENY'),
                    (b'referrer-policy', b'no-referrer'),
                    (b'permissions-policy', b'camera=(), microphone=(), geolocation=()'),
                    (b'content-security-policy', b"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"),
                ]
                if os.getenv('APP_ENV') == 'production' and scope.get('scheme') == 'https':
                    message['headers'].append((b'strict-transport-security', b'max-age=31536000'))
            await send(message)
        await self.app(scope, receive, secure_send)
