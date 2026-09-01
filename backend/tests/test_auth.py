import pytest


def test_login_admin(client):
    response = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@socialpilot.io"
    assert data["user"]["role"] == "administrator"


def test_login_invalid_password(client):
    response = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_register_new_user(client):
    response = client.post("/auth/register", json={
        "name": "Test Marketing User",
        "email": "test_mkt@socialpilot.io",
        "password": "securepassword123",
        "role": "marketing_team"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test_mkt@socialpilot.io"
    assert data["role"] == "marketing_team"


def test_get_current_user_profile(client):
    # Login first
    login_res = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "creator@socialpilot.io"
    assert data["role"] == "content_creator"
