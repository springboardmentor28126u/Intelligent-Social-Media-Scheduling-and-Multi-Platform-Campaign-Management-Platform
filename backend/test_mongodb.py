from pymongo import MongoClient
from pymongo.server_api import ServerApi

from app.core.config import settings


try:
    client = MongoClient(
        settings.MONGODB_URL,
        server_api=ServerApi("1"),
        serverSelectionTimeoutMS=30000,
    )

    client.admin.command("ping")

    print("SUCCESS: Connected to MongoDB Atlas!")

except Exception as e:
    print("FAILED:")
    print(repr(e))

finally:
    try:
        client.close()
    except Exception:
        pass