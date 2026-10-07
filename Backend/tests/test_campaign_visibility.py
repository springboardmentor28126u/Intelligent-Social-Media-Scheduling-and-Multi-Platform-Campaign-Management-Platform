import unittest
from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import Mock, patch
from sqlalchemy.orm import sessionmaker
from openpyxl import load_workbook
import models
import notifications
import test_collaboration
import test_campaigns


class CampaignVisibilityTests(unittest.TestCase):
    setUp = test_collaboration.CollaborationTests.setUp
    tearDown = test_collaboration.CollaborationTests.tearDown
    request = test_collaboration.CollaborationTests.request
    team = test_collaboration.CollaborationTests.team
    join = test_collaboration.CollaborationTests.join
    body = test_campaigns.CampaignTests.body

    def campaign(self, team, **values):
        code, campaign = self.request('POST', '/campaigns', self.admin, self.body(**values), workspace=team)
        self.assertEqual(code, 201, campaign)
        return campaign['id']

    def test_private_assigned_shared_and_business_user_access(self):
        team = self.team()
        self.join(team, role='marketing_manager')
        private = self.campaign(team, name='Private')
        assigned = self.campaign(team, name='Assigned', assigned_member_ids=[self.user.id])
        shared = self.campaign(team, name='Shared', shared_with_team=True)
        self.assertEqual(self.request('GET', f'/campaigns/{private}', self.user, workspace=team)[0], 404)
        self.assertEqual({c['id'] for c in self.request('GET', '/campaigns', self.user, workspace=team)[1]}, {assigned, shared})
        self.assertEqual(self.request('PATCH', f'/campaigns/{assigned}', self.user, {'shared_with_team': True}, workspace=team)[0], 403)
        self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.admin, {'role': 'business_user'})
        self.assertEqual({c['id'] for c in self.request('GET', '/campaigns', self.user, workspace=team)[1]}, {shared})
        self.assertEqual(self.request('GET', f'/campaigns/{assigned}', self.user, workspace=team)[0], 404)
        self.assertEqual(len(self.request('GET', '/campaigns', self.admin, workspace=team)[1]), 3)

    def test_campaign_creator_access_and_cross_workspace_assignment_rejected(self):
        team = self.team()
        self.join(team, role='marketing_manager')
        code, campaign = self.request('POST', '/campaigns', self.user, self.body(), workspace=team)
        self.assertEqual(code, 201)
        self.assertEqual(campaign['creator_id'], self.user.id)
        self.assertFalse(campaign['shared_with_team'])
        self.assertEqual(self.request('GET', f"/campaigns/{campaign['id']}", self.user, workspace=team)[0], 200)
        self.assertEqual(self.request('PATCH', f"/campaigns/{campaign['id']}", self.user,
                                     {'assigned_member_ids': [9999]}, workspace=team)[0], 422)

    def test_private_content_absent_from_lists_metrics_and_exports(self):
        team = self.team()
        self.join(team, role='marketing_manager')
        campaign = self.campaign(team, name='Secret campaign')
        code, post = self.request('POST', '/posts', self.admin,
            {'title': 'Secret title', 'content': 'Private copy', 'campaign_id': campaign}, workspace=team)
        self.assertEqual(code, 201)
        now = datetime.now(timezone.utc)
        owner = self.db.get(models.Workspace, team).storage_user_id
        job = models.PublishingJob(post_id=post['id'], user_id=owner, provider='facebook', content='Private copy',
            scheduled_at=now, run_at=now, timezone_name='UTC', status='published')
        self.db.add(job)
        self.db.flush()
        self.db.add(models.EngagementSnapshot(job_id=job.id, user_id=owner, provider='facebook', likes=999))
        self.db.commit()
        for path in ['/posts', '/approvals', '/queue', '/engagement']:
            code, result = self.request('GET', path, self.user, workspace=team)
            self.assertEqual(code, 200, result)
            self.assertNotIn('Private copy', str(result))
            self.assertNotIn('Secret title', str(result))
        for path in [f"/posts/{post['id']}", f"/posts/{post['id']}/reviews", f'/queue/{job.id}/logs']:
            self.assertEqual(self.request('GET', path, self.user, workspace=team)[0], 404)
        for path in ['/analytics/summary', '/reports/performance', '/reports/campaigns']:
            code, result = self.request('GET', path, self.user, workspace=team)
            self.assertEqual(code, 200, result)
            self.assertNotIn('999', str(result))
            self.assertNotIn('Secret campaign', str(result))
        for kind in ['campaigns', 'engagement', 'performance']:
            code, data = self.request('GET', f'/reports/export/{kind}', self.user,
                                      query='format=xlsx', workspace=team, raw=True)
            self.assertEqual(code, 200)
            book = load_workbook(BytesIO(data))
            values = str([list(sheet.values) for sheet in book])
            self.assertNotIn('Secret', values)
            self.assertNotIn('999', values)
        self.assertEqual(self.request('POST', '/posts', self.user,
            {'title': 'Sneak in', 'campaign_id': campaign}, workspace=team)[0], 404)

    def test_notification_creation_inbox_and_delivery_recheck_visibility(self):
        team = self.team()
        self.join(team, role='business_user')
        campaign = self.campaign(team, shared_with_team=True)
        self.db.add(models.NotificationPreference(user_id=self.user.id, email=True))
        self.db.commit()
        owner = self.db.get(models.Workspace, team).storage_user_id
        notifications.notify_scope(self.db, owner, 'campaign', 'Shared update', campaign_id=campaign)
        self.db.commit()
        self.assertTrue(self.request('GET', '/notifications', self.user)[1])
        self.request('PATCH', f'/campaigns/{campaign}', self.admin, {'shared_with_team': False}, workspace=team)
        self.assertNotIn('Shared update', str(self.request('GET', '/notifications', self.user)[1]))
        notifications.notify_scope(self.db, owner, 'campaign', 'Private update', campaign_id=campaign)
        self.db.commit()
        self.assertEqual(self.db.query(models.Notification).filter_by(user_id=self.user.id, title='Private update').count(), 0)
        sender = Mock()
        with patch('notifications.email_ready', return_value=True):
            notifications.deliver_batch(sessionmaker(bind=self.engine), email_sender=sender)
        sender.assert_not_called()
