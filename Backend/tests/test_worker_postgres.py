"""Opt-in PostgreSQL locking tests; all records live in a disposable schema."""
import os
import threading
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

import main
import models
import publishing_worker
from database import Base, DATABASE_URL, get_db
import test_scheduling


@unittest.skipUnless(os.getenv("SOCIALPILOT_TEST_POSTGRES") == "1", "Requires opt-in PostgreSQL test schema")
class PostgresWorkerTests(unittest.TestCase):
    request = test_scheduling.SchedulingTests.request
    account = test_scheduling.SchedulingTests.account
    draft = test_scheduling.SchedulingTests.draft
    schedule = test_scheduling.SchedulingTests.schedule
    make_due = test_scheduling.SchedulingTests.make_due

    def setUp(self):
        self.schema = "test_worker_" + uuid.uuid4().hex
        self.control = create_engine(DATABASE_URL)
        with self.control.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{self.schema}"'))
        self.addCleanup(self.drop_schema)
        self.engine = create_engine(DATABASE_URL, connect_args={
            "options": f"-csearch_path={self.schema} -clock_timeout=5000 -cstatement_timeout=10000"
        })
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.db.close)
        self.user = models.User(name="Test", email="worker@example.com", password_hash="unused", role="user")
        self.db.add(self.user)
        self.db.commit()
        main.app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(main.app.dependency_overrides.clear)

    def drop_schema(self):
        # The identifier is generated here, never supplied from configuration.
        with self.control.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{self.schema}" CASCADE'))
        self.control.dispose()

    def test_locked_first_post_does_not_starve_other_posts(self):
        account = self.account()
        post_ids = [self.draft(), self.draft()]
        job_ids = []
        for post_id in post_ids:
            _, jobs = self.schedule(post_id, [account.id])
            job_ids.append(jobs[0]["id"])
            self.make_due(job_ids[-1])
        self.db.rollback()
        with Session(self.engine) as locking:
            locking.query(models.Post).filter_by(id=post_ids[0]).with_for_update().one()
            calls = []
            def publish(db, job, credential):
                calls.append(job.id)
                return "remote"
            count = publishing_worker.run_due(session_factory=sessionmaker(bind=self.engine), publisher=publish, batch_size=1)
            self.assertEqual(count, 1)
            self.assertEqual(calls, [job_ids[1]])
        self.db.expire_all()
        self.assertEqual(self.db.get(models.PublishingJob, job_ids[0]).status, "scheduled")

    def test_two_workers_publish_siblings_once_and_aggregate_results(self):
        accounts = [self.account(), self.account("x")]
        post_id = self.draft()
        _, jobs = self.schedule(post_id, [account.id for account in accounts])
        job_ids = [job["id"] for job in jobs]
        for job_id in job_ids:
            self.make_due(job_id)
        self.db.rollback()
        barrier = threading.Barrier(2, timeout=10)
        calls = []
        def publish(db, job, credential):
            calls.append(job.id)
            barrier.wait()
            return f"remote-{job.id}"
        def run():
            return publishing_worker.run_due(session_factory=sessionmaker(bind=self.engine), publisher=publish, batch_size=1)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(run) for _ in range(2)]
            self.assertEqual([future.result(timeout=20) for future in futures], [1, 1])
        self.assertCountEqual(calls, job_ids)
        self.db.expire_all()
        self.assertEqual(self.db.get(models.Post, post_id).status, "published")
        self.assertTrue(all(self.db.get(models.PublishingJob, job_id).status == "published" for job_id in job_ids))

