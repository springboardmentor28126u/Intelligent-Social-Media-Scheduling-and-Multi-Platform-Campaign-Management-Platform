# SocialPilot

## Intelligent Social Media Scheduling and Multi-Platform Campaign Management Platform

SocialPilot is a full-stack social media management platform that helps users manage multiple social media accounts from a single application.

Users can connect social platforms, create and schedule posts, organize campaigns, view analytics, collaborate with teams, and receive notifications.

---

## Features

* User registration and login
* JWT-based authentication
* User profile management
* Dashboard
* Social media account management
* OAuth-based social account connection
* Post creation and management
* Social media scheduling
* Content calendar
* Campaign management
* Analytics dashboard
* Team management
* Team members and permissions
* Team invitations
* Notifications
* Admin dashboard
* Admin user management

### Supported Social Platforms

* Instagram
* Facebook
* X / Twitter
* LinkedIn
* YouTube
* Pinterest

---

## Technology Stack

### Frontend

* React
* Vite
* JavaScript / JSX
* React Router
* Axios
* Tailwind CSS

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* Alembic
* PostgreSQL
* JWT Authentication

### Tools

* Git
* GitHub
* npm
* PowerShell
* FastAPI Swagger

---

## Architecture

```text
+---------------------------+
|      React Frontend       |
|                           |
| Dashboard                |
| Posts                    |
| Calendar                 |
| Campaigns                |
| Analytics                |
| Social Accounts          |
| Teams                    |
| Notifications            |
+-------------+-------------+
              |
              | REST API / JWT
              v
+---------------------------+
|      FastAPI Backend      |
|                           |
| Authentication           |
| Users                    |
| Posts                    |
| Social Accounts          |
| OAuth                    |
| Teams                    |
| Notifications            |
| Campaigns                |
| Analytics                |
+-------------+-------------+
              |
              | SQLAlchemy
              v
+---------------------------+
|       PostgreSQL          |
+---------------------------+
```

---

## Project Structure

```text
Socialpilot/
|
+-- backend/
|   +-- alembic/
|   +-- app/
|       +-- database/
|       +-- dependencies/
|       +-- integrations/
|       +-- models/
|       +-- routes/
|       +-- schemas/
|       +-- services/
|       +-- main.py
|
+-- frontend/
    +-- src/
        +-- components/
        +-- context/
        +-- pages/
        +-- routes/
        +-- services/
        +-- assets/
        +-- App.jsx
        +-- main.jsx
```

---

## Authentication

SocialPilot uses JWT-based authentication.

Authentication flow:

```text
Register
   |
   v
Login
   |
   v
JWT Access Token
   |
   v
Frontend localStorage
   |
   v
Axios Authorization Header
   |
   v
Protected FastAPI API
```

The frontend automatically attaches the access token to authenticated API requests.

---

## Dashboard

The dashboard provides centralized navigation to the main features of the platform.

Main sections include:

* Dashboard
* Create Post
* Calendar
* Campaigns
* Analytics
* Social Accounts
* Teams
* Notifications
* Profile

---

## Social Account Management

Users can connect and manage their social media accounts.

Main operations include:

* Connect account
* View connected account
* View account information
* Reconnect account
* Disconnect account
* Check connection status

API:

```text
GET    /social-accounts/
POST   /social-accounts/
DELETE /social-accounts/{account_id}
```

---

## OAuth Integration

SocialPilot uses OAuth to securely connect social media accounts.

General flow:

```text
User
 |
 v
SocialPilot Authorization
 |
 v
Social Platform
 |
 v
User Grants Permission
 |
 v
OAuth Callback
 |
 v
Token Exchange
 |
 v
Social Account Saved
```

OAuth state validation is used to associate the authorization request with the correct user.

Instagram OAuth has been successfully tested in the development environment.

---

## Post Management

Users can create and manage social media content.

Posts can be associated with:

* Social accounts
* Publishing status
* Scheduled date/time
* Campaigns

Typical workflow:

```text
Create Post
     |
     v
Select Platform
     |
     v
Choose Publish/Schedule
     |
     v
Save Post
```

---

## Scheduling and Calendar

Users can schedule content for future publishing.

The calendar provides a visual representation of scheduled posts.

Scheduling workflow:

```text
Create Content
     |
     v
Select Social Account
     |
     v
Select Date and Time
     |
     v
Schedule Post
     |
     v
View in Calendar
```

---

## Campaign Management

Campaigns allow users to organize related social media content.

Campaigns can be used for:

* Product launches
* Marketing campaigns
* Promotions
* Events
* Announcements
* Seasonal campaigns

---

## Analytics

The Analytics section provides a centralized location for social media performance information.

The platform can support metrics such as:

* Likes
* Comments
* Shares
* Reach
* Impressions
* Clicks
* Engagement
* Campaign performance

Additional platform-specific analytics can be integrated as required.

---

## Team Management

SocialPilot supports collaborative team management.

Team owners can:

* Create teams
* Update teams
* Delete teams
* Add members
* Update member roles
* Remove members
* Manage invitations

Team members can access team information according to their permissions.

### Team Permissions

The system supports permissions including:

```text
role
can_publish
can_approve
```

When a team is created, the creator automatically becomes the owner.

---

## Team Invitations

Team owners can invite users by email.

Invitation functionality includes:

* Create invitation
* View invitations
* Invitation status
* Invitation expiration
* Delete invitation

Invitation API:

```text
POST   /teams/{team_id}/invitations
GET    /teams/{team_id}/invitations
DELETE /teams/{team_id}/invitations/{invitation_id}
```

Invitation tokens are securely generated on the backend.

---

## Notifications

SocialPilot includes a notification management system.

Users can:

* View notifications
* View unread notifications
* View unread count
* Mark notifications as read
* Mark all notifications as read
* Delete notifications

Notification API:

```text
GET    /notifications/
GET    /notifications/unread
GET    /notifications/count
POST   /notifications/
PUT    /notifications/{notification_id}/read
PUT    /notifications/read-all
DELETE /notifications/{notification_id}
```

---

## API Overview

Important API groups include:

```text
/auth/...
/users/...
/posts/...
/social-accounts/...
/social-auth/...
/teams/...
/notifications/...
/campaigns/...
/analytics/...
/admin/...
```

FastAPI automatically provides API documentation.

Swagger:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

---

## Frontend Routes

Important frontend routes include:

```text
/
/register
/login
/dashboard
/profile
/profile/update
/create-post
/calendar
/social-accounts
/campaigns
/analytics
/teams
/notifications
/admin/dashboard
/admin/users
```

---

## Environment Variables

Create a backend `.env` file.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/socialpilot
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

OAuth credentials should be configured according to the integrations being used.

Example:

```env
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

PINTEREST_CLIENT_ID=
PINTEREST_CLIENT_SECRET=
```

Never commit secrets or `.env` files to GitHub.

---

## Frontend Environment

The frontend API URL can be configured using:

```env
VITE_API_URL=http://localhost:8000
```

If it is not configured, the frontend uses:

```text
http://localhost:8000
```

---

## Database Setup

SocialPilot uses PostgreSQL.

Create the database:

```sql
CREATE DATABASE socialpilot;
```

Configure the database URL in the backend environment.

The backend uses SQLAlchemy for database access and Alembic for migrations.

---

## Backend Installation

Navigate to the backend:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Run migrations:

```powershell
alembic upgrade head
```

Start the backend:

```powershell
uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

---

## Frontend Installation

Navigate to the frontend:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Database Migrations

Check current migration:

```powershell
alembic current
```

View migration history:

```powershell
alembic history
```

Upgrade database:

```powershell
alembic upgrade head
```

Create a migration:

```powershell
alembic revision --autogenerate -m "Describe change"
```

Always review autogenerated migrations before applying them.

---

## Testing

Backend APIs can be tested using:

```text
http://localhost:8000/docs
```

Recommended testing flow:

```text
Register
   |
Login
   |
Dashboard
   |
Connect Social Account
   |
Create Post
   |
Schedule Post
   |
Calendar
   |
Campaign
   |
Analytics
   |
Create Team
   |
Invite Member
   |
Notifications
```

Frontend production build:

```powershell
npm run build
```

Frontend linting:

```powershell
npm run lint
```

---

## Security

The application handles authentication credentials and social media OAuth tokens.

Important security practices include:

* Use strong JWT secrets
* Never commit `.env`
* Never expose OAuth secrets
* Protect access tokens
* Validate OAuth state
* Use HTTPS in production
* Configure secure CORS
* Validate user permissions
* Protect administrative endpoints
* Secure PostgreSQL credentials

---

## Git Workflow

Check status:

```powershell
git status
```

Stage changes:

```powershell
git add .
```

Commit:

```powershell
git commit -m "Describe changes"
```

Pull remote changes:

```powershell
git pull --rebase
```

Push:

```powershell
git push
```

If a push is rejected because the remote contains newer changes:

```powershell
git pull --rebase origin <branch>
git push origin <branch>
```

Avoid force-pushing unless it is specifically required.

---

## Development Guidelines

When adding a new feature:

1. Update the database model if required.
2. Create an Alembic migration.
3. Add Pydantic schemas.
4. Implement backend routes.
5. Register the router.
6. Add frontend API/service functions.
7. Create or update the frontend page.
8. Add the frontend route.
9. Test the API.
10. Test the UI.
11. Run the frontend build.
12. Check Git status.
13. Commit the changes.
14. Push to GitHub.

---

## Current Project Status

Implemented components include:

* [x] React frontend
* [x] Vite setup
* [x] FastAPI backend
* [x] PostgreSQL
* [x] SQLAlchemy
* [x] Alembic
* [x] JWT authentication
* [x] User registration
* [x] User login
* [x] Profile management
* [x] Dashboard
* [x] Social account management
* [x] OAuth architecture
* [x] Instagram OAuth tested
* [x] Post management
* [x] Calendar
* [x] Campaigns
* [x] Analytics
* [x] Team management
* [x] Team members
* [x] Team permissions
* [x] Team invitations
* [x] Notifications
* [x] Admin dashboard
* [x] Admin user management
* [x] Git/GitHub integration

---

## Future Improvements

Potential future improvements include:

* Automated scheduled publishing workers
* Advanced analytics
* AI caption generation
* AI hashtag recommendations
* Best-time-to-post recommendations
* Media library
* Content approval workflows
* Advanced team roles
* Email notifications
* Push notifications
* Social listening
* Additional social media integrations
* Automated testing
* CI/CD
* Docker deployment
* Production cloud deployment

---

## Author

**Himaja Chanda**

## Project

**SocialPilot — Intelligent Social Media Scheduling and Multi-Platform Campaign Management Platform**
