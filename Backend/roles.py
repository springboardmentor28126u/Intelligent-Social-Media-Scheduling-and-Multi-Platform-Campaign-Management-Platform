"""Backend permission policy; legacy database roles remain supported."""
from enum import Enum


class Role(str, Enum):
    CONTENT_CREATOR = "content_creator"
    MARKETING_MANAGER = "marketing_manager"
    BUSINESS_USER = "business_user"
    ADMINISTRATOR = "administrator"


ROLE_PERMISSIONS = {
    Role.CONTENT_CREATOR: frozenset({"accounts:read", "accounts:write", "posts:read", "posts:write", "analytics:read", "analytics:write"}),
    Role.MARKETING_MANAGER: frozenset({"accounts:read", "accounts:write", "posts:read", "posts:write", "analytics:read", "analytics:write"}),
    Role.BUSINESS_USER: frozenset({"accounts:read", "posts:read", "analytics:read"}),
    Role.ADMINISTRATOR: frozenset({"accounts:read", "accounts:write", "users:read", "users:write", "roles:read", "posts:read", "posts:write", "analytics:read", "analytics:write"}),
}


def normalize_role(value):
    value = {"user": "content_creator", "admin": "administrator"}.get(value, value)
    try:
        return Role(value)
    except ValueError:
        return None


def permissions_for(value):
    return ROLE_PERMISSIONS.get(normalize_role(value), frozenset())
