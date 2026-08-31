import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")

mongo_client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=3000
)

mongo_db = mongo_client[MONGO_DB]


def test_mongo_connection():
    mongo_client.admin.command("ping")
    return True