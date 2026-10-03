import pytest
from datetime import datetime, timedelta
from models import Scenario


def test_create_campaign(client, test_user):
    resp = client.post(
        "/campaigns",
        json={
            "name": "Q4 Enterprise Growth Boost",
            "platform": "linkedin",
            "budget": 5000.0,
            "objectives": "Maximize brand awareness and signups",
        },
    )
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert "id" in data
    assert data["name"] == "Q4 Enterprise Growth Boost"


def test_get_campaigns_list(client, test_user):
    resp = client.get("/campaigns")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_scenario_simulation_engine(client, db_session, test_user):
    # Setup test scenario matching Scenario model
    sc = Scenario(
        name="Budget 2x Optimization",
        question="What if we double our advertising budget across high-performing clips?",
        decision_type="budget_increase",
        variable="ad_spend",
        user_id=test_user.id,
    )
    db_session.add(sc)
    db_session.commit()
    db_session.refresh(sc)

    resp = client.post(
        f"/scenarios/{sc.id}/simulate",
        json={
            "metric_name": "estimated_reach",
            "baseline_value": 50000.0,
            "change_percentage": 25.0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("predicted_value") == 62500.0
    assert data.get("delta") == 12500.0


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") in ["healthy", "degraded"]
    assert "service" in data or "postgresql" in data
