# app/main.py
#
# This is the "front door" of your backend — the single file that starts
# the whole FastAPI app. Running this file is what turns your kitchen "on."

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import ping_database
from app.api.auth import router as auth_router
from app.api.posts import router as posts_router
from app.api.campaigns import router as campaigns_router
from app.api.analytics import router as analytics_router
from app.api.social import router as social_router
# Add this import near your other imports:
import asyncio
from app.services.publisher import run_publisher_loop

# This creates the actual FastAPI application object — everything else
# (routes, middleware, startup checks) attaches to this one object.
app = FastAPI(title="SocialPilot API")
# Add this near the top, after `app = FastAPI(...)`:
publisher_task: asyncio.Task | None = None
app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(campaigns_router)
app.include_router(analytics_router)
app.include_router(social_router)
# --- CORS setup ---
# By default, browsers block a webpage running on one address from talking
# to a server on a different address, as a security measure. Your frontend
# runs on localhost:3000 and your backend will run on a different port
# (localhost:8000), so without this, the browser would block every request
# your frontend tries to send here. This explicitly tells the backend:
# "it's safe to accept requests from localhost:3000."
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Replace your existing startup_check function with this (same Mongo
# check as before, PLUS starting the background publisher):
@app.on_event("startup")
async def startup_check():
    is_connected = await ping_database()
    if is_connected:
        print("✅ Successfully connected to MongoDB Atlas!")
    else:
        print("❌ Failed to connect to MongoDB Atlas — check your .env file.")

    global publisher_task
    publisher_task = asyncio.create_task(run_publisher_loop())
    print("📤 Publisher background loop started.")


# Add this new event, anywhere below startup_check:
@app.on_event("shutdown")
async def shutdown_publisher():
    if publisher_task:
        publisher_task.cancel()
        print("🛑 Publisher background loop stopped.")