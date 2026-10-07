"""Opt-in migration checks in a disposable PostgreSQL schema, never user tables."""
import os
import unittest
import uuid
from pathlib import Path
from sqlalchemy import create_engine, text
from alembic import command
from alembic.config import Config
import database


@unittest.skipUnless(os.getenv('SOCIALPILOT_TEST_POSTGRES') == '1', 'Requires opt-in PostgreSQL test schema')
class CollaborationMigrationTests(unittest.TestCase):
    def test_upgrade_preserves_existing_data_and_schema_roundtrip(self):
        schema = 'test_collaboration_' + uuid.uuid4().hex
        control = create_engine(database.DATABASE_URL)
        original = database.engine
        engine = None
        try:
            with control.begin() as db:
                db.execute(text(f'CREATE SCHEMA "{schema}"'))
            engine = create_engine(database.DATABASE_URL, connect_args={'options': f'-csearch_path={schema}'})
            database.engine = engine
            config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
            config.set_main_option('script_location', str(Path(__file__).resolve().parents[1] / 'alembic'))
            command.upgrade(config, 'a21c4e810007')
            with engine.begin() as db:
                db.execute(text("INSERT INTO users (id, name, email, password_hash, role) VALUES (1, 'Existing', 'existing@example.com', 'hash', 'user')"))
                db.execute(text("INSERT INTO posts (id, user_id, title, content, status, created_at, updated_at) VALUES (1, 1, 'Keep me', 'Original', 'draft', now(), now())"))
            command.upgrade(config, 'a21c4e810010')
            with engine.begin() as db:
                db.execute(text("INSERT INTO users (id, name, email, password_hash, role, is_workspace) VALUES (2, 'Team', 'team@example.com', 'hash', 'content_creator', true), (3, 'Creator', 'author@example.com', 'hash', 'content_creator', false)"))
                db.execute(text("INSERT INTO workspaces (id, name, owner_id, storage_user_id, require_approval) VALUES (1, 'Existing team', 1, 2, true)"))
                db.execute(text("INSERT INTO memberships (workspace_id, user_id, role, status) VALUES (1, 1, 'administrator', 'active'), (1, 3, 'content_creator', 'active')"))
                db.execute(text("INSERT INTO campaigns (id, user_id, name, description, objective, platforms, start_date, end_date, budget, revenue, currency, target_engagements, target_posts, status, created_at, updated_at) VALUES (1, 2, 'Preserved campaign', '', 'engagement', '', current_date, current_date, 100, 200, 'INR', 0, 0, 'active', now(), now())"))
            command.upgrade(config, 'head')
            with engine.connect() as db:
                row = db.execute(text('SELECT title, creator_id, approval_status, revision FROM posts WHERE id=1')).one()
                self.assertEqual(tuple(row), ('Keep me', 1, 'draft', 1))
            for roundtrip in range(2):
                with engine.connect() as db:
                    row = db.execute(text('SELECT name, creator_id, shared_with_team, budget, revenue FROM campaigns WHERE id=1')).one()
                    self.assertEqual(tuple(row), ('Preserved campaign', 1, False, 100, 200))
                    self.assertEqual(db.execute(text('SELECT campaign_id, user_id FROM campaign_assignments')).all(), [(1, 3)])
                if roundtrip == 0:
                    command.downgrade(config, 'a21c4e810010')
                    command.upgrade(config, 'head')
            command.check(config)
            with self.assertRaisesRegex(RuntimeError, 'Export and resolve workspace data'):
                command.downgrade(config, 'a21c4e810007')
            command.upgrade(config, 'head')
        finally:
            database.engine = original
            if engine is not None:
                engine.dispose()
            with control.begin() as db:
                db.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
            control.dispose()
