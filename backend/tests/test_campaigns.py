import pytest


def test_create_and_list_campaigns(client):
    login_res = client.post("/auth/login", json={
        "email": "business@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    # 1. Create campaign
    create_res = client.post("/campaigns", json={
        "name": "Q4 Holiday Brand Push",
        "description": "Holiday promotional campaign across channels",
        "platform": "All Platforms",
        "budget": 10000.0,
        "target_reach": 100000,
        "status": "active"
    }, headers={"Authorization": f"Bearer {token}"})

    assert create_res.status_code == 201
    camp_id = create_res.json()["id"]

    # 2. List campaigns
    list_res = client.get("/campaigns", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    camps = list_res.json()
    assert any(c["id"] == camp_id for c in camps)
