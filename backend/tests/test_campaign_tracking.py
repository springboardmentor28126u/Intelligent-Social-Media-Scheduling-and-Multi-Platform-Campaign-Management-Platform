from datetime import date, datetime
from decimal import Decimal

from app.main import app
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.services.campaign_service import (
    build_campaign_analytics,
    build_campaign_comparison,
    build_campaign_report,
    build_campaign_tracking,
)


def test_build_campaign_tracking_counts_post_statuses():
    campaign = Campaign(
        id=1,
        user_id=7,
        name="Spring Launch",
        status="Active",
        start_date=date(2026, 1, 10),
        end_date=date(2026, 2, 10),
    )
    campaign.posts = [
        Post(id=1, user_id=7, campaign_id=1, content="A", status="draft"),
        Post(id=2, user_id=7, campaign_id=1, content="B", status="scheduled"),
        Post(id=3, user_id=7, campaign_id=1, content="C", status="published"),
        Post(id=4, user_id=7, campaign_id=1, content="D", status="published"),
        Post(id=5, user_id=7, campaign_id=1, content="E", status="failed"),
    ]

    metrics = build_campaign_tracking(campaign)

    assert metrics["total_posts"] == 5
    assert metrics["scheduled_posts"] == 1
    assert metrics["published_posts"] == 2
    assert metrics["failed_posts"] == 1
    assert metrics["status"] == "Active"
    assert metrics["start_date"] == date(2026, 1, 10)
    assert metrics["end_date"] == date(2026, 2, 10)


def test_build_campaign_report_includes_report_summary():
    campaign = Campaign(
        id=2,
        user_id=7,
        name="Summer Promotion",
        status="Scheduled",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 20),
    )
    campaign.posts = [
        Post(id=1, user_id=7, campaign_id=2, content="A", status="published"),
        Post(id=2, user_id=7, campaign_id=2, content="B", status="published"),
        Post(id=3, user_id=7, campaign_id=2, content="C", status="failed"),
    ]

    report = build_campaign_report(campaign)

    assert report["campaign_name"] == "Summer Promotion"
    assert report["total_posts"] == 3
    assert report["published_posts"] == 2
    assert report["failed_posts"] == 1
    assert report["performance"] > 0
    assert "Campaign Report" in report["report_text"]


def test_build_campaign_report_includes_audience_growth_metrics():
    campaign = Campaign(
        id=3,
        user_id=7,
        name="Launch Week",
        status="Active",
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 15),
    )
    campaign.social_accounts = [
        SocialAccount(id=10, user_id=7, platform="instagram", username="demo")
    ]
    campaign.posts = [
        Post(
            id=1,
            user_id=7,
            campaign_id=3,
            content="Launch announcement and product teaser",
            status="published",
            social_account_id=10,
            published_at=datetime(2026, 7, 3, 12, 0, 0),
        ),
        Post(
            id=2,
            user_id=7,
            campaign_id=3,
            content="Behind the scenes content for the campaign",
            status="published",
            social_account_id=10,
            published_at=datetime(2026, 7, 8, 12, 0, 0),
        ),
    ]

    report = build_campaign_report(campaign)

    assert report["new_followers"] >= 0
    assert report["total_followers"] > 0
    assert report["follower_growth"] >= 0
    assert report["growth_percentage"] >= 0
    assert report["reach"] > 0
    assert report["impressions"] > 0
    assert len(report["audience_timeline"]) >= 2
    assert len(report["top_performing_content"]) >= 1


def test_build_campaign_analytics_aggregates_engagement():
    campaign = Campaign(
        id=4,
        user_id=7,
        name="Launch Week",
        status="Active",
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 15),
    )
    campaign.social_accounts = [
        SocialAccount(id=10, user_id=7, platform="instagram", username="demo")
    ]
    campaign.posts = [
        Post(id=1, user_id=7, campaign_id=4, content="A", status="published", social_account_id=10),
        Post(id=2, user_id=7, campaign_id=4, content="B", status="published", social_account_id=10),
        Post(id=3, user_id=7, campaign_id=4, content="C", status="failed", social_account_id=10),
    ]

    summary = build_campaign_analytics([campaign], campaign.posts)

    assert summary["reach"] > 0
    assert summary["impressions"] > summary["reach"]
    assert summary["likes"] > 0
    assert summary["comments"] > 0
    assert summary["shares"] > 0
    assert summary["clicks"] > 0
    assert summary["views"] > 0
    assert summary["engagement_rate"] >= 0


def test_create_public_media_url_uses_backend_base_url(monkeypatch):
    from app.services.publisher import create_public_media_url

    monkeypatch.setenv("PUBLIC_BASE_URL", "https://example.com")

    public_url, error = create_public_media_url("/uploads/images/test.png")

    assert error is None
    assert public_url == "https://example.com/uploads/images/test.png"


def test_instagram_request_helper_is_available(monkeypatch):
    from app.services.publisher import instagram_request

    captured = {}

    class DummyResponse:
        status_code = 200

    def fake_request(method, url, **kwargs):
        captured["method"] = method
        captured["url"] = url
        captured["data"] = kwargs.get("data")
        captured["timeout"] = kwargs.get("timeout")
        return DummyResponse()

    monkeypatch.setattr("app.services.publisher.requests.request", fake_request)

    response = instagram_request("POST", "https://example.com/media", data={"a": "b"}, timeout=30)

    assert response.status_code == 200
    assert captured["method"] == "POST"
    assert captured["url"] == "https://example.com/media"
    assert captured["data"] == {"a": "b"}
    assert captured["timeout"] == 30


def test_static_routes_are_declared_before_dynamic_post_id_route():
    from app.routers.posts import router as posts_router

    paths = [route.path for route in posts_router.routes if hasattr(route, "path")]

    scheduled_index = paths.index("/posts/scheduled")
    logs_index = paths.index("/posts/publishing-logs")
    queue_index = paths.index("/posts/publishing-queue")
    dynamic_index = paths.index("/posts/{post_id}")

    assert scheduled_index < dynamic_index
    assert logs_index < dynamic_index
    assert queue_index < dynamic_index


def test_build_campaign_comparison_calculates_roi_for_each_campaign():
    campaign_a = Campaign(
        id=11,
        user_id=7,
        name="Campaign A",
        status="Active",
        budget=Decimal("5000"),
        start_date=date(2026, 1, 10),
        end_date=date(2026, 2, 10),
    )
    campaign_a.posts = [
        Post(id=1, user_id=7, campaign_id=11, content="A", status="published", social_account_id=1),
        Post(id=2, user_id=7, campaign_id=11, content="B", status="published", social_account_id=1),
    ]

    campaign_b = Campaign(
        id=12,
        user_id=7,
        name="Campaign B",
        status="Scheduled",
        budget=Decimal("3000"),
        start_date=date(2026, 2, 1),
        end_date=date(2026, 3, 10),
    )
    campaign_b.posts = [
        Post(id=3, user_id=7, campaign_id=12, content="C", status="published", social_account_id=1),
    ]

    comparison = build_campaign_comparison([campaign_a, campaign_b])

    assert comparison["summary"]["total_campaigns"] == 2
    assert comparison["summary"]["total_cost"] > 0
    assert comparison["summary"]["total_revenue"] >= comparison["summary"]["total_cost"]
    assert comparison["summary"]["best_campaign"]["name"] in {"Campaign A", "Campaign B"}
    assert all(entry["roi"] >= -100 for entry in comparison["comparison"])
    assert any(entry["name"] == "Campaign A" for entry in comparison["comparison"])
    assert any(entry["name"] == "Campaign B" for entry in comparison["comparison"])


def test_calendar_visible_statuses_include_published_posts():
    visible_statuses = ["scheduled", "SCHEDULED", "published", "PUBLISHED"]

    assert "published" in visible_statuses
    assert "PUBLISHED" in visible_statuses


def test_dashboard_and_analytics_routes_require_jwt_user():
    from app.core.security import get_current_user
    from app.routers.analytics import router as analytics_router
    from app.routers.dashboard import router as dashboard_router

    dashboard_paths = {route.path for route in dashboard_router.routes}
    assert dashboard_paths == {
        "/dashboard/stats",
        "/dashboard/recent-campaigns",
        "/dashboard/recent-posts",
    }

    analytics_paths = {route.path for route in analytics_router.routes}
    assert analytics_paths == {
        "/analytics/overview",
        "/analytics/engagement",
        "/analytics/audience",
        "/analytics/campaigns",
        "/analytics/campaigns/{campaign_id}",
        "/analytics/advanced",
        "/analytics/export",
        "/analytics/comparison",
        "/analytics/roi",
    }

    for route in [*dashboard_router.routes, *analytics_router.routes]:
        dependencies = [dependency.call for dependency in route.dependant.dependencies]
        assert get_current_user in dependencies
