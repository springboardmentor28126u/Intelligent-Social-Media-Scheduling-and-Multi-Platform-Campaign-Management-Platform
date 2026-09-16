# app/db/database.py

from pymongo import AsyncMongoClient

from app.core.config import settings


# Create one asynchronous MongoDB client for the application.
# This is the modern PyMongo asyncio client and works naturally
# with FastAPI's async route functions.
client = AsyncMongoClient(
    settings.MONGODB_URL,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=20000,
    socketTimeoutMS=20000,
)


# Select the database from the database name included in MONGODB_URL.
database = client.get_default_database()


async def ping_database():
    """
    Check whether MongoDB Atlas is reachable.
    """

    try:
        await client.admin.command("ping")
        return True

    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return False