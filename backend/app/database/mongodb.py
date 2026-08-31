from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017"

client = MongoClient(MONGO_URL)

db = client["socialpilot"]

analytics_collection = db["analytics"]
activity_logs_collection = db["activity_logs"]