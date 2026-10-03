import pytest
from models import User
from auth import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    pwd = "SecurePassword2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    payload = {"sub": "dimplethatireddy@gmail.com", "role": "Administrator", "user_id": 56}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded.get("sub") == "dimplethatireddy@gmail.com"
    assert decoded.get("role") == "Administrator"
    assert decoded.get("user_id") == 56


def test_register_user_success(client, db_session):
    resp = client.post(
        "/auth/register",
        json={
            "name": "Jane Marketer",
            "email": "jane.marketer@example.com",
            "password": "Password123!",
            "role": "Marketing Team",
        },
    )
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert "token" in data or "access_token" in data or "message" in data


def test_register_duplicate_email_fails(client, test_user):
    resp = client.post(
        "/auth/register",
        json={
            "name": "Dimple Duplicate",
            "email": test_user.email,
            "password": "Password123!",
            "role": "Content Creator",
        },
    )
    assert resp.status_code in [400, 409]


def test_login_success(client, test_user):
    resp = client.post(
        "/auth/login",
        json={
            "email": test_user.email,
            "password": "Password@123",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data or "token" in data
    assert data.get("user", {}).get("email") == test_user.email or "access_token" in data


def test_login_invalid_password_fails(client, test_user):
    resp = client.post(
        "/auth/login",
        json={
            "email": test_user.email,
            "password": "IncorrectPassword!",
        },
    )
    assert resp.status_code in [400, 401]


def test_forgot_password_request(client, test_user):
    resp = client.post(
        "/auth/forgot-password",
        json={"email": test_user.email},
    )
    assert resp.status_code == 200
    assert "message" in resp.json()
