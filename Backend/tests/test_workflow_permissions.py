"""Publishing authority must be checked by every server entry point."""
from datetime import datetime, timedelta, timezone
import unittest
import test_collaboration
from roles import permissions_for


class WorkflowPermissionTests(unittest.TestCase):
    setUp = test_collaboration.CollaborationTests.setUp
    tearDown = test_collaboration.CollaborationTests.tearDown
    request = test_collaboration.CollaborationTests.request
    team = test_collaboration.CollaborationTests.team
    join = test_collaboration.CollaborationTests.join
    draft = test_collaboration.CollaborationTests.draft

    def test_manager_can_draft_but_cannot_publish_or_connect_in_workspace(self):
        team = self.team(False)
        self.join(team, role='marketing_manager')
        post = self.draft(team)
        routes = [
            ('POST', '/accounts', {'platform': 'Facebook', 'account_name': 'Denied'}),
            ('DELETE', '/accounts/999', None),
            ('POST', f'/posts/{post["id"]}/schedule', {
                'scheduled_at': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                'account_ids': [999]}),
            ('POST', f'/posts/{post["id"]}/cancel', None),
            ('POST', f'/posts/{post["id"]}/restore-draft', None),
            ('POST', '/queue/999/retry', None),
            ('POST', '/queue/run', None),
        ]
        routes += [('POST', f'/oauth/{provider}/authorize', None)
                   for provider in ['facebook', 'instagram', 'youtube', 'x', 'linkedin']]
        for method, path, body in routes:
            with self.subTest(path=path):
                self.assertEqual(self.request(method, path, self.user, body, workspace=team)[0], 403)

    def test_permission_split_and_personal_manager_restrictions(self):
        for role in ['content_creator']:
            self.assertTrue({'content:write', 'publish:write'} <= permissions_for(role))
        self.assertNotIn('publish:write', permissions_for('administrator'))
        self.assertIn('content:write', permissions_for('marketing_manager'))
        self.assertNotIn('publish:write', permissions_for('marketing_manager'))
        self.assertNotIn('content:write', permissions_for('business_user'))
        self.user.role = 'marketing_manager'
        self.db.commit()
        self.assertEqual(self.request('POST', '/queue/run', self.user)[0], 403)
        self.assertEqual(self.request('POST', '/accounts', self.user,
                                     {'platform': 'Facebook', 'account_name': 'Denied'})[0], 403)
