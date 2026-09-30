# SocialPilot

An intelligent social media scheduling and multi-platform campaign management platform built with FastAPI and React + TypeScript (Vite).

## Key Features

- **Multi-Platform OAuth & Publishing**: Connect and publish to Facebook Pages, Instagram, LinkedIn, YouTube, and X (Twitter).
- **Campaign Management**: Group posts into unified campaigns with budgets, target dates, and performance tracking.
- **Cross-Platform Analytics Dashboard**: Unified cross-platform metrics (likes, comments, views, reach, shares, saved) and per-platform drill-downs.
- **In-App Notifications**: Real-time polling notifications for post publish events and publishing failures with direct navigation links.
- **Reports & Data Export**: CSV export of aggregated campaign reports and individual post analytics.
- **Scheduling & Celery Workers**: Automated background publishing and recurrence handling via Celery and Redis.

---

## Tech Stack

- **Backend**: Python 3.14+, FastAPI, SQLAlchemy, Alembic, Celery, Redis, PostgreSQL
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons, Recharts

---

## Getting Started

### 1. Backend Setup

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   # Linux/macOS
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Configure environment variables in `backend/.env`:
   ```ini
   DATABASE_URL=postgresql://user:password@localhost:5432/socialpilot
   SECRET_KEY=your-secret-key
   REDIS_URL=redis://localhost:6379/0
   FRONTEND_URL=http://localhost:5173

   # Meta (Facebook & Instagram)
   FACEBOOK_APP_ID=your_fb_app_id
   FACEBOOK_APP_SECRET=your_fb_app_secret
   FACEBOOK_REDIRECT_URI=http://localhost:8000/auth/facebook/callback
   FACEBOOK_CONFIG_ID=your_fb_config_id

   INSTAGRAM_APP_ID=your_ig_app_id
   INSTAGRAM_APP_SECRET=your_ig_app_secret
   INSTAGRAM_REDIRECT_URI=http://localhost:8000/auth/instagram/callback

   # LinkedIn
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:8000/auth/linkedin/callback

   # YouTube (Google OAuth)
   YOUTUBE_CLIENT_ID=your_google_client_id
   YOUTUBE_CLIENT_SECRET=your_google_client_secret
   YOUTUBE_REDIRECT_URI=http://localhost:8000/auth/youtube/callback

   # X (Twitter)
   X_CLIENT_ID=your_x_client_id
   X_CLIENT_SECRET=your_x_client_secret
   X_REDIRECT_URI=http://127.0.0.1:8000/auth/x/callback
   ```

4. **Database Migrations** (Alembic is the single source of truth):
   ```bash
   cd backend
   alembic upgrade head
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

6. Run the Celery worker and beat scheduler (in separate terminals):
   ```bash
   # Worker
   celery -A celery_app worker --loglevel=info --pool=solo
   # Beat
   celery -A celery_app beat --loglevel=info
   ```

---

### 2. Frontend Setup

1. Install frontend dependencies:
   ```bash
   cd new_frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

---

## Database Migrations

This project uses **Alembic** as the single source of truth for all database schema management (`Base.metadata.create_all()` is deprecated and removed).

- **Apply all migrations:**
  ```bash
  cd backend
  alembic upgrade head
  ```
- **Create a new migration:**
  ```bash
  cd backend
  alembic revision --autogenerate -m "description_of_change"
  ```