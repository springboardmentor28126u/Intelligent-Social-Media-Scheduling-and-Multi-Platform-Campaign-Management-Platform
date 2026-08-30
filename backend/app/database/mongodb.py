
from pymongo import MongoClient

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"

client = MongoClient(MONGO_URL)

# SocialPilot MongoDB database
mongodb = client["socialpilot"]

# Example collections
analytics_collection = mongodb["analytics"]
activity_logs_collection = mongodb["activity_logs"]


def get_mongodb():
    return mongodb

