import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from sqlalchemy.orm import sessionmaker
import models
import test_collaboration
from publishing_worker import run_due


class CreatorApprovalTests(unittest.TestCase):
    setUp = test_collaboration.CollaborationTests.setUp
    tearDown = test_collaboration.CollaborationTests.tearDown
    request = test_collaboration.CollaborationTests.request
    team = test_collaboration.CollaborationTests.team
    join = test_collaboration.CollaborationTests.join
    draft = test_collaboration.CollaborationTests.draft
    review = test_collaboration.CollaborationTests.review

    def account(self, team):
        owner = self.db.get(models.Workspace, team).storage_user_id
        account = models.SocialAccount(user_id=owner, platform='facebook', account_name='Test', connected=True)
        self.db.add(account)
        self.db.flush()
        self.db.add(models.SocialCredential(user_id=owner, account_id=account.id, provider='facebook', external_id='test', encrypted_token='unused'))
        self.db.commit()
        return account

    def schedule(self, team, post, account, actor=None):
        return self.request('POST', f'/posts/{post}/schedule', actor or self.admin, {
            'scheduled_at': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            'account_ids': [account.id]}, workspace=team)

    def test_creator_direct_schedule_and_publish_with_required_approval(self):
        team = self.team(True)
        self.join(team)
        post = self.draft(team)['id']
        code, jobs = self.schedule(team, post, self.account(team), self.user)
        self.assertEqual(code, 201, jobs)
        job = self.db.get(models.PublishingJob, jobs[0]['id'])
        job.run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        publisher = Mock(return_value='fake-provider-id')
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        publisher.assert_called_once()

    def test_two_steps_notifications_history_and_edit_invalidation(self):
        team = self.team(False)
        self.join(team, role='marketing_manager')
        post = self.draft(team)['id']
        account = self.account(team)
        self.assertEqual(self.schedule(team, post, account)[0], 409)
        self.assertEqual(self.review(team, post, 'approve')[1]['approval_status'], 'awaiting_creator')
        self.assertEqual(self.schedule(team, post, account)[0], 409)
        self.assertTrue(self.db.query(models.Notification).filter_by(user_id=self.admin.id, post_id=post).count())
        self.assertEqual(self.review(team, post, 'reject', self.admin)[0], 422)
        self.assertEqual(self.review(team, post, 'reject', self.admin, comment='Revise the copy')[0], 200)
        self.assertTrue(self.db.query(models.Notification).filter_by(user_id=self.user.id, body='Revise the copy').count())
        self.review(team, post, 'approve')
        self.assertEqual(self.review(team, post, 'approve', self.admin)[0], 200)
        history = self.request('GET', f'/posts/{post}/reviews', self.user, workspace=team)[1]
        self.assertEqual([e['action'] for e in history], ['manager_approve', 'creator_reject', 'manager_approve', 'creator_approve'])
        changed = self.request('PATCH', f'/posts/{post}', self.user, {'content': 'New revision'}, workspace=team)[1]
        self.assertEqual((changed['revision'], changed['approval_status']), (2, 'draft'))
        self.assertEqual(self.schedule(team, post, account)[0], 409)

    def test_worker_rejects_manager_only_or_forged_or_stale_approval(self):
        team = self.team(False)
        self.join(team, role='marketing_manager')
        account = self.account(team)
        for state in ['awaiting_creator', 'approved']:
            post_id = self.draft(team)['id']
            self.review(team, post_id, 'approve')
            post = self.db.get(models.Post, post_id)
            post.approval_status = state
            post.status = 'scheduled'
            now = datetime.now(timezone.utc) - timedelta(seconds=1)
            self.db.add(models.PublishingJob(post_id=post_id, user_id=post.user_id, account_id=account.id,
                provider='facebook', content=post.content, scheduled_at=now, run_at=now, timezone_name='UTC'))
            self.db.commit()
        publisher = Mock()
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        publisher.assert_not_called()
        self.db.expire_all()
        self.assertEqual({j.status for j in self.db.query(models.PublishingJob)}, {'failed'})

    def test_creator_edit_removes_old_manager_revision_and_manager_edit_removes_direct_privilege(self):
        team = self.team(True)
        self.join(team, role='marketing_manager')
        post = self.draft(team, self.admin)['id']
        self.request('PATCH', f'/posts/{post}', self.user, {'content': 'Manager edit'}, workspace=team)
        account = self.account(team)
        self.assertEqual(self.schedule(team, post, account)[0], 409)
        self.request('PATCH', f'/posts/{post}', self.admin, {'content': 'Creator revision'}, workspace=team)
        self.assertEqual(self.schedule(team, post, account)[0], 201)

    def test_promoting_manager_does_not_approve_their_old_revision(self):
        team = self.team(False)
        self.join(team, role='marketing_manager')
        post = self.draft(team)['id']
        account = self.account(team)
        self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.admin, {'role': 'content_creator'})
        self.assertEqual(self.schedule(team, post, account, self.user)[0], 409)
        self.assertEqual(self.db.get(models.Post, post).creator_role, 'marketing_manager')

    def test_campaign_edit_invalidates_review_and_revision(self):
        team = self.team()
        self.join(team, role='marketing_manager')
        post = self.draft(team)['id']
        self.review(team, post, 'approve')
        self.review(team, post, 'approve', self.admin)
        today = datetime.now(timezone.utc).date().isoformat()
        _, campaign = self.request('POST', '/campaigns', self.user,
            {'name': 'New grouping', 'start_date': today, 'end_date': today}, workspace=team)
        code, changed = self.request('PATCH', f'/posts/{post}/campaign', self.user,
                                    {'campaign_id': campaign['id']}, workspace=team)
        self.assertEqual(code, 200)
        self.assertEqual((changed['revision'], changed['approval_status']), (2, 'draft'))
        self.assertEqual(self.schedule(team, post, self.account(team))[0], 409)

    def test_stale_creator_event_and_demoted_reviewer_do_not_authorize_publication(self):
        from approvals import require_approved
        from fastapi import HTTPException
        team = self.team()
        self.join(team, role='marketing_manager')
        post_id = self.draft(team)['id']
        self.review(team, post_id, 'approve')
        self.review(team, post_id, 'approve', self.admin)
        post = self.db.get(models.Post, post_id)
        require_approved(self.db, post)
        post.revision += 1
        self.db.commit()
        with self.assertRaises(HTTPException):
            require_approved(self.db, post)
        post.revision -= 1
        self.db.commit()
        self.request('PATCH', f'/teams/{team}/members/{self.admin.id}', self.admin, {'role': 'administrator'})
        with self.assertRaises(HTTPException):
            require_approved(self.db, post)
