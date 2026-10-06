# SocialPilot – Social Media Management Platform

## Overview

**SocialPilot** is a full-stack social media management platform that allows users to connect their social media accounts, create and manage posts, schedule content, manage campaigns, and monitor publishing activities from a centralized dashboard.

The project is built using **React.js** for the frontend, **FastAPI** for the backend, and **PostgreSQL** for database management.

## 🚀 Features

- 🔐 User registration and secure login
- 👤 User and role-based access
- 📊 Dashboard with social media activity and statistics
- 🔗 Social media account integration
- 📝 Create and manage social media posts
- 📅 Schedule posts for future publishing
- 📢 Campaign creation and management
- 📤 Social media publishing
- 📋 Publishing queue
- 📈 Analytics and performance monitoring
- 🔔 Notifications
- ⚙️ User settings
- 🛡️ Admin dashboard and administration features
- 🌙 Light/Dark mode
- 📱 Responsive user interface
- 🤖 Integration with social-media APIs
- 🖼️ Image and video post support

## 🌐 Supported Platforms

SocialPilot is designed to integrate with multiple social media platforms, including:

- Facebook
- Instagram
- LinkedIn
- YouTube
- X (Twitter)

The available features depend on the APIs, permissions, and configurations provided by each platform.

## 🛠️ Tech Stack

### Frontend

- React.js
- JavaScript
- HTML5
- CSS3
- Vite
- React Context API

### Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- JWT Authentication
- REST APIs

### Database

- PostgreSQL

### Development Tools

- Git
- GitHub
- VS Code
- Postman

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/springboardmentor28126u/Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform.git
cd SocialPilot
```

### 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Activate it on macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

Example:

```env
DATABASE_URL=your_postgresql_database_url
SECRET_KEY=your_secret_key

FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CONFIG_ID=your_facebook_config_id
FACEBOOK_REDIRECT_URI=your_facebook_redirect_uri

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=your_linkedin_redirect_uri

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri

X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=your_x_redirect_uri
```

### 4. Database Migration

Run Alembic migrations:

```bash
alembic upgrade head
```

### 5. Start the Backend

```bash
uvicorn app.main:app --reload
```

The backend will run at:

```
http://127.0.0.1:8000
```

FastAPI documentation:

```
http://127.0.0.1:8000/docs
```

### 6. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```
http://localhost:5173
```

## 🔑 Authentication

SocialPilot uses JWT-based authentication.

The authentication flow includes:

- User registration
- User login
- Password verification
- JWT access token generation
- Protected API routes
- Role-based access for administrative features

## 📱 Social Media Integration

Users can connect their social media accounts through the **Social Accounts** section.

The general flow is:

```text
User
 ↓
Connect Social Account
 ↓
OAuth Authorization
 ↓
Access Token
 ↓
SocialPilot
 ↓
Save Connected Account
 ↓
Create / Schedule / Publish Posts
```

Each platform uses its respective OAuth/API requirements.

## 📝 Post Management

Users can:

- Create posts
- Add captions/content
- Upload supported media
- Select connected social accounts
- Publish posts
- Schedule posts
- View publishing status

## 📅 Campaign Management

Campaigns allow users to organize social media content around a particular marketing activity.

A campaign can contain:

- Campaign name
- Description
- Start/end dates
- Posts
- Publishing schedule
- Campaign status

## 📊 Dashboard & Analytics

The dashboard provides a centralized view of SocialPilot activity, including:

- Connected accounts
- Posts
- Campaigns
- Publishing activity
- Analytics
- Scheduled content

## 📋 Publishing Queue

The publishing queue helps manage scheduled posts and their publishing status.

Typical statuses include:

```text
Scheduled
   ↓
Processing
   ↓
Published
```

Failed publishing attempts can also be tracked for debugging and retry handling.

## 🛡️ Admin Features

The admin section provides administrative functionality such as:

- User management
- Dashboard statistics
- System-level information
- Administrative controls

Access to administrative features is restricted according to the user's role.

## 🎨 User Interface

The frontend includes:

- Responsive dashboard
- Sidebar navigation
- Workspace layout
- Forms
- Tables
- Cards
- Modals
- Notifications
- Light/Dark theme support
- Responsive design

## 🧪 Testing

Backend tests are maintained for important application functionality, including:

- Social media publishing
- OAuth state handling
- Backend API behavior

Run tests using:

```bash
pytest
```

## 🔒 Security

The project follows basic security practices including:

- JWT authentication
- Password hashing
- Protected API routes
- Role-based authorization
- Environment variables for credentials
- OAuth-based social account authentication
- CORS configuration
