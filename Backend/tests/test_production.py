import os
import unittest
from unittest.mock import patch, Mock
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
import models
import main
import test_roles_api
from runtime_config import validate_environment


class ProductionTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def test_health_and_headers(self):
        self.assertEqual(self.request('GET', '/health'), (200, {'status': 'ok'}))
        self.assertIn((b'x-content-type-options', b'nosniff'), self.response_headers)
        broken = Mock()
        broken.execute.side_effect = RuntimeError('private database detail')
        with self.assertRaises(Exception) as caught:
            main.health(broken)
        self.assertEqual(caught.exception.status_code, 503)
        self.assertNotIn('private', caught.exception.detail)

    def test_login_throttle_and_window_reset(self):
        body = {'email': 'absent@example.com', 'password': 'incorrect-password'}
        for _ in range(10):
            self.assertEqual(self.request('POST', '/login', body=body)[0], 401)
        self.assertEqual(self.request('POST', '/login', body=body)[0], 429)
        self.assertIn((b'retry-after', b'900'), self.response_headers)
        for row in self.db.query(models.LoginBucket).all():
            row.started_at = datetime.now(timezone.utc) - timedelta(minutes=16)
        self.db.commit()
        self.assertEqual(self.request('POST', '/login', body=body)[0], 401)

    def test_production_requires_both_secrets(self):
        settings = {'APP_ENV': 'production', 'DATABASE_URL': 'sqlite://', 'CORS_ORIGINS': 'https://app.example.com'}
        with patch.dict(os.environ, settings, clear=True):
            with self.assertRaises(RuntimeError): validate_environment()
            os.environ['JWT_SECRET_KEY'] = 'synthetic-production-test-key-long-enough'
            with self.assertRaises(RuntimeError): validate_environment()
            os.environ['SOCIAL_TOKEN_KEY'] = Fernet.generate_key().decode()
            validate_environment()

    def test_mongo_endpoint_removed(self):
        self.assertEqual(self.request('GET', '/mongo-test')[0], 404)
        self.assertEqual(self.request('GET', '/mongo-test', self.user)[0], 404)

    def test_docs_follow_environment(self):
        original = main.app
        try:
            for environment, expected in [('production', 404), ('development', 200)]:
                with patch.dict(os.environ, {'APP_ENV': environment}):
                    main.app = main.create_app()
                for path in ['/docs', '/redoc', '/openapi.json']:
                    with self.subTest(environment=environment, path=path):
                        self.assertEqual(self.request('GET', path, raw=True)[0], expected)
        finally:
            main.app = original
