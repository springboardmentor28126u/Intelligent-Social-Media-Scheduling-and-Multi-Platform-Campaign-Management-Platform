import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from sqlalchemy.orm import sessionmaker
import models
import test_creator_approval
from publishing_worker import run_due


class CreatorOnlyTests(unittest.TestCase):
    setUp = test_creator_approval.CreatorApprovalTests.setUp
    tearDown = test_creator_approval.CreatorApprovalTests.tearDown
    request = test_creator_approval.CreatorApprovalTests.request
    team = test_creator_approval.CreatorApprovalTests.team
    join = test_creator_approval.CreatorApprovalTests.join
    draft = test_creator_approval.CreatorApprovalTests.draft
    account = test_creator_approval.CreatorApprovalTests.account
    schedule = test_creator_approval.CreatorApprovalTests.schedule

    def test_admin_and_manager_cannot_connect_schedule_retry_or_run(self):
        team = self.team()
        self.join(team, role='administrator')
        for role in ['administrator', 'marketing_manager', 'business_user']:
            self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.admin, {'role': role})
            routes = [('/accounts', {'platform': 'Facebook', 'account_name': 'Denied'}),
                ('/posts/999/schedule', {'scheduled_at': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), 'account_ids': [1]}),
                ('/posts/999/publish', {'account_ids': [1]}), ('/queue/999/retry', None), ('/queue/run', None)]
            routes += [(f'/oauth/{provider}/authorize', None) for provider in ['facebook', 'instagram', 'youtube', 'x', 'linkedin']]
            for path, body in routes:
                with self.subTest(role=role, path=path):
                    self.assertEqual(self.request('POST', path, self.user, body, workspace=team)[0], 403)
        self.admin.role = 'administrator'
        self.db.commit()
        self.assertEqual(self.request('POST', '/queue/run', self.admin)[0], 403)

    def test_owner_creator_manages_and_publishes_then_admin_manages_only(self):
        code, team = self.request('POST', '/teams', self.user, {'name': 'Creator-owned'})
        self.assertEqual(code, 201)
        team = team['id']
        state = self.request('GET', '/teams', self.user)[1][0]
        self.assertEqual(state['role'], 'content_creator')
        self.assertTrue(state['can_manage'])
        self.assertEqual(self.request('PATCH', f'/teams/{team}', self.user, {'name': 'Renamed'})[0], 200)
        post = self.draft(team)['id']
        self.assertEqual(self.schedule(team, post, self.account(team), self.user)[0], 201)
        self.assertEqual(self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.user, {'role': 'administrator'})[0], 200)
        self.assertEqual(self.request('PATCH', f'/teams/{team}', self.user, {'name': 'Still managed'})[0], 200)
        self.assertEqual(self.request('POST', '/queue/run', self.user, workspace=team)[0], 403)
        self.assertEqual(self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.user, {'is_admin': False})[0], 409)
        self.assertEqual(self.request('DELETE', f'/teams/{team}/members/{self.user.id}', self.user)[0], 409)

    def test_demoted_scheduling_actor_fails_even_when_another_creator_authored_post(self):
        team = self.team(False)
        self.join(team)
        post = self.draft(team, self.admin)['id']
        code, jobs = self.schedule(team, post, self.account(team), self.user)
        self.assertEqual(code, 201)
        self.assertEqual(self.db.get(models.PublishingJob, jobs[0]['id']).publisher_id, self.user.id)
        self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.admin, {'role': 'administrator'})
        job = self.db.get(models.PublishingJob, jobs[0]['id'])
        job.run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        publisher = Mock()
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        publisher.assert_not_called()
        self.db.expire_all()
        job = self.db.get(models.PublishingJob, jobs[0]['id'])
        self.assertEqual(job.status, 'failed')
        self.assertIn('no longer a content creator', job.error)

    def test_delegated_management_flag_does_not_grant_publishing(self):
        team = self.team()
        self.join(team, role='marketing_manager')
        self.assertEqual(self.request('PATCH', f'/teams/{team}/members/{self.user.id}', self.admin, {'is_admin': True})[0], 200)
        self.assertEqual(self.request('PATCH', f'/teams/{team}', self.user, {'name': 'Delegated'})[0], 200)
        self.assertEqual(self.request('POST', '/queue/run', self.user, workspace=team)[0], 403)

    def test_publish_now_is_due_immediately_and_uses_creator_actor(self):
        team = self.team(True)
        self.join(team)
        account = self.account(team)
        post = self.draft(team)['id']
        for ids in [[account.id, account.id], [0]]:
            self.assertEqual(self.request('POST', f'/posts/{post}/publish', self.user,
                                         {'account_ids': ids}, workspace=team)[0], 422)
        code, jobs = self.request('POST', f'/posts/{post}/publish', self.user,
                                 {'account_ids': [account.id]}, workspace=team)
        self.assertEqual(code, 201, jobs)
        self.assertLessEqual(datetime.fromisoformat(jobs[0]['run_at']), datetime.now(timezone.utc))
        publisher = Mock(return_value='mock-published-id')
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        publisher.assert_called_once()

    def test_personal_demoted_creator_job_fails(self):
        post = models.Post(user_id=self.user.id, creator_id=self.user.id, title='Personal', content='Text', status='scheduled')
        self.db.add(post)
        self.db.flush()
        now = datetime.now(timezone.utc) - timedelta(seconds=1)
        job = models.PublishingJob(post_id=post.id, user_id=self.user.id, publisher_id=self.user.id,
            provider='facebook', content='Text', scheduled_at=now, run_at=now, timezone_name='UTC')
        self.db.add(job)
        self.user.role = 'administrator'
        self.db.commit()
        publisher = Mock()
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        publisher.assert_not_called()
        self.db.expire_all()
        self.assertEqual(self.db.get(models.PublishingJob, job.id).status, 'failed')
        self.assertIn('no longer a content creator', self.db.get(models.PublishingJob, job.id).error)
