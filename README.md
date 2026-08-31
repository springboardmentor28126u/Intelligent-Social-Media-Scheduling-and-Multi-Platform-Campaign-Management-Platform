# Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform
##SocialPilot

SocialPilot is an intelligent social media scheduling and multi-platform campaign management platform. It combines a FastAPI backend with a Next.js dashboard for authenticating users, managing role-based access, and (in upcoming milestones) scheduling and publishing content across multiple social platforms.

Built individually as part of the Infosys Springboard Virtual Internship 7.0 — Python Intern track, implementing a shared team project brief.

## Project status

This repository currently reflects Milestone 1: Project Initialization & Core Setup. Content scheduling, publishing, campaigns, and analytics (Milestones 2–3) are planned but not yet built — see Roadmap.

#Features
##User management
User registration and JWT login
Role-based access control (RBAC) with 4 roles: Content Creator, Marketing Team, Business User, Administrator
Authenticated "current user" endpoint powering the dashboard
Administrator-only endpoint to list all users
Team management (role updates) — planned
##Social account management
Account records modeled for LinkedIn, X/Twitter, Facebook, Instagram, YouTube, and Pinterest
X (Twitter) connection flow implemented as a mocked OAuth pattern — X discontinued its free developer API tier in February 2026, so all platform connections in this milestone are mocked to keep the architecture consistent and cost-free while still demonstrating the full connect/store/display flow
Real OAuth for individual providers can be swapped in behind the same mocked interface in a later milestone
##Content scheduling (planned — Milestone 2)
Create, edit, and schedule posts across content types (text, image, video, carousel, story, reel)
Publishing calendar, draft management, recurring scheduling
Automated multi-platform publishing via FastAPI background tasks
#Technology
Backend: Python 3.12, FastAPI, Motor (async MongoDB driver), python-jose (JWT), passlib/bcrypt (password hashing), Pydantic v2
Frontend: Next.js (App Router, TypeScript), Tailwind CSS, lucide-react
Database: MongoDB Atlas (PostgreSQL + Redis planned for later milestones — analytics and background job queues)
Authentication: Bearer JWT access tokens
#Project structure
text
.
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth.py)
│   │   ├── core/         # Config, security (hashing/JWT), RBAC dependencies
│   │   ├── db/           # Database connection + collection access functions
│   │   ├── models/       # Pydantic schemas
│   │   └── main.py       # FastAPI app entry point
│   ├── requirements.txt
│   └── .env               # Environment variables (not committed)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/    # Login & register pages
        │   └── dashboard/ # Account management dashboard
        └── context/       # AuthContext (global auth state)
#Requirements
Python 3.12
Node.js 18 or newer and npm
A MongoDB Atlas cluster (free M0 tier is sufficient)
#Backend setup

From the backend/ folder, create and activate a virtual environment:

cmd
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Create a .env file in backend/:

text
MONGODB_URL=your_mongodb_atlas_connection_string
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

Do not commit .env — it's already excluded via .gitignore.

Start the server:

cmd
uvicorn app.main:app --reload

The API is available at http://localhost:8000, with interactive docs at http://localhost:8000/docs.

#Frontend setup

In a second terminal:

cmd
cd frontend
npm install
npm run dev

Open http://localhost:3000 in a browser.

#API endpoints

All routes marked "Authenticated" require a JWT sent as a bearer token.

Method	Endpoint	Purpose	Access
POST	/auth/register	Register a user	Public
POST	/auth/login	Obtain a JWT access token	Public
GET	/auth/me	Get the current logged-in user's info	Authenticated
GET	/auth/users	List all users	Administrator only

Send the access token as a bearer token:

http
Authorization: Bearer <access-token>

#Troubleshooting
Frontend can't reach the backend

Make sure both servers are running:

cmd
:: Terminal 1 (inside backend/, venv active)
uvicorn app.main:app --reload

:: Terminal 2
cd frontend
npm run dev
401 errors after logging in

The JWT is currently held in memory only (React state) — refreshing the tab logs you out. Log in again to get a fresh token. Persisting the session across refreshes is a planned improvement.

#Security notes
Never commit .env — it holds the MongoDB connection string and JWT secret key.
Replace SECRET_KEY with a strong, unique value before any deployment.
CORS is currently scoped to localhost:3000 for local development; update it before deploying.
Move all provider credentials (once real OAuth is added) into environment variables, never source control.
