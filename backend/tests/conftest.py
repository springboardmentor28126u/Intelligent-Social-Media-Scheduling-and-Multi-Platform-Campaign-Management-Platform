import os
import sys
from urllib.parse import quote
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock, patch

# Ensure backend folder is on sys.path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import models
import auth
from database import Base, get_db
from main import app
import tasks

# Test database connection configuration
TEST_DB_PASSWORD = quote("Prabhav@1972", safe="")
TEST_DATABASE_URL = f"postgresql://postgres:{TEST_DB_PASSWORD}@localhost:5432/socialpilot_test"

test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure tables are created in the test database initially."""
    Base.metadata.create_all(bind=test_engine)
    yield
    # We do not drop the test database itself, just teardown
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(autouse=True)
def clean_db():
    """Drop and recreate all tables before each test for complete isolation."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield

@pytest.fixture
def db():
    """Yields a database session bound to the test database."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(autouse=True)
def override_db_dependency(monkeypatch):
    """Override get_db dependency in FastAPI app and tasks.SessionLocal."""
    def _override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    monkeypatch.setattr(tasks, "SessionLocal", TestingSessionLocal)
    yield
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def mock_all_publishers(monkeypatch):
    """Mock every external API function in publishers.py and video_utils.py."""
    import publishers
    import video_utils

    # LinkedIn
    monkeypatch.setattr(publishers, "publish_linkedin", MagicMock(return_value=(True, "urn:li:share:test12345")))
    monkeypatch.setattr(publishers, "get_linkedin_post_stats", MagicMock(return_value=(True, {"likes": 10, "comments": 2})))

    # YouTube
    monkeypatch.setattr(publishers, "publish_youtube", MagicMock(return_value=(True, "yt_video_id_12345")))
    monkeypatch.setattr(publishers, "get_youtube_video_stats", MagicMock(return_value=(True, {"views": 100, "likes": 20, "comments": 5})))
    monkeypatch.setattr(publishers, "refresh_youtube_token", MagicMock(return_value="mock_yt_access_token"))
    monkeypatch.setattr(publishers, "get_valid_youtube_token", MagicMock(return_value="mock_yt_access_token"))

    # Instagram
    monkeypatch.setattr(publishers, "publish_instagram", MagicMock(return_value=(True, "ig_media_id_12345")))
    monkeypatch.setattr(publishers, "get_instagram_post_insights", MagicMock(return_value=(True, {"reach": 500, "likes": 50, "comments": 12, "shares": 5, "saved": 3})))
    monkeypatch.setattr(publishers, "refresh_instagram_token", MagicMock(return_value="mock_ig_access_token"))
    monkeypatch.setattr(publishers, "get_valid_instagram_token", MagicMock(return_value="mock_ig_access_token"))

    # Facebook
    monkeypatch.setattr(publishers, "publish_facebook", MagicMock(return_value=(True, "fb_post_id_12345")))
    monkeypatch.setattr(publishers, "get_facebook_post_stats", MagicMock(return_value=(True, {"likes": 30, "comments": 4, "shares": 6})))

    # X (Twitter)
    monkeypatch.setattr(publishers, "refresh_x_token", MagicMock(return_value="mock_x_access_token"))
    monkeypatch.setattr(publishers, "get_valid_x_token", MagicMock(return_value="mock_x_access_token"))

    # Video inspection
    monkeypatch.setattr(video_utils, "validate_youtube_short", MagicMock(return_value=(True, "Eligible short video")))
    monkeypatch.setattr(video_utils, "get_video_info", MagicMock(return_value=(30, 1080, 1920)))

    # Prevent background Celery execution during standard HTTP requests
    monkeypatch.setattr(tasks.publish_post, "delay", MagicMock(return_value=None))
    monkeypatch.setattr(tasks.check_scheduled_posts, "delay", MagicMock(return_value=None))

@pytest.fixture
def client():
    """FastAPI TestClient using the test database and mocked publishers."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def test_user(db):
    """Creates a regular Content Creator test user in the test database."""
    user = models.User(
        name="Test User",
        email="test@example.com",
        password_hash=auth.hash_password("password123"),
        role="Content Creator",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_user_b(db):
    """Creates a second regular test user for isolation testing."""
    user = models.User(
        name="User B",
        email="user_b@example.com",
        password_hash=auth.hash_password("password123"),
        role="Content Creator",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def admin_user(db):
    """Creates an Administrator directly in the test database."""
    user = models.User(
        name="Admin User",
        email="admin@example.com",
        password_hash=auth.hash_password("adminpass123"),
        role="Administrator",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    """Bearer authorization headers for test_user."""
    token = auth.create_access_token({"sub": test_user.email, "role": test_user.role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_b(test_user_b):
    """Bearer authorization headers for test_user_b."""
    token = auth.create_access_token({"sub": test_user_b.email, "role": test_user_b.role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_auth_headers(admin_user):
    """Bearer authorization headers for admin_user."""
    token = auth.create_access_token({"sub": admin_user.email, "role": admin_user.role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def social_account(db, test_user):
    """Creates a connected LinkedIn social account for test_user."""
    account = models.SocialAccount(
        user_id=test_user.id,
        platform="linkedin",
        account_name="Test LinkedIn Account",
        access_token="mock_li_token",
        platform_user_id="test_li_person_123",
        status="connected",
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
