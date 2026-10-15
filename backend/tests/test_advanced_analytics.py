import csv
from datetime import datetime
from io import BytesIO, StringIO
from xml.etree import ElementTree
from zipfile import ZipFile

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_current_user
from app.database.postgres import Base
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.models.user import User
from app.routers import analytics


def _client_with_analytics_data():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()
    db.add_all([
        User(id=1, name="Test User", email="analytics@example.com", password="unused"),
        User(id=2, name="Other User", email="other@example.com", password="unused"),
        Campaign(id=10, user_id=1, name="Launch", status="Active"),
        SocialAccount(
            id=20,
            user_id=1,
            platform="Twitter",
            username="test-account",
        ),
    ])
    db.flush()
    db.add_all([
        Post(
            id=100,
            user_id=1,
            campaign_id=10,
            social_account_id=20,
            content="Published post",
            status="published",
            created_at=datetime(2026, 10, 8, 8),
            published_at=datetime(2026, 10, 8, 9),
        ),
        Post(
            id=101,
            user_id=1,
            campaign_id=10,
            social_account_id=20,
            content="Scheduled post",
            status="scheduled",
            created_at=datetime(2026, 10, 1, 8),
            scheduled_at=datetime(2026, 10, 9, 9),
        ),
        Post(
            id=102,
            user_id=1,
            campaign_id=10,
            social_account_id=20,
            content="Failed post",
            status="failed",
            created_at=datetime(2026, 10, 10, 8),
        ),
        Post(
            id=103,
            user_id=2,
            content="Another user's post",
            status="published",
            created_at=datetime(2026, 10, 8, 8),
            published_at=datetime(2026, 10, 8, 9),
        ),
    ])
    db.commit()

    app = FastAPI()
    app.include_router(analytics.router)
    app.dependency_overrides[get_current_user] = lambda: 1

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[analytics.get_db] = override_get_db
    return TestClient(app), db, engine


def test_advanced_analytics_counts_actual_user_posts_and_event_dates():
    client, db, engine = _client_with_analytics_data()
    try:
        response = client.get(
            "/analytics/advanced",
            params={"start_date": "2026-10-08", "end_date": "2026-10-10"},
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert response.status_code == 200
    data = response.json()
    assert data["summary"] == {
        "total_posts": 3,
        "published_posts": 1,
        "scheduled_posts": 1,
        "failed_posts": 1,
        "total_engagement": None,
        "engagement_available": False,
    }
    assert [point["total_posts"] for point in data["posts_over_time"]] == [1, 1, 1]
    assert data["engagement_over_time"]["available"] is False
    assert data["platform_performance"] == [{
        "platform": "X",
        "total_posts": 3,
        "published_posts": 1,
        "failed_posts": 1,
    }]
    assert data["campaign_performance"][0]["campaign_name"] == "Launch"
    assert data["campaign_performance"][0]["scheduled_posts"] == 1


def test_advanced_analytics_x_filter_and_invalid_range():
    client, db, engine = _client_with_analytics_data()
    try:
        filtered = client.get(
            "/analytics/advanced",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "platform": "X",
            },
        )
        invalid = client.get(
            "/analytics/advanced",
            params={"start_date": "2026-10-11", "end_date": "2026-10-10"},
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert filtered.status_code == 200
    assert filtered.json()["summary"]["total_posts"] == 3
    assert invalid.status_code == 422


def test_advanced_analytics_requires_jwt():
    app = FastAPI()
    app.include_router(analytics.router)

    with TestClient(app) as client:
        response = client.get("/analytics/advanced")

    assert response.status_code == 401


def test_advanced_analytics_uses_monthly_buckets_for_long_ranges():
    client, db, engine = _client_with_analytics_data()
    try:
        response = client.get(
            "/analytics/advanced",
            params={"start_date": "2024-01-01", "end_date": "2026-10-31"},
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert response.status_code == 200
    data = response.json()
    assert data["time_bucket"] == "month"
    assert len(data["posts_over_time"]) == 34
    assert sum(point["total_posts"] for point in data["posts_over_time"]) == 3


def test_existing_analytics_reports_unavailable_engagement_instead_of_estimates():
    client, db, engine = _client_with_analytics_data()
    try:
        response = client.get(
            "/analytics/overview",
            params={"start_date": "2026-10-08", "end_date": "2026-10-10"},
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert response.status_code == 200
    assert response.json()["engagement"] is None
    assert response.json()["reach"] is None


def test_engagement_reports_current_instagram_likes(monkeypatch):
    client, db, engine = _client_with_analytics_data()
    db.add(SocialAccount(
        id=21,
        user_id=1,
        platform="instagram",
        username="@test-account",
        access_token="instagram-test-token",
        channel_id="instagram-user",
    ))
    db.flush()
    db.add(Post(
        id=104,
        user_id=1,
        campaign_id=10,
        social_account_id=21,
        content="Instagram post",
        status="published",
        platform_post_id="instagram-media-1",
        created_at=datetime(2026, 10, 8, 8),
        published_at=datetime(2026, 10, 8, 9),
    ))
    db.commit()

    class InstagramResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"like_count": 3, "comments_count": 1}

    request_calls = []

    def mock_get(url, **kwargs):
        request_calls.append((url, kwargs))
        return InstagramResponse()

    monkeypatch.setattr(analytics.requests, "get", mock_get)

    try:
        response = client.get(
            "/analytics/engagement",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "platform": "Instagram",
                "metric": "likes",
            },
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["likes"] == 3
    assert data["metrics"]["comments"] == 1
    assert data["metrics"]["engagement"] == 4
    assert data["timeline"] == [{
        "date": "2026-10-08",
        "likes": 3,
        "comments": 1,
    }]
    assert data["available"] is True
    assert len(request_calls) == 1
    assert request_calls[0][1]["params"]["fields"] == "like_count,comments_count"
    assert request_calls[0][1]["params"]["access_token"] == "instagram-test-token"


def test_export_requires_jwt():
    app = FastAPI()
    app.include_router(analytics.router)

    with TestClient(app) as client:
        response = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
            },
        )

    assert response.status_code == 401


def test_export_csv_contains_only_current_users_filtered_data_and_no_secrets():
    client, db, engine = _client_with_analytics_data()
    account = db.query(SocialAccount).filter(SocialAccount.id == 20).first()
    account.access_token = "secret-token-must-not-export"
    db.query(Campaign).filter(Campaign.id == 10).update(
        {Campaign.name: "=dangerous campaign"},
    )
    db.commit()

    try:
        response = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "platform": "X",
                "report_type": "post_details",
            },
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in response.headers["content-disposition"]
    body = response.text
    assert "Published post" not in body
    assert "2026-10-08" in body
    assert "Twitter" not in body
    assert "X" in body
    assert "'=dangerous campaign" in body
    assert "Data unavailable" in body
    assert "secret-token-must-not-export" not in body
    assert "Another user's post" not in body
    rows = list(csv.DictReader(StringIO(body)))
    assert len(rows) == 3
    assert sum(int(row["Posts"]) for row in rows) == 3


def test_export_supports_campaign_summary_and_rejects_invalid_report_type():
    client, db, engine = _client_with_analytics_data()
    try:
        summary = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "campaign_id": 10,
                "report_type": "campaign_summary",
            },
        )
        platform_summary = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "report_type": "platform_summary",
            },
        )
        invalid = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "report_type": "all_data",
            },
        )
        invalid_format = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "file_format": "pdf",
            },
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert summary.status_code == 200
    assert "Campaign" in summary.text
    assert "Launch" in summary.text
    assert "3" in summary.text
    assert platform_summary.status_code == 200
    platform_rows = list(csv.DictReader(StringIO(platform_summary.text)))
    assert len(platform_rows) == 1
    assert platform_rows[0]["Platform"] == "X"
    assert platform_rows[0]["Posts"] == "3"
    assert invalid.status_code == 422
    assert invalid_format.status_code == 422


def test_export_xlsx_is_a_valid_workbook_with_filtered_analytics_data():
    client, db, engine = _client_with_analytics_data()
    try:
        response = client.get(
            "/analytics/export",
            params={
                "start_date": "2026-10-08",
                "end_date": "2026-10-10",
                "platform": "X",
                "report_type": "post_details",
                "file_format": "xlsx",
            },
        )
    finally:
        client.close()
        db.close()
        engine.dispose()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert response.headers["content-disposition"].endswith(".xlsx\"")
    assert response.content.startswith(b"PK")

    with ZipFile(BytesIO(response.content)) as workbook:
        assert "xl/workbook.xml" in workbook.namelist()
        worksheet = ElementTree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))

    namespace = {"sheet": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheet_rows = worksheet.findall(".//sheet:row", namespace)
    assert len(sheet_rows) == 4
    cells = [
        "".join(cell.itertext())
        for row in sheet_rows
        for cell in row.findall("sheet:c", namespace)
    ]
    assert "Date" in cells
    assert "X" in cells
    assert "Published post" not in cells
    assert "Data unavailable" in cells
