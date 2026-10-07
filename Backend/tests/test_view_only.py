import unittest
import models
import test_roles_api
import test_campaigns
from roles import permissions_for

class ViewOnlyTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def test_readonly_roles_permissions_and_content_routes(self):
        _, post = self.request('POST', '/posts', self.user, {'title': 'Existing'})
        _, campaign = self.request('POST', '/campaigns', self.user, test_campaigns.CampaignTests.body(self))
        for role in ['administrator', 'business_user']:
            self.user.role = role
            self.db.commit()
            self.assertEqual(permissions_for(role), {'accounts:read', 'posts:read', 'analytics:read'})
            for method, path, body in [('POST', '/posts', {'title': 'Denied'}), ('PATCH', f"/posts/{post['id']}", {'title': 'Denied'}), ('POST', '/campaigns', test_campaigns.CampaignTests.body(self)), ('POST', f"/posts/{post['id']}/reviews", {'action': 'approve', 'revision': 1}), ('POST', '/accounts', {'platform': 'Facebook', 'account_name': 'Denied'}), ('POST', f"/posts/{post['id']}/publish", {'account_ids': [1]}), ('POST', '/analytics/refresh', None), ('POST', '/analytics/audience/refresh', None), ('POST', '/demo', None), ('DELETE', '/demo', None), ('POST', '/teams', {'name': 'Denied'})]:
                with self.subTest(role=role, path=path):
                    self.assertEqual(self.request(method, path, self.user, body)[0], 403)
            for path in ['/posts', '/campaigns', '/analytics/summary', '/reports/export/campaigns', '/me/permissions']:
                self.assertEqual(self.request('GET', path, self.user, raw=True)[0], 200)

    def test_owner_and_explicit_delegate_manage_but_role_alone_does_not(self):
        _, team = self.request('POST', '/teams', self.user, {'name': 'Owned'})
        tid = team['id']
        self.request('POST', f'/teams/{tid}/invitations', self.user, {'email': self.admin.email, 'role': 'administrator'})
        self.request('POST', f'/teams/{tid}/accept', self.admin)
        self.assertEqual(self.request('PATCH', f'/teams/{tid}', self.admin, {'name': 'Denied'})[0], 403)
        self.assertEqual(self.request('PATCH', f'/teams/{tid}/members/{self.admin.id}', self.user, {'is_admin': True})[0], 200)
        self.assertEqual(self.request('PATCH', f'/teams/{tid}', self.admin, {'name': 'Delegated'})[0], 200)
        self.request('PATCH', f'/teams/{tid}/members/{self.user.id}', self.user, {'role': 'business_user'})
        self.assertEqual(self.request('PATCH', f'/teams/{tid}', self.user, {'name': 'Owner'})[0], 200)
        for actor in [self.user, self.admin]:
            self.assertEqual(self.request('POST', '/posts', actor, {'title': 'Denied'}, workspace=tid)[0], 403)
            self.assertEqual(self.request('POST', '/posts/999/reviews', actor, {'action': 'approve', 'revision': 1}, workspace=tid)[0], 403)
