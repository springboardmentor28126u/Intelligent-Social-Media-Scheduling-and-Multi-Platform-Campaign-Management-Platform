from fastapi import Depends, HTTPException
from auth import get_current_user

ADMIN = "Administrator"
MANAGER = "Social Media Manager"
CREATOR = "Content Creator"
ANALYST = "Analyst"
ALL_ROLES = [ADMIN, MANAGER, CREATOR, ANALYST]

ALL_PERMISSIONS = {
    "users:manage", "settings:manage",
    "accounts:manage",
    "posts:write", "posts:read_all", "posts:write_any",
    "campaigns:write", "campaigns:read",
    "analytics:read", "analytics:read_all",
    "reports:export", "ai:use",
}

PERMISSIONS = {
    ADMIN: set(ALL_PERMISSIONS),
    MANAGER: {"accounts:manage", "posts:write", "posts:read_all", "posts:write_any",
              "campaigns:write", "campaigns:read", "analytics:read",
              "analytics:read_all", "reports:export", "ai:use"},
    CREATOR: {"accounts:manage", "posts:write", "campaigns:read",
              "analytics:read", "reports:export", "ai:use"},
    ANALYST: {"posts:read_all", "campaigns:read", "analytics:read",
              "analytics:read_all", "reports:export"},
}


ROLE_ALIASES = {"admin": ADMIN}


def normalize_role(role):
    role = getattr(role, "value", role)
    return ROLE_ALIASES.get(role, role)


def has_permission(role, perm: str) -> bool:
    return perm in PERMISSIONS.get(normalize_role(role), set())


def require_permission(perm: str):
    def checker(user=Depends(get_current_user)):
        if not has_permission(user.role, perm):
            raise HTTPException(status_code=403, detail="You don't have permission to do this.")
        return user
    return checker