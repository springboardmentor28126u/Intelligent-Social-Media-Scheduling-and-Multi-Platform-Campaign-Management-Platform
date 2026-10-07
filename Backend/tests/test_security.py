import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import Request, HTTPException
from pydantic import ValidationError
import main
import models
import schemas
import test_roles_api
from client_ip import get_client_ip
from login_limits import check_register_limit, check_login_limit


class ClientIPTests(unittest.TestCase):
    def resolve(self, peer, header, trust='10.0.0.0/8,::1'):
        with patch.dict(os.environ, {'FORWARDED_ALLOW_IPS': trust}):
            return get_client_ip(Request({'type': 'http', 'client': (peer, 1),
                                         'headers': [(b'x-forwarded-for', header.encode())]}))

    def test_untrusted_peer_ignores_spoof(self):
        self.assertEqual(self.resolve('203.0.113.1', '198.51.100.1'), '203.0.113.1')

    def test_trusted_chain_stops_at_nearest_untrusted_hop(self):
        self.assertEqual(self.resolve('10.0.0.2', '192.0.2.99, 198.51.100.1, 10.0.0.3'), '198.51.100.1')

    def test_ipv6_and_exact_trust(self):
        self.assertEqual(self.resolve('::1', '2001:db8::1'), '2001:db8::1')
        self.assertEqual(self.resolve('10.0.0.2', '198.51.100.1', '10.0.0.2'), '198.51.100.1')

    def test_invalid_missing_and_unbounded_trust_fail_closed(self):
        for header in ['', 'not-an-ip', '198.51.100.1, invalid']:
            self.assertEqual(self.resolve('10.0.0.2', header), '10.0.0.2')
        self.assertEqual(self.resolve('10.0.0.2', '198.51.100.1', '*'), '10.0.0.2')
        self.assertEqual(get_client_ip(Request({'type': 'http', 'headers': []})), 'unknown')

    def test_worker_preserves_socket_peer(self):
        import runpy
        from pathlib import Path
        from types import SimpleNamespace
        stub = SimpleNamespace(UvicornWorker=type('Worker', (), {'CONFIG_KWARGS': {}}))
        with patch.dict('sys.modules', {'uvicorn_worker': stub}):
            worker = runpy.run_path(str(Path(__file__).parents[1] / 'server_worker.py'))
        self.assertFalse(worker['PeerPreservingWorker'].CONFIG_KWARGS['proxy_headers'])


class SecurityApiTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def test_registration_ip_limit_and_retry_after(self):
        for i in range(5):
            self.assertEqual(self.request('POST', '/register', body={
                'name': 'Test', 'email': f'test{i}@example.com', 'password': 'password'})[0], 201)
        self.assertEqual(self.request('POST', '/register', body={
            'name': 'Test', 'email': 'sixth@example.com', 'password': 'password'})[0], 429)
        self.assertIn((b'retry-after', b'3600'), self.response_headers)

    def test_registration_email_limit_case_insensitive_and_window_reset(self):
        for i in range(3):
            check_register_limit(self.db, f'192.0.2.{i}', 'TEST@example.com')
        with self.assertRaises(HTTPException) as caught:
            check_register_limit(self.db, '192.0.2.4', 'test@example.com')
        self.assertEqual(caught.exception.status_code, 429)
        for row in self.db.query(models.LoginBucket).all():
            row.started_at = datetime.now(timezone.utc) - timedelta(hours=2)
        self.db.commit()
        check_register_limit(self.db, '192.0.2.4', 'test@example.com')

    def test_login_and_registration_have_independent_private_buckets(self):
        for _ in range(10):
            check_login_limit(self.db, '192.0.2.1', 'test@example.com')
        check_register_limit(self.db, '192.0.2.1', 'test@example.com')
        rows = self.db.query(models.LoginBucket).all()
        self.assertEqual(len(rows), 4)
        self.assertTrue(all(len(row.key) == 64 and '@' not in row.key for row in rows))

    def test_both_routes_use_client_ip_helper(self):
        with patch('client_ip.get_client_ip', return_value='198.51.100.25') as helper:
            with patch('login_limits.check_register_limit') as limiter:
                self.request('POST', '/register', body={'name': 'Test', 'email': 'new@example.com', 'password': 'password'})
                self.assertEqual(limiter.call_args.args[1], '198.51.100.25')
            with patch('login_limits.check_login_limit') as limiter:
                self.request('POST', '/login', body={'email': 'new@example.com', 'password': 'password'})
                self.assertEqual(limiter.call_args.args[1], '198.51.100.25')
            self.assertEqual(helper.call_count, 2)

    def test_password_minimum_and_existing_short_password_login(self):
        for length in [6, 7]:
            with self.assertRaises(ValidationError):
                schemas.UserCreate(name='Test', email='test@example.com', password='a' * length)
            with self.assertRaises(ValidationError):
                schemas.PasswordChange(current_password='old', new_password='a' * length)
        schemas.UserCreate(name='Test', email='test@example.com', password='abcdefgh')
        schemas.PasswordChange(current_password='old', new_password='abcdefgh')
        self.user.password_hash = main.password_hash.hash('short')
        self.db.commit()
        self.assertEqual(self.request('POST', '/login', body={'email': self.user.email, 'password': 'short'})[0], 200)
        self.assertEqual(self.request('POST', '/me/password', self.user, body={'current_password': 'short', 'new_password': '1234567'})[0], 422)
        self.assertEqual(self.request('POST', '/me/password', self.user, body={'current_password': 'short', 'new_password': '12345678'})[0], 200)

    def test_duplicate_contract_preserved_without_attaching_invitations(self):
        with patch('teams.attach_invitations') as attach:
            self.assertEqual(self.request('POST', '/register', body={
                'name': 'Test', 'email': self.user.email, 'password': 'password'})[0], 400)
            attach.assert_not_called()
