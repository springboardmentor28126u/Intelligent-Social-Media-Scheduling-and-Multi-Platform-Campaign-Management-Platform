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

    def request(self, method, path, user=None, body=None, token=None, query="", cookie=None):
        async def run():
            data = json.dumps(body).encode() if body is not None else b""
            headers = [(b"content-type", b"application/json")]
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
            return status, json.loads(result) if result else None
        return asyncio.run(run())

    def test_admin_routes_reject_anonymous_and_non_admin(self):
        for method, path, body in [("GET", "/admin/users", None), ("GET", "/admin/roles", None),
                                   ("PATCH", f"/admin/users/{self.user.id}/role", {"role": "administrator"})]:
            self.assertEqual(self.request(method, path, body=body)[0], 401)
            self.assertEqual(self.request(method, path, self.user, body)[0], 403)

    def test_admin_list_is_paginated_and_never_leaks_hashes(self):
        status, users = self.request("GET", "/admin/users", self.admin, query="limit=1&offset=1")
        self.assertEqual(status, 200)
        self.assertEqual(len(users), 1)
        self.assertEqual(users[0]["id"], self.user.id)
        self.assertNotIn("password_hash", users[0])
        self.assertEqual(self.request("GET", "/admin/users", self.admin, query="limit=101")[0], 422)
        status, roles = self.request("GET", "/admin/roles", self.admin)
        self.assertEqual(status, 200)
        self.assertEqual(len(roles), 4)

    def test_role_changes_apply_to_existing_token(self):
        token = main.create_access_token(self.user.id, "user")
        status, result = self.request("PATCH", f"/admin/users/{self.user.id}/role", self.admin,
                                      {"role": "business_user"})
        self.assertEqual(status, 200)
        self.assertNotIn("password_hash", result)
        self.assertEqual(self.request("GET", "/me/permissions", token=token)[1]["role"], "business_user")
        self.assertEqual(self.request("POST", "/accounts", token=token,
                                      body={"platform": "Facebook", "account_name": "Test"})[0], 403)
        self.assertEqual(self.request("GET", "/accounts", token=token)[0], 200)

    def test_self_demotion_invalid_role_and_unknown_user(self):
        self.assertEqual(self.request("PATCH", f"/admin/users/{self.admin.id}/role", self.admin,
                                      {"role": "content_creator"})[0], 409)
        self.assertEqual(self.request("PATCH", f"/admin/users/{self.user.id}/role", self.admin,
                                      {"role": "superuser"})[0], 422)
        self.assertEqual(self.request("PATCH", "/admin/users/9999/role", self.admin,
                                      {"role": "marketing_manager"})[0], 404)

    def test_legacy_roles_and_unknown_role(self):
        self.assertEqual(self.request("GET", "/me/permissions", self.user)[1]["role"], "content_creator")
        self.admin.role = "admin"
        self.db.commit()
        self.assertEqual(self.request("GET", "/admin/users", self.admin)[0], 200)
        self.user.role = "unknown"
        self.db.commit()
        self.assertEqual(self.request("GET", "/accounts", self.user)[0], 403)

    def test_all_writing_roles_and_account_ownership(self):
        for role in ["content_creator", "marketing_manager", "administrator"]:
            self.user.role = role
            self.db.commit()
            status, account = self.request("POST", "/accounts", self.user,
                                           {"platform": "Facebook", "account_name": "Test"})
            self.assertEqual(status, 201)
            self.assertEqual(self.request("DELETE", f'/accounts/{account["id"]}', self.admin)[0], 404)
            self.assertEqual(self.request("DELETE", f'/accounts/{account["id"]}', self.user)[0], 200)

    def test_signup_cannot_assign_admin_role(self):
        status, result = self.request("POST", "/register", body={"name": "New", "email": "new@example.com",
                                                                 "password": "test-password", "role": "administrator"})
        self.assertEqual(status, 201)
        self.assertEqual(result["role"], "user")


if __name__ == "__main__":
    unittest.main()
