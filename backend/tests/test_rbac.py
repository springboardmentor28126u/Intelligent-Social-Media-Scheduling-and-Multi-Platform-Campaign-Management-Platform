import pytest


def test_admin_access_admin_dashboard(client):
    login_res = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/admin/dashboard", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "active_teams" in data


def test_creator_forbidden_admin_dashboard(client):
    login_res = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/admin/dashboard", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 403


def test_roles_and_permissions_list(client):
    login_res = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/roles", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    roles = response.json()
    assert len(roles) >= 4
