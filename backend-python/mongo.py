from pymongo import MongoClient

# ============================================================
# MONGODB CONNECTION
# ============================================================
# Local MongoDB by default. If you're using MongoDB Atlas instead,
# replace this with your Atlas connection string.

MONGO_URI = "mongodb+srv://dimplethatireddy_db_user:dimple2208@cluster0.zrampbp.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
mongo_db = client["socialpilot"]


def get_mongo_db():
    return mongo_db