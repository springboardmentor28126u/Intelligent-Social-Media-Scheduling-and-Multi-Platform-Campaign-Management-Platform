"""
app/db/posts.py

Database operations for the MongoDB 'posts' collection.
"""

from typing import Optional

from app.db.database import database
from app.models.schemas import PostInDB


posts_collection = database["posts"]


async def create_post(post: PostInDB) -> dict:
    """
    Save a new post into MongoDB.
    """

    post_dict = post.model_dump()

    await posts_collection.insert_one(
        post_dict
    )

    return post_dict


async def get_posts_by_user_id(
    user_id: str
) -> list[dict]:
    """
    Return all posts belonging to one user.

    Newest posts appear first.
    """

    cursor = posts_collection.find(
        {"user_id": user_id}
    ).sort(
        "created_at",
        -1
    )

    posts = []

    async for post in cursor:
        posts.append(post)

    return posts


async def get_post_by_id(
    post_id: str,
    user_id: str
) -> Optional[dict]:
    """
    Find one post belonging to the currently logged-in user.

    Including user_id in the query prevents one user from
    accessing another user's posts.
    """

    post = await posts_collection.find_one(
        {
            "id": post_id,
            "user_id": user_id,
        }
    )

    return post


async def delete_post(
    post_id: str,
    user_id: str
) -> bool:
    """
    Delete one post, but only if it belongs to the logged-in user.
    """

    result = await posts_collection.delete_one(
        {
            "id": post_id,
            "user_id": user_id,
        }
    )

    return result.deleted_count > 0