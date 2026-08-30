# app/db/database.py
#
# This file's job: open ONE connection to MongoDB Atlas when the app starts,
# keep it alive and shared for the whole app's lifetime, and give us an
# easy way to check that connection is actually healthy.

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# "Motor" is the async delivery driver that talks to MongoDB Atlas.
# We create ONE client here — think of it as opening one phone line to
# the fridge, which the whole app shares, rather than everyone dialing in
# separately every time they need something.
client = AsyncIOMotorClient(settings.MONGODB_URL)

# This grabs the specific "drawer" (database) inside your cluster named
# "socialpilot" — the same name we put at the end of the connection string
# in your .env file.
database = client.get_default_database()


async def ping_database():
    """
    A simple health check: asks MongoDB 'are you there?' and waits for a
    reply. We'll call this once when the app starts up, so if the
    connection string or password is wrong, we find out immediately
    instead of the app silently failing later when a real user tries
    to register or log in.
    """
    try:
        await client.admin.command("ping")
        return True
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return False