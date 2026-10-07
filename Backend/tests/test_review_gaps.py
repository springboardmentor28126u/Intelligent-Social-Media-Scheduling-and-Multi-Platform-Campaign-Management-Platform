import unittest
from datetime import datetime, timedelta, timezone
import models
import test_roles_api
from seed_team_demo import seed


class ReviewGapTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def invite(self, email='future@example.com'):
        self.admin.role = 'content_creator'
        self.db.commit()
        code, team = self.request('POST', '/teams', self.admin, {'name': 'Test'})
        self.assertEqual(code, 201)
        self.assertEqual(self.request('POST', f"/teams/{team['id']}/invitations", self.admin, {'email': email})[0], 201)
        return team['id']

    def register(self):
        return self.request('POST', '/register', body={'name': 'Future', 'email': 'FUTURE@example.com', 'password': 'test-password-long'})

    def test_unregistered_invitation_attaches_without_auto_join(self):
        team = self.invite()
        code, user = self.register()
        self.assertEqual(code, 201)
        person = self.db.get(models.User, user['id'])
        self.assertEqual(self.request('GET', '/teams', person)[1][0]['status'], 'invited')
        self.assertEqual(self.request('GET', '/posts', person, workspace=team)[0], 403)
        self.assertEqual(self.request('POST', f'/teams/{team}/accept', person)[0], 200)
        self.assertEqual(self.request('GET', '/posts', person, workspace=team)[0], 200)

    def test_expired_invitation_does_not_attach_at_registration(self):
        self.invite()
        self.db.query(models.TeamInvitation).first().expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        _, user = self.register()
        self.assertEqual(self.db.query(models.Membership).filter_by(user_id=user['id']).count(), 0)

    def test_registered_expiry_duplicate_and_reinvite(self):
        team = self.invite(self.user.email)
        self.assertEqual(self.request('POST', f'/teams/{team}/invitations', self.admin, {'email': self.user.email})[0], 409)
        self.db.query(models.TeamInvitation).first().expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        self.assertEqual(self.request('POST', f'/teams/{team}/accept', self.user)[0], 410)
        self.assertEqual(self.request('POST', f'/teams/{team}/invitations', self.admin, {'email': self.user.email})[0], 201)
        self.assertEqual(self.request('POST', f'/teams/{team}/accept', self.user)[0], 200)

    def test_invite_listing_is_admin_only_and_decline_stays_revoked(self):
        team = self.invite(self.user.email)
        self.assertEqual(self.request('GET', f'/teams/{team}/invitations', self.user)[0], 403)
        self.assertEqual(self.request('DELETE', f'/teams/{team}/members/{self.user.id}', self.user)[0], 200)
        from teams import attach_invitations
        attach_invitations(self.db, self.user)
        self.assertEqual(self.db.query(models.Membership).filter_by(user_id=self.user.id).count(), 0)

    def test_seed_is_idempotent_and_never_schedules(self):
        first = seed(self.db, 'Synthetic-demo-password')
        second = seed(self.db, 'Synthetic-demo-password')
        self.assertEqual(first.id, second.id)
        self.assertEqual(self.db.query(models.Membership).filter_by(workspace_id=first.id).count(), 3)
        self.assertEqual({p.approval_status for p in self.db.query(models.Post).all()}, {'draft', 'pending', 'awaiting_creator', 'approved', 'rejected'})
        self.assertEqual(self.db.query(models.PublishingJob).count(), 0)
