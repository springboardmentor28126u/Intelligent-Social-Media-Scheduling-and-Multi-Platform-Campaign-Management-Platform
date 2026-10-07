"""Real migration and API/worker checks against disposable PostgreSQL schemas."""
import os
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
import database
import main
import models
import test_roles_api
from approvals import require_approved
from publishing_worker import run_due


@unittest.skipUnless(os.getenv('SOCIALPILOT_TEST_POSTGRES') == '1', 'Requires disposable PostgreSQL schema')
class PersonalAuthorMigrationTests(unittest.TestCase):
    request = test_roles_api.RoleApiTests.request

    def setUp(self):
        schema = 'test_personal_author_' + uuid.uuid4().hex
        self.control = create_engine(database.DATABASE_URL)
        self.addCleanup(self.control.dispose)
        with self.control.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        def drop_schema():
            with self.control.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        self.addCleanup(drop_schema)
        self.engine = create_engine(database.DATABASE_URL, connect_args={'options': f'-csearch_path={schema}'})
        self.addCleanup(self.engine.dispose)
        original = database.engine
        database.engine = self.engine
        self.addCleanup(setattr, database, 'engine', original)
        self.config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
        self.config.set_main_option('script_location', str(Path(__file__).resolve().parents[1] / 'alembic'))
        command.upgrade(self.config, 'a21c4e810013')
        self.db = Session(self.engine)
        self.addCleanup(self.db.close)
        self.users = {}
        self.posts = {}
        for role in ['content_creator', 'user', 'marketing_manager', 'admin', 'administrator', 'business_user', 'unknown']:
            owner = models.User(name=role, email=f'{role}@example.com', password_hash='unused', role=role, is_workspace=False)
            self.db.add(owner)
            self.db.flush()
            post = models.Post(user_id=owner.id, creator_id=None, creator_role=None,
                               title=f'Existing {role}', content='Existing copy', status='draft')
            self.db.add(post)
            self.db.flush()
            self.users[role], self.posts[role] = owner.id, post.id
        self.owner_id = self.users['content_creator']
        account = models.SocialAccount(user_id=self.owner_id, platform='facebook', account_name='Fixture page', connected=True)
        self.db.add(account)
        self.db.flush()
        self.account_id = account.id
        self.db.add(models.SocialCredential(user_id=self.owner_id, account_id=account.id,
            provider='facebook', external_id='fixture', encrypted_token='never-decrypted-by-mock'))
        queued = models.Post(user_id=self.owner_id, creator_id=None, creator_role=None,
            title='Previously scheduled', content='Existing queued copy', status='scheduled')
        principal = models.User(name='Workspace', email='principal@workspace.invalid', password_hash='unused',
                                role='content_creator', is_workspace=True)
        self.db.add_all([queued, principal])
        self.db.flush()
        now = datetime.now(timezone.utc) - timedelta(minutes=1)
        job = models.PublishingJob(post_id=queued.id, user_id=self.owner_id, publisher_id=self.owner_id,
            account_id=account.id, provider='facebook', content=queued.content, scheduled_at=now, run_at=now, timezone_name='UTC')
        team = models.Workspace(name='Existing team', owner_id=self.owner_id, storage_user_id=principal.id, require_approval=True)
        self.db.add_all([job, team])
        self.db.flush()
        self.job_id = job.id
        self.team_id = team.id
        self.db.add(models.Membership(workspace_id=team.id, user_id=self.owner_id, role='content_creator', status='active'))
        team_post = models.Post(user_id=principal.id, creator_id=None, creator_role=None,
                                title='Historical team draft', content='Team copy', status='draft')
        known = models.Post(user_id=self.owner_id, creator_id=self.users['marketing_manager'], creator_role='marketing_manager',
                            title='Known revision role', content='Preserve known authorship', status='draft')
        self.db.add_all([team_post, known])
        self.db.commit()
        self.team_post_id, self.known_id = team_post.id, known.id
        self.db.rollback()
        # This fixture exists at 013, before applying the repair; no create_all.
        with self.engine.connect() as connection:
            self.assertIsNone(connection.execute(text('SELECT creator_role FROM posts WHERE id=:id'),
                                                 {'id': self.posts['content_creator']}).scalar())
        command.upgrade(self.config, 'a21c4e810014')
        self.db.expire_all()
        main.app.dependency_overrides[database.get_db] = lambda: self.db
        self.addCleanup(main.app.dependency_overrides.clear)

    def test_existing_creator_draft_schedules_and_publishes(self):
        owner = self.db.get(models.User, self.owner_id)
        post_id = self.posts['content_creator']
        code, jobs = self.request('POST', f'/posts/{post_id}/schedule', owner, {
            'scheduled_at': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), 'account_ids': [self.account_id]})
        self.assertEqual(code, 201, jobs)
        self.db.get(models.PublishingJob, jobs[0]['id']).run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        publisher = Mock(return_value='mock-confirmed')
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        self.db.expire_all()
        self.assertEqual(self.db.get(models.Post, post_id).status, 'published')
        self.assertEqual(self.db.get(models.PublishingJob, jobs[0]['id']).status, 'published')
        self.assertEqual(publisher.call_count, 2)

    def test_preexisting_queued_personal_job_publishes(self):
        publisher = Mock(return_value='mock-confirmed')
        run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        publisher.assert_called_once()
        self.db.expire_all()
        self.assertEqual(self.db.get(models.PublishingJob, self.job_id).status, 'published')

    def test_roles_normalized_and_manager_never_creator_authored(self):
        from roles import normalize_role
        for role, post_id in self.posts.items():
            post = self.db.get(models.Post, post_id)
            normalized = normalize_role(role)
            self.assertEqual(post.creator_role, normalized.value if normalized else None)
            self.assertEqual(post.creator_id, self.users[role])
            if post.creator_role == 'content_creator':
                require_approved(self.db, post)
            else:
                with self.assertRaises(HTTPException):
                    require_approved(self.db, post)
        known = self.db.get(models.Post, self.known_id)
        self.assertEqual((known.creator_id, known.creator_role), (self.users['marketing_manager'], 'marketing_manager'))

    def test_team_posts_untouched_and_need_creator_final_approval(self):
        post = self.db.get(models.Post, self.team_post_id)
        self.assertIsNone(post.creator_id)
        self.assertIsNone(post.creator_role)
        with self.assertRaises(HTTPException):
            require_approved(self.db, post)
        post.approval_status = 'approved'
        with self.assertRaises(HTTPException):
            require_approved(self.db, post)
        self.db.add(models.ApprovalEvent(post_id=post.id, actor_id=self.owner_id, revision=post.revision,
                                        action='creator_approve', comment='Reviewed historical revision'))
        self.db.commit()
        require_approved(self.db, post)

    def test_data_retaining_downgrade_upgrade_and_schema_drift(self):
        self.db.rollback()
        with self.engine.connect() as connection:
            before = connection.execute(text('SELECT id, creator_id, creator_role, title, content, status, revision FROM posts ORDER BY id')).all()
        command.downgrade(self.config, 'a21c4e810013')
        with self.engine.connect() as connection:
            self.assertEqual(connection.execute(text('SELECT id, creator_id, creator_role, title, content, status, revision FROM posts ORDER BY id')).all(), before)
        command.upgrade(self.config, 'head')
        command.check(self.config)
        with self.engine.connect() as connection:
            self.assertEqual(connection.execute(text('SELECT id, creator_id, creator_role, title, content, status, revision FROM posts ORDER BY id')).all(), before)
            self.assertEqual(connection.execute(text('SELECT version_num FROM alembic_version')).scalars().all(), ['a21c4e810014'])
