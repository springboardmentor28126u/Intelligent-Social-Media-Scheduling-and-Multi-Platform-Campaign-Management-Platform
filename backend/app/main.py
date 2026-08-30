# app/main.py
#
# This is the "front door" of your backend — the single file that starts
# the whole FastAPI app. Running this file is what turns your kitchen "on."

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import ping_database
from app.api.auth import router as auth_router

# This creates the actual FastAPI application object — everything else
# (routes, middleware, startup checks) attaches to this one object.
app = FastAPI(title="SocialPilot API")
app.include_router(auth_router)

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


@app.on_event("startup")
async def startup_check():
    """
    This runs ONCE, automatically, the moment the backend starts up.
    It "knocks on the door" of MongoDB Atlas to confirm the connection
    actually works — so if something's wrong (bad password, wrong IP
    not whitelisted, etc.), we see an error immediately in the terminal
    instead of the app silently pretending everything's fine.
    """
    is_connected = await ping_database()
    if is_connected:
        print("✅ Successfully connected to MongoDB Atlas!")
    else:
        print("❌ Failed to connect to MongoDB Atlas — check your .env file.")


@app.get("/")
def read_root():
    """
    A basic 'health check' route. If you visit this in a browser and see
    a response, it confirms the backend itself is alive and responding —
    separate from whether the database connection worked.
    """
    return {"status": "SocialPilot backend is running"}