"""
app/db/users.py — The "waiter who talks to the users collection."

Instead of writing raw MongoDB queries inside our route files, we keep
all user-related database operations here. Routes call these functions
and don't need to know any MongoDB syntax themselves — cleaner separation.
"""

from typing import Optional

from app.db.database import database
from app.models.schemas import UserInDB

# This is the actual MongoDB "drawer" (collection) where user documents
# (order tickets) are stored — think of the whole 'socialpilot' database
# as a filing cabinet, and 'users' as one labeled drawer in it.
users_collection = database["users"]


async def get_user_by_email(email: str) -> Optional[dict]:
    """
    Looks up a user by their email. Returns the raw MongoDB document
    (a plain dict) if found, or None if no user has that email.
    Used both at registration (to block duplicate emails) and at login
    (to find the user trying to log in).
    """
    user = await users_collection.find_one({"email": email})
    return user
async def get_user_by_id(user_id: str) -> Optional[dict]:
    """
    Looks up a user by their id (the one baked into their JWT wristband).
    Used by get_current_user on every protected route, to confirm the
    person behind the wristband still exists and to fetch their current
    role (in case it changed since they logged in).
    """
    user = await users_collection.find_one({"id": user_id})
    return user


async def create_user(user: UserInDB) -> dict:
    """
    Saves a new user document into the 'users' collection.
    We convert the Pydantic model to a plain dict first, since Motor
    (our MongoDB driver) works with plain dicts, not Pydantic objects.
    """
    user_dict = user.model_dump()
    await users_collection.insert_one(user_dict)
    return user_dict

async def get_all_users() -> list[dict]:
    """
    Fetches every user document in the 'users' collection.
    Used by the Administrator-only 'list all users' route (team
    management). find({}) with empty {} means "no filter — get everyone,"
    and to_list(length=None) means "don't cap how many you return."
    """
    cursor = users_collection.find({})
    all_users = await cursor.to_list(length=None)
    return all_users