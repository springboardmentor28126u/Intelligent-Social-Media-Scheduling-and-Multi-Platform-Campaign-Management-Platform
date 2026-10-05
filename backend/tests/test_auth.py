import pytest
from jose import jwt
from auth import SECRET_KEY, ALGORITHM

def test_register_user_success(client):
    """Test user registration returns UserOut schema with HTTP 200."""
    response = client.post(
        "/register",
        json={
            "name": "Jane Doe",
            "email": "janedoe@example.com",
            "password": "Password123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Jane Doe"
    assert data["email"] == "janedoe@example.com"
    assert "id" in data
    assert data["role"] == "Content Creator"
    assert "password" not in data
    assert "password_hash" not in data

def test_login_returns_jwt(client, test_user):
    """Test login with valid credentials returns a valid JWT bearer token."""
    response = client.post(
        "/login",
        json={"email": test_user.email, "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Decode and verify the JWT token
    payload = jwt.decode(data["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == test_user.email
    assert payload["role"] == test_user.role

def test_login_wrong_password_gives_401(client, test_user):
    """Test login with wrong password returns 401 Unauthorized."""
    response = client.post(
        "/login",
        json={"email": test_user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_duplicate_email_is_rejected(client, test_user):
    """Test registering with an existing email returns 400 Bad Request."""
    response = client.post(
        "/register",
        json={
            "name": "Imposter",
            "email": test_user.email,
            "password": "Password123!",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

def test_registering_with_role_administrator_does_not_create_admin(client):
    """
    Test registering with role 'Administrator' does NOT create an admin.
    Public registration must not allow privilege escalation.
    """
    response = client.post(
        "/register",
        json={
            "name": "Sneaky Admin",
            "email": "sneaky@example.com",
            "password": "Password123!",
            "role": "Administrator",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] != "Administrator", "Security vulnerability: Public registration created an Administrator account"
    assert data["role"] == "Content Creator"

def test_me_without_token_gives_401(client):
    """Test accessing /me without Authorization header returns 401/403."""
    response = client.get("/me")
    assert response.status_code in (401, 403)
