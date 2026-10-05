import pytest
import models

def test_normal_user_gets_403_on_admin_users(client, auth_headers):
    """Test that a non-admin user (Content Creator) receives 403 Forbidden on /admin/users."""
    response = client.get("/admin/users", headers=auth_headers)
    assert response.status_code == 403
    assert "don't have permission" in response.json()["detail"].lower()

def test_admin_gets_200_on_admin_users(client, admin_auth_headers, test_user, admin_user):
    """Test that an admin user receives 200 OK and lists all users on /admin/users."""
    response = client.get("/admin/users", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    user_emails = [u["email"] for u in data]
    assert test_user.email in user_emails
    assert admin_user.email in user_emails

def test_admin_role_update_works_for_admins_only(client, auth_headers, admin_auth_headers, test_user, db):
    """
    Test that updating a user's role:
    - Returns 403 when attempted by a non-admin user.
    - Returns 200 and updates the role when executed by an Administrator.
    """
    # 1. Non-admin attempt -> 403 Forbidden
    forbidden_resp = client.put(
        f"/admin/users/{test_user.id}/role",
        headers=auth_headers,
        json={"role": "Administrator"},
    )
    assert forbidden_resp.status_code == 403

    # Ensure role did not change
    db.refresh(test_user)
    assert test_user.role == "Content Creator"

    # 2. Admin attempt -> 200 OK and role updated
    allowed_resp = client.put(
        f"/admin/users/{test_user.id}/role",
        headers=admin_auth_headers,
        json={"role": "Administrator"},
    )
    assert allowed_resp.status_code == 200
    assert allowed_resp.json()["role"] == "Administrator"

    # Verify directly in DB
    db.refresh(test_user)
    assert test_user.role == "Administrator"
