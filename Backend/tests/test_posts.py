import unittest
import models
import test_roles_api


class PostApiTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def create(self, **values):
        status, post = self.request("POST", "/posts", self.user, {"title": " Draft ", **values})
        self.assertEqual(status, 201)
        return post

    def test_create_read_update_delete_persisted_draft(self):
        post = self.create(content="First version")
        self.assertEqual(post["title"], "Draft")
        self.assertEqual(post["status"], "draft")
        self.assertIsNone(post["account_id"])
        user_id = self.user.id
        self.db.expunge_all()
        self.user = self.db.get(models.User, user_id)
        stored = self.db.get(models.Post, post["id"])
        self.assertEqual(stored.content, "First version")
        path = f'/posts/{post["id"]}'
        self.assertEqual(self.request("GET", path, self.user)[0], 200)
        status, updated = self.request("PATCH", path, self.user, {"content": "Updated"})
        self.assertEqual(status, 200)
        self.assertEqual(updated["title"], "Draft")
        self.assertEqual(updated["content"], "Updated")
        self.assertEqual(self.request("DELETE", path, self.user)[0], 200)
        self.assertEqual(self.request("GET", path, self.user)[0], 404)

    def test_other_users_including_admin_cannot_access_drafts(self):
        post = self.create()
        path = f'/posts/{post["id"]}'
        for method, body in [("GET", None), ("PATCH", {"title": "Stolen"}), ("DELETE", None)]:
            self.assertEqual(self.request(method, path, self.admin, body)[0], 404 if method == "GET" else 403)
            self.assertEqual(self.request(method, path, body=body)[0], 401)
        self.assertEqual(self.request("GET", "/posts", self.admin)[1], [])

    def test_readonly_role_and_unauthenticated_create(self):
        post = self.create()
        self.user.role = "business_user"
        self.db.commit()
        self.assertEqual(self.request("GET", "/posts", self.user)[0], 200)
        self.assertEqual(self.request("POST", "/posts", self.user, {"title": "New"})[0], 403)
        self.assertEqual(self.request("PATCH", f'/posts/{post["id"]}', self.user, {"title": "New"})[0], 403)
        self.assertEqual(self.request("DELETE", f'/posts/{post["id"]}', self.user)[0], 403)
        self.assertEqual(self.request("POST", "/posts", body={"title": "New"})[0], 401)

    def test_validation_and_server_controlled_fields(self):
        for body in [{"title": "  "}, {"title": "x" * 201}, {"title": "x", "content": "x" * 50001},
                     {"title": "x", "platform": "unknown"}, {"title": "x", "status": "published"},
                     {"title": "x", "user_id": self.admin.id}]:
            self.assertEqual(self.request("POST", "/posts", self.user, body)[0], 422)
        post = self.create()
        for body in [{}, {"title": None}, {"content": None}, {"status": "scheduled"}, {"title": "  "}]:
            self.assertEqual(self.request("PATCH", f'/posts/{post["id"]}', self.user, body)[0], 422)

    def test_target_ownership_platform_and_disconnect(self):
        account = models.SocialAccount(user_id=self.user.id, platform="Facebook", account_name="Test", connected=False)
        other = models.SocialAccount(user_id=self.admin.id, platform="X", account_name="Other", connected=False)
        self.db.add_all([account, other])
        self.db.commit()
        post = self.create(account_id=account.id)
        self.assertEqual(post["platform"], "facebook")
        self.assertEqual(self.request("POST", "/posts", self.user, {"title": "x", "account_id": other.id})[0], 404)
        self.assertEqual(self.request("PATCH", f'/posts/{post["id"]}', self.user, {"platform": "x"})[0], 422)
        self.assertEqual(self.request("DELETE", f"/accounts/{account.id}", self.user)[0], 200)
        status, saved = self.request("GET", f'/posts/{post["id"]}', self.user)
        self.assertEqual(status, 200)
        self.assertIsNone(saved["account_id"])

    def test_pagination_filter_and_clearing_target(self):
        self.create(platform="facebook")
        post = self.create(platform="x")
        self.assertEqual(len(self.request("GET", "/posts", self.user, query="platform=facebook&status=draft")[1]), 1)
        self.assertEqual(len(self.request("GET", "/posts", self.user, query="limit=1&offset=1")[1]), 1)
        self.assertEqual(self.request("GET", "/posts", self.user, query="limit=101")[0], 422)
        self.assertEqual(self.request("PATCH", f'/posts/{post["id"]}', self.user, {"platform": None, "account_id": None})[1]["platform"], None)

    def test_non_draft_cannot_be_edited_or_deleted(self):
        post = self.create()
        stored = self.db.get(models.Post, post["id"])
        stored.status = "published"
        self.db.commit()
        path = f'/posts/{post["id"]}'
        self.assertEqual(self.request("PATCH", path, self.user, {"title": "Changed"})[0], 409)
        self.assertEqual(self.request("DELETE", path, self.user)[0], 409)
