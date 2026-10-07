import unittest
from unittest.mock import patch
import test_roles_api
import test_analytics


class RoleCleanupTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def check_routes(self, workspace=None, allowed=False):
        with patch('analytics.sync_engagement', return_value={}) as sync, patch('analytics.collect_audience', return_value=(0, [])) as audience, patch('demo.seed') as seed, patch('demo.clear', return_value={}) as clear:
            for method, path, success in [('POST', '/analytics/refresh', 200), ('POST', '/analytics/audience/refresh', 200), ('POST', '/demo', 201), ('DELETE', '/demo', 200)]:
                with self.subTest(role=self.user.role, workspace=workspace, method=method, path=path):
                    self.assertEqual(self.request(method, path, self.user, workspace=workspace)[0], success if allowed else 403)
            for operation in [sync, audience, seed, clear]:
                self.assertEqual(operation.call_count, 1 if allowed else 0)

    def test_personal_noncreators_denied(self):
        for role in ['marketing_manager', 'administrator', 'business_user']:
            self.user.role = role
            self.db.commit()
            self.check_routes()

    def test_personal_creator_allowed(self):
        self.user.role = 'content_creator'
        self.db.commit()
        self.check_routes(allowed=True)

    def test_team_owner_roles(self):
        code, team = self.request('POST', '/teams', self.user, {'name': 'Permissions'})
        self.assertEqual(code, 201)
        team_id = team['id']
        self.check_routes(workspace=team_id, allowed=True)
        for role in ['marketing_manager', 'administrator', 'business_user']:
            self.assertEqual(self.request('PATCH', f'/teams/{team_id}/members/{self.user.id}', self.user, {'role': role})[0], 200)
            self.check_routes(workspace=team_id)

    def test_team_creator_without_manage_cannot_mutate_demo(self):
        self.admin.role = 'content_creator'
        self.db.commit()
        code, team = self.request('POST', '/teams', self.admin, {'name': 'Managed'})
        self.assertEqual(code, 201)
        team_id = team['id']
        self.request('POST', f'/teams/{team_id}/invitations', self.admin, {'email': self.user.email, 'role': 'content_creator'})
        self.request('POST', f'/teams/{team_id}/accept', self.user)
        for method in ['POST', 'DELETE']:
            self.assertEqual(self.request(method, '/demo', self.user, workspace=team_id)[0], 403)

    def test_engagement_notes_keep_write_permission(self):
        job = test_analytics.AnalyticsTests.published_job(self)
        for role, expected in [('content_creator', 200), ('marketing_manager', 200), ('administrator', 403), ('business_user', 403)]:
            self.user.role = role
            self.db.commit()
            self.assertEqual(self.request('PATCH', f'/engagement/{job.id}', self.user, {'status': 'reviewed', 'note': 'Review'})[0], expected)
