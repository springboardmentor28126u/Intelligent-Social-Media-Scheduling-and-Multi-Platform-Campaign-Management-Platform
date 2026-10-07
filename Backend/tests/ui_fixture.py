"""Local browser-test server: isolated in-memory records; no real publication.

Run from Backend: python tests/ui_fixture.py. Stop with Ctrl+C.
"""
import sys
import tempfile
import atexit
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uvicorn
import main
import models
from database import Base, get_db


def build_fixture():
    directory = tempfile.TemporaryDirectory(prefix='socialpilot-ui-')
    engine = create_engine('sqlite:///' + str(Path(directory.name) / 'test.sqlite'), connect_args={'check_same_thread': False})
    def cleanup():
        engine.dispose()
        directory.cleanup()
    atexit.register(cleanup)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        user = models.User(name='Browser Test', email='ui@example.com', role='content_creator', password_hash=main.password_hash.hash('Local-test-only-123!'))
        db.add(user)
        db.add(models.User(name='Review Manager', email='manager@example.com', role='marketing_manager', password_hash=main.password_hash.hash('Local-test-only-123!')))
        db.flush()
        for provider in ('instagram', 'facebook', 'linkedin', 'x'):
            account = models.SocialAccount(user_id=user.id, platform=provider.title(), account_name=f'TEST ONLY {provider}', connected=True)
            db.add(account)
            db.flush()
            db.add(models.SocialCredential(account_id=account.id, user_id=user.id, provider=provider, external_id='test', encrypted_token='not-a-real-token'))
        db.commit()
        from seed_team_demo import seed
        seed(db, "Local-test-only-123!")
    def test_db():
        with factory() as db:
            yield db
    main.app.dependency_overrides[get_db] = test_db
    # Even if called accidentally, the fixture must never run the real worker.
    import publishing_worker
    publishing_worker.run_due = lambda **kwargs: 0
    return main.app


if __name__ == '__main__':
    uvicorn.run(build_fixture(), host='127.0.0.1', port=8011, access_log=False)
