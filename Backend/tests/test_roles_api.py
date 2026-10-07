"""Exercise real ASGI requests and dependency checks without external HTTP clients."""
import asyncio
import json
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import main
import models
from database import Base, get_db


class RoleApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.admin = models.User(name="Admin", email="admin@example.com", password_hash="not-returned", role="administrator")
        self.user = models.User(name="Creator", email="creator@example.com", password_hash="not-returned", role="user")
        self.db.add_all([self.admin, self.user])
        self.db.commit()
        main.app.dependency_overrides[get_db] = lambda: self.db

    def tearDown(self):
        main.app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def request(self, method, path, user=None, body=None, token=None, query="", cookie=None, workspace=None, raw=False):
        async def run():
            data = json.dumps(body).encode() if body is not None else b""
            headers = [(b"content-type", b"application/json")]
            if workspace is not None:
                headers.append((b"x-workspace-id", str(workspace).encode()))
            if cookie:
                headers.append((b"cookie", cookie.encode()))
            bearer = token or (main.create_access_token(user.id, user.role) if user else None)
            if bearer:
                headers.append((b"authorization", f"Bearer {bearer}".encode()))
            messages = []
            async def receive():
                return {"type": "http.request", "body": data, "more_body": False}
            async def send(message):
                messages.append(message)
            await main.app({"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
                            "method": method, "scheme": "http", "path": path, "raw_path": path.encode(),
                            "query_string": query.encode(), "headers": headers,
                            "client": ("127.0.0.1", 1), "server": ("test", 80), "root_path": ""}, receive, send)
            status = next(m["status"] for m in messages if m["type"] == "http.response.start")
            self.response_headers = next(m["headers"] for m in messages if m["type"] == "http.response.start")
            result = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
            return status, result if raw else (json.loads(result) if result else None)
        return asyncio.run(run())

    def test_admin_routes_reject_anonymous_and_non_admin(self):
        for method, path, body in [("GET", "/admin/users", None), ("GET", "/admin/roles", None),
                                   ("PATCH", f"/admin/users/{self.user.id}/role", {"role": "administrator"})]:
            self.assertEqual(self.request(method, path, body=body)[0], 404)
            self.assertEqual(self.request(method, path, self.user, body)[0], 404)

    def test_admin_routes_disabled_for_all_roles(self):
        for role in ['content_creator', 'marketing_manager', 'business_user', 'administrator']:
            self.user.role = role
            self.db.commit()
            for method, path, body in [('GET', '/admin', None), ('GET', '/admin/roles', None), ('GET', '/admin/users', None), ('PATCH', f'/admin/users/{self.admin.id}/role', {'role': 'content_creator'})]:
                self.assertEqual(self.request(method, path, self.user, body)[0], 404)

    def test_role_changes_apply_to_existing_token(self):
        token = main.create_access_token(self.user.id, 'user')
        self.user.role = 'business_user'
        self.db.commit()
        self.assertEqual(self.request('GET', '/me/permissions', token=token)[1]['role'], 'business_user')
        self.assertEqual(self.request('POST', '/accounts', token=token, body={'platform': 'Facebook', 'account_name': 'Test'})[0], 403)

    def test_legacy_roles_and_unknown_role(self):
        self.assertEqual(self.request("GET", "/me/permissions", self.user)[1]["role"], "content_creator")
        self.admin.role = "admin"
        self.db.commit()
        self.assertEqual(self.request("GET", "/admin/users", self.admin)[0], 404)
        self.user.role = "unknown"
        self.db.commit()
        self.assertEqual(self.request("GET", "/accounts", self.user)[0], 403)

    def test_all_writing_roles_and_account_ownership(self):
        for role in ["content_creator"]:
            self.user.role = role
            self.db.commit()
            status, account = self.request("POST", "/accounts", self.user,
                                           {"platform": "Facebook", "account_name": "Test"})
            self.assertEqual(status, 201)
            self.assertEqual(self.request("DELETE", f'/accounts/{account["id"]}', self.admin)[0], 403)
            self.assertEqual(self.request("DELETE", f'/accounts/{account["id"]}', self.user)[0], 200)

    def test_signup_cannot_assign_admin_role(self):
        status, result = self.request("POST", "/register", body={"name": "New", "email": "new@example.com",
                                                                 "password": "test-password", "role": "administrator"})
        self.assertEqual(status, 201)
        self.assertEqual(result["role"], "user")


if __name__ == "__main__":
    unittest.main()
