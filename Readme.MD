# 🚀 SocialPilot — Intelligent Social Media Scheduling & Multi-Platform Campaign Management Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.1-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.2-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20GridFS-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7%2B-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5.4.0-37814A.svg?logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Internship](https://img.shields.io/badge/Infosys-Springboard%20Project-FF6B00.svg)](https://springboard.infosys.com/)

> **SocialPilot** is an enterprise-grade, centralized social media management and campaign scheduling platform. Built as part of the **Infosys Springboard Internship**, it enables content creators, marketing agencies, and business teams to plan, compose, schedule, queue, publish, and analyze multi-platform content across six major social networks from a unified dashboard.

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Problem Statement & Objectives](#-problem-statement--objectives)
3. [Architecture Overview](#-architecture-overview)
4. [Technology Stack](#-technology-stack)
5. [Repository Structure](#-repository-structure)
6. [Prerequisites](#-prerequisites)
7. [Environment Configuration](#-environment-configuration)
8. [Local Installation & Setup Guide](#-local-installation--setup-guide)
9. [Database & Alembic Migrations](#-database--alembic-migrations)
10. [Redis & Celery Background Processing](#-redis--celery-background-processing)
11. [Docker Compose Deployment](#-docker-compose-deployment)
12. [API Reference & Interactive Documentation](#-api-reference--interactive-documentation)
13. [Social Platform Integrations & OAuth Flows](#-social-platform-integrations--oauth-flows)
14. [Testing & Verification](#-testing--verification)
15. [Production Deployment](#-production-deployment)
16. [Known Limitations & Troubleshooting](#-known-limitations--troubleshooting)
17. [Future Roadmap](#-future-roadmap)
18. [Contributors & Acknowledgements](#-contributors--acknowledgements)

---

## 📖 Project Overview

Modern businesses and digital creators face severe workflow fragmentation when managing diverse social media channels. Each platform enforces distinct rate limits, authentication lifecycles, asset formats, and publishing mechanisms. Managing Facebook Pages, Instagram business accounts, LinkedIn personal profiles, X (Twitter) feeds, YouTube video streams, and Pinterest boards separately is inefficient, error-prone, and lacks centralized analytics.

**SocialPilot** resolves these challenges by providing:
- **Centralized Multi-Platform Management**: Single-click authorization and management across 6 platforms.
- **Advanced Publishing & Scheduling Engine**: Future date/time scheduling, interactive calendar, recurring post rules, and immediate manual dispatch.
- **Resilient Distributed Task Queue**: Worker-driven background dispatch with atomic database job claiming and exponential backoff retry algorithms.
- **Secure Token Encryption at Rest**: Symmetric AES-128-CBC + HMAC-SHA256 (Fernet) cryptographic protection for stored OAuth access and refresh credentials.
- **Hybrid Data Architecture**: Strongly typed PostgreSQL relational storage for transactional data combined with MongoDB GridFS for binary media storage and flexible platform metadata caching.
- **Full Audit Trail & Real-Time Notifications**: End-to-end event logging (`QUEUED` → `PROCESSING` → `PUBLISHING_STARTED` → `PUBLISHED`/`RETRYING`/`FAILED`) and real SMTP email notifications.
- **Campaign Performance & Analytics**: Aggregated engagement tracking, campaign ROI computation, side-by-side campaign comparisons, and CSV/JSON report exports.

---

## 🎯 Problem Statement & Objectives

### The Problem
- **Context Switching**: Manually logging into and publishing content on multiple social channels wastes valuable time.
- **Token Insecurity**: Many open-source social media management tools store plain-text access tokens in relational databases.
- **Publishing Reliability**: Network interruptions, transient API rate limits, or expired tokens often cause silent publishing failures without retry mechanisms or actionable error logs.
- **Media Incompatibilities**: Uploading high-resolution media across platforms with differing MIME and size constraints frequently results in unhandled failures.

### Objectives Achieved in this Repository
1. Implement a **stateless, secure FastAPI backend** backed by PostgreSQL with full Alembic schema versioning.
2. Build an **OAuth 2.0 provider integration suite** supporting Facebook, Instagram, LinkedIn, X, YouTube, and Pinterest, with Google OAuth user authentication.
3. Provide an automated **test suite** ensuring reliability across all endpoints, security layers, and scheduling lifecycles.

---

## 🏗️ Architecture Overview

```
                                  +------------------------------------+
                                  |     React 19 + Vite Frontend       |
                                  | (SPA / Glassmorphism / Lucide UI)  |
                                  +-----------------+------------------+
                                                    |  HTTPS / REST / JWT
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                                        FastAPI Backend Application                                    |
|                                                                                                       |
|  +--------------------+   +---------------------+   +---------------------+   +--------------------+  |
|  | Auth & RBAC (/auth)|   | Social Mgmt(/social)|   | Posts & Calendar    |   | Campaigns & Stats  |  |
|  +--------------------+   +---------------------+   +---------------------+   +--------------------+  |
|  | Media & GridFS     |   | Notifications & Mail|   | Team / Workspaces   |   | In-Process Loop    |  |
|  +--------------------+   +---------------------+   +---------------------+   +--------------------+  |
+---------+----------------------------+------------------------+--------------------------+------------+
          |                            |                        |                          |
          v                            v                        v                          v
+-------------------+        +-------------------+    +--------------------+     +---------------------+
| PostgreSQL (Rel)  |        |  MongoDB & GridFS |    |   Redis 7 (Broker) |     | External Platforms  |
| - Users & Teams   |        | - Media Assets    |    +---------+----------+     | - Facebook Graph    |
| - Social Accounts |        | - GridFS Chunks   |              |                | - Instagram Graph   |
| - Posts & Drafts  |        | - Raw Metadata    |              v                | - LinkedIn v2 UGC   |
| - Recurring Rules |        | (Graceful offline |    +--------------------+     | - X / Twitter API v2|
| - Publishing Jobs |        |  degradation)     |    | Celery Worker/Beat |     | - YouTube Data v3   |
| - Publishing Logs |        +-------------------+    | - Scheduled Scans  |     | - Pinterest API v5  |
| - Campaigns & ROI |                                 | - Async Dispatch   |     | - SMTP Mail Server  |
+-------------------+                                 | - Backoff Retries  |     +---------------------+
                                                      +---------+----------+
                                                                |
                                                                +---> Platform Adapters (httpx)
```

### Architecture Highlights
- **Hybrid Data Layer**:
  - **PostgreSQL**: Serves as the single source of truth for users, workspaces, social accounts, scheduled posts, recurring rules, publishing queues, and audit logs.
  - **MongoDB GridFS**: Stores uploaded media files (images, videos, attachments up to 250MB) and cached social platform responses. Operates with graceful degradation—if MongoDB is offline, core post scheduling and relational operations remain functional.
- **Dual-Scheduler Design**:
  - **Celery Beat + Celery Worker**: Recommended for containerized production and background task processing via Redis.
  - **In-Process Asyncio Fallback**: Built-in 15-second background scheduling loop (`ENABLE_INPROCESS_SCHEDULER=true`) that operates atomically with database row locks (`SELECT ... FOR UPDATE`), enabling automated scheduling even when Redis/Celery is not running locally.
- **Security-First Approach**:
  - Passwords hashed using `passlib[bcrypt]`.
  - Stateless JWT token authorization (`HS256`).
  - OAuth tokens encrypted at rest via symmetric Fernet keys derived from `JWT_SECRET_KEY`.
  - Passwords, access tokens, and private headers are automatically redacted in error messages and publishing logs.

---

## 💻 Technology Stack

Verified directly from the project's dependency specifications (`backend/requirements.txt` and `frontend/package.json`):

### Backend
| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Python | `3.10+` | Core programming language |
| **Web Framework** | FastAPI | `0.111.1` | High-performance asynchronous REST API framework |
| **ASGI Server** | Uvicorn | `0.30.1` | Asynchronous server implementation with reload support |
| **ORM** | SQLAlchemy | `2.0.31` | Relational database mapping and query builder |
| **Database Migrations** | Alembic | `1.13.2` | Schema migration tool for PostgreSQL |
| **Relational Drivers** | `psycopg2-binary`, `asyncpg` | `2.9.9` / `0.29.0` | Sync and async PostgreSQL database adapters |
| **Document Store** | Motor & PyMongo | `3.4.0` / `4.7.3` | Async and sync MongoDB drivers for GridFS storage |
| **Authentication & Tokens** | `python-jose`, `passlib`, `bcrypt` | `3.3.0` / `1.7.4` / `4.0.1` | JWT token issuance, verification, and bcrypt hashing |
| **Token Encryption** | Cryptography | `42.0.8` | Symmetric Fernet (AES-128-CBC + HMAC) token encryption at rest |
| **Validation & Settings** | Pydantic & Pydantic Settings | `2.8.2` / `2.3.4` | Data validation, type enforcement, and `.env` parsing |
| **HTTP Client** | HTTPX | `0.27.0` | Asynchronous HTTP client for platform API requests and OAuth |
| **Background Queue** | Celery & Redis | `5.4.0` / `5.0.7` | Distributed task execution, retries, and periodic scheduling |
| **Testing** | Pytest & Pytest-Asyncio | `8.2.2` / `0.23.7` | Test framework for unit, integration, and E2E testing |

### Frontend
| Component | Technology | Version | Purpose |
|---|---|---|---|
| **UI Library** | React | `19.2.8` | Component-based user interface |
| **Build Tool & Dev Server**| Vite | `8.2.2` | Fast HMR development server and production bundler |
| **Client-Side Routing** | React Router DOM | `7.18.2` | Declarative client-side routing with route guards |
| **HTTP Client** | Axios | `1.19.0` | REST API communication with automatic JWT interceptors |
| **Icons** | Lucide React | `1.46.0` | Clean, modern SVG icon library |
| **Linter** | Oxlint | `1.79.0` | High-performance JavaScript/JSX linter |
| **Styling** | Vanilla CSS3 | Standard | Custom glassmorphism design system, responsive layouts (No Tailwind dependency) |

### Infrastructure & Services
- **PostgreSQL 14+**: Relational database (compatible with Supabase, AWS RDS, Docker, and self-hosted).
- **MongoDB 6+ / MongoDB Atlas**: Binary asset and document storage via GridFS.
- **Redis 7+**: In-memory message broker and result backend for Celery.
- **Docker & Docker Compose**: Containerized multi-service development and deployment.
- **Pinggy / SSH Tunnel**: Public HTTPS webhook and OAuth callback forwarding for local development.

---

## 📁 Repository Structure

```
SocialPilot/
│
├── .gitignore                      # Git ignore patterns for Python, Node, Vite, env files
├── docker-compose.yml              # Multi-container orchestration (Redis, Backend, Celery Worker, Celery Beat)
├── masterprompt.txt                # Project specification and milestone prompt tracker
├── Readme.MD                       # Root project documentation (this file)
├── vercel.json                     # Frontend SPA rewrite rules for Vercel deployment
│
├── backend/                        # FastAPI Backend Application Root
│   ├── alembic.ini                 # Alembic migration configuration
│   ├── Dockerfile                  # Production container definition for FastAPI & Celery
│   ├── requirements.txt            # Pinned Python package dependencies
│   ├── start_pinggy.py             # Utility to establish Pinggy SSH tunnel for public OAuth callbacks
│   ├── .env.example                # Template with all documented environment variables
│   │
│   ├── alembic/                    # Alembic Database Migrations
│   │   ├── env.py                  # Database connection hook and metadata binding
│   │   ├── script.py.mako          # Migration template
│   │   └── versions/               # 12 sequential migration revisions (Milestone 1 through 4)
│   │
│   ├── app/                        # Application Core Package
│   │   ├── main.py                 # FastAPI application factory, lifespan, CORS, and root health check
│   │   │
│   │   ├── api/v1/                 # API Version 1 Routers
│   │   │   ├── router.py           # Master router registering all feature endpoints
│   │   │   └── endpoints/          # Route handlers:
│   │   │       ├── analytics.py    # Content performance, audience, campaign ROI, CSV/JSON export
│   │   │       ├── auth.py         # Registration, login, Google OAuth, me, password reset
│   │   │       ├── campaigns.py    # Campaign CRUD, post association, and metric tracking
│   │   │       ├── media.py        # File upload to GridFS, download streaming, tunnel checks
│   │   │       ├── notifications.py# Notification listing, unread count, preferences, test email
│   │   │       ├── posts.py        # Post creation, scheduling, drafts, calendar, manual publish, logs
│   │   │       ├── recurring_posts.py # Daily/weekly/monthly recurrence rules and occurrences
│   │   │       ├── social.py       # Social account connection, OAuth URLs, callbacks, permissions
│   │   │       ├── teams.py        # Workspace management, member invitations, and role management
│   │   │       └── users.py        # User profile inspection, updates, and timezone settings
│   │   │
│   │   ├── core/                   # Cross-Cutting Infrastructure
│   │   │   ├── config.py           # Pydantic Settings model loading and validating .env variables
│   │   │   └── encryption.py       # Symmetric Fernet token encryption at rest
│   │   │
│   │   ├── db/                     # Database Engine and Sessions
│   │   │   ├── base.py             # SQLAlchemy DeclarativeBase
│   │   │   ├── base_all.py         # Complete metadata registry importing all ORM models
│   │   │   ├── mongodb.py          # Motor async client, GridFS bucket setup, index creation
│   │   │   └── session.py          # SQLAlchemy engine and scoped session generator
│   │   │
│   │   ├── models/                 # SQLAlchemy Relational Models
│   │   │   ├── analytics.py        # PostMetric model
│   │   │   ├── campaign.py         # Campaign model
│   │   │   ├── enums.py            # Enumerations (UserRole, PostStatus, SocialPlatform, etc.)
│   │   │   ├── notification.py     # In-app and email notification tracking
│   │   │   ├── post.py             # Post and PostSocialAccount junction models
│   │   │   ├── post_publish_result.py # Per-platform publication status records
│   │   │   ├── publishing_job.py   # Atomic worker queue items with retry counters
│   │   │   ├── publishing_log.py   # Audit log events for post lifecycles
│   │   │   ├── recurring_rule.py   # Recurrence schedule rules and junction mappings
│   │   │   ├── social_account.py   # Connected social accounts, permissions, and sync logs
│   │   │   ├── team.py             # Team workspaces and member role assignments
│   │   │   ├── user.py             # Core user account model
│   │   │   └── user_settings.py    # User preferences (timezone, notifications, extras)
│   │   │
│   │   ├── schemas/                # Pydantic Request & Response Schemas
│   │   │   ├── analytics.py        # Analytics metrics and export schemas
│   │   │   ├── auth.py             # Register, login, token, user profile schemas
│   │   │   ├── campaign.py         # Campaign creation, update, and tracking responses
│   │   │   ├── media.py            # Media upload responses and asset details
│   │   │   ├── notification.py     # Notification payloads and preferences
│   │   │   ├── post.py             # Post creation, updating, calendar queries, publish logs
│   │   │   ├── recurring_post.py   # Recurrence rule schemas and occurrence generators
│   │   │   ├── social.py           # OAuth URLs, platform status, account metadata
│   │   │   ├── team.py             # Workspace and team member schemas
│   │   │   └── user.py             # Profile update and user setting schemas
│   │   │
│   │   ├── services/               # Business Logic & External Adapters
│   │   │   ├── analytics_service.py # Analytics aggregation, platform stats, CSV/JSON generator
│   │   │   ├── auth_service.py     # JWT token generation, password verification, get_current_user
│   │   │   ├── campaign_service.py # Campaign lifecycle and ROI calculation logic
│   │   │   ├── email_service.py    # SMTP email delivery, HTML templates, error sanitization
│   │   │   ├── media_service.py    # MongoDB GridFS upload, deduplication, and streaming
│   │   │   ├── notification_service.py # In-app notification creation, unread counts, preferences
│   │   │   ├── recurrence_service.py # Rule-based calculation of future post occurrences
│   │   │   ├── social_analytics_service.py # Live social network metrics synchronization
│   │   │   ├── social_metadata_service.py # MongoDB metadata storage for social profiles
│   │   │   ├── publishing/         # Publishing Engine Subsystem
│   │   │   │   ├── base.py         # BasePlatformPublisher abstract class & PublishResult
│   │   │   │   ├── media_resolver.py # Public URL resolution for media attachments
│   │   │   │   ├── queue_service.py # Atomic queue management, exponential backoff logic
│   │   │   │   ├── scheduler.py    # In-process periodic scanning loop (15-second intervals)
│   │   │   │   ├── service.py      # Core publishing coordinator
│   │   │   │   └── adapters/       # Platform-Specific Publishing Adapters:
│   │   │   │       ├── facebook.py # Meta Graph API v19.0 adapter
│   │   │   │       ├── instagram.py# Instagram Graph API container & publish adapter
│   │   │   │       ├── linkedin.py # LinkedIn v2 UGC Posts & asset upload adapter
│   │   │   │       ├── pinterest.py# Pinterest API v5 pins adapter
│   │   │   │       ├── x.py        # Twitter API v2 / v1.1 tweet & media adapter
│   │   │   │       └── youtube.py  # Google YouTube Data API v3 video upload adapter
│   │   │   └── social_providers/   # OAuth 2.0 Authorization Providers
│   │   │       ├── base.py         # BaseSocialProvider abstract interface
│   │   │       ├── facebook.py     # Facebook OAuth 2.0 flow
│   │   │       ├── instagram.py    # Instagram Business OAuth flow
│   │   │       ├── linkedin.py     # LinkedIn OpenID Connect & OAuth flow
│   │   │       ├── pinterest.py    # Pinterest OAuth 2.0 flow
│   │   │       ├── x.py            # X (Twitter) OAuth 2.0 with PKCE flow
│   │   │       └── youtube.py      # Google OAuth 2.0 for YouTube flow
│   │   │
│   │   └── worker/                 # Celery Worker Subsystem
│   │       ├── celery_app.py       # Celery application configuration & periodic beat schedule
│   │       └── tasks.py            # Celery tasks (post publishing, retries, reminders, analytics sync)
│   │
│   └── tests/                      # Automated Test Suite (202 Tests)
│       ├── conftest.py             # Test fixtures (in-memory SQLite, mock GridFS, eager Celery)
│       ├── test_auth.py            # Authentication & JWT issuance tests
│       ├── test_rbac_and_profile.py# Role-based access control and profile tests
│       ├── test_social_oauth.py    # OAuth state generation and callback handling tests
│       ├── test_social_providers.py# Provider configuration inspection tests
│       ├── test_social_sync_and_management.py # Account sync and disconnection tests
│       ├── test_teams.py           # Team workspaces and member management tests
│       ├── test_phase1_scheduling.py # Post scheduling foundation tests
│       ├── test_phase2_calendar.py # Calendar range and status filter tests
│       ├── test_phase3_drafts.py   # Draft lifecycle and conversion tests
│       ├── test_phase4_recurring.py# Recurrence rules and occurrence generator tests
│       ├── test_phase5_publishing.py # Platform publishing adapters and result tracking
│       ├── test_phase6_automated_publishing.py # Automated background scheduler tests
│       ├── test_phase7_async_publishing.py # Celery asynchronous worker dispatch tests
│       ├── test_phase8_publishing_queue.py # Atomic job claiming and retry backoff tests
│       ├── test_phase9_publishing_logs.py # Audit logging, filtering, and secret redaction
│       ├── test_phase10_e2e_integration.py # Full lifecycle integration tests
│       ├── test_milestone3_campaigns_and_analytics.py # Campaign and analytics engine tests
│       ├── test_notifications.py   # Notification feed, preferences, and unread badges
│       ├── test_email_and_notifications.py # Real SMTP delivery and template formatting
│       ├── test_celery_redis_integration.py # Celery worker execution and Redis broker tests
│       └── ...                     # Additional edge case and media pipeline tests
│
└── frontend/                       # React 19 + Vite Frontend Application
    ├── package.json                # Frontend package manifest and npm scripts
    ├── vite.config.js              # Vite configuration
    ├── index.html                  # HTML5 application shell
    ├── vercel.json                 # Single-page application route rewrite rules
    ├── .env                        # Local API endpoint configuration (`VITE_API_BASE_URL`)
    ├── public/                     # Static assets (logo, public images)
    └── src/
        ├── main.jsx                # Application entry point
        ├── App.jsx                 # Route declarations and layout tree
        ├── index.css               # Global glassmorphism design system & CSS variables
        ├── api/                    # Axios API service clients (auth, posts, social, team, campaigns, etc.)
        ├── context/                # React Context providers (AuthContext, NotificationContext)
        ├── components/             # Reusable UI components (Sidebar, Navbar, Modal, ProtectedRoute, etc.)
        └── pages/                  # Application views:
            ├── LandingPage.jsx     # Marketing landing page with hero overview
            ├── LoginPage.jsx       # User login with password & Google OAuth
            ├── RegisterPage.jsx    # User registration with 4 selectable roles
            ├── DashboardPage.jsx   # Main metric overview & quick scheduling widget
            ├── AccountsPage.jsx    # Social account connection & status badges
            ├── PostsPage.jsx       # Multi-tab view: Compose, Calendar, Drafts, Scheduled, Queue, Logs
            ├── CampaignsPage.jsx   # Campaign tracking, budgets, and post attachments
            ├── AnalyticsPage.jsx   # Performance charts, audience metrics, and export actions
            ├── NotificationsPage.jsx# Notification stream, preference toggles, test email modal
            ├── ProfilePage.jsx     # User profile details and name updates
            ├── SettingsPage.jsx    # Timezone configuration & notification toggles
            └── TeamPage.jsx        # Team workspace collaboration & role administration
```

---

## ⚙️ Prerequisites

Before installing SocialPilot, ensure the following tools are available on your system:

| Service / Dependency | Minimum Version | Necessity | Purpose |
|---|---|---|---|
| **Python** | `3.10` or `3.11+` | **Mandatory** | Runs the FastAPI application, Alembic, and Celery |
| **Node.js & npm** | `Node 18+`, `npm 9+` | **Mandatory** | Compiles and serves the React 19 frontend application |
| **PostgreSQL** | `14+` | **Mandatory** | Relational database (local, Supabase, or Docker) |
| **Redis** | `7.0+` | **Mandatory for Celery** | Message broker and result backend for Celery workers *(Optional if using in-process scheduler)* |
| **MongoDB / Atlas** | `6.0+` | **Optional** | Media asset storage via GridFS and social metadata cache *(Application operates with graceful degradation if omitted)* |
| **Docker & Docker Compose** | Latest Desktop | **Optional** | Recommended for containerized multi-service execution |

---

## 🔐 Environment Configuration

Environment variables are managed centrally via `backend/app/core/config.py` using `pydantic-settings`. Create a `.env` file inside the `backend/` directory by copying `backend/.env.example`.

### Categorized Environment Variables Reference

#### 1. Core Application Settings
| Variable Name | Required | Default Value | Description |
|---|---|---|---|
| `APP_ENV` | Optional | `development` | Environment mode (`development`, `production`, `testing`). |
| `APP_NAME` | Optional | `SocialPilot API` | Application title reported in Swagger docs and root endpoints. |
| `API_V1_PREFIX` | Optional | `/api/v1` | URL prefix for version 1 API endpoints. |

#### 2. Relational Database (PostgreSQL)
| Variable Name | Required | Example Placeholder | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://postgres:password@localhost:5432/socialpilot` | PostgreSQL connection string. Supports local instances or cloud providers (e.g., Supabase, Neon). |

#### 3. Document Database (MongoDB)
| Variable Name | Required | Example Placeholder | Description |
|---|---|---|---|
| `MONGODB_URI` | No | `mongodb+srv://user:pass@cluster.mongodb.net/` | MongoDB connection URI. If omitted, MongoDB storage degrades gracefully. |
| `MONGODB_DB_NAME` | No | `socialpilot` | MongoDB database name for GridFS and metadata storage. |

#### 4. JWT Authentication & Security
| Variable Name | Required | Example Placeholder | Description |
|---|---|---|---|
| `JWT_SECRET_KEY` | **Yes** | `a9f3b1e7c5...` *(64-character hex)* | Secret key for signing JWTs and deriving Fernet encryption keys. Generate via `python -c "import secrets; print(secrets.token_hex(32))"`. |
| `JWT_ALGORITHM` | Optional | `HS256` | Cryptographic algorithm for JWT encoding. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | `60` | Lifespan of user access tokens before renewal is required. |

#### 5. Background Tasks, Redis & Celery
| Variable Name | Required | Default Value | Description |
|---|---|---|---|
| `REDIS_URL` | Optional | `redis://localhost:6379/0` | Redis connection URL for caching and broker tasks. |
| `CELERY_BROKER_URL` | Optional | `redis://localhost:6379/0` | Celery message broker endpoint. |
| `CELERY_RESULT_BACKEND` | Optional | `redis://localhost:6379/0` | Celery task result backend. |
| `ENABLE_INPROCESS_SCHEDULER`| Optional | `true` | When `true`, enables the built-in 15s in-process publisher loop if Celery is not active. |
| `MAX_PUBLISH_RETRIES` | Optional | `3` | Maximum retry attempts for failed platform publishing jobs. |
| `PUBLISH_RETRY_BACKOFF_SECONDS`| Optional | `60,300,900` | Comma-separated backoff delays in seconds (1 min, 5 min, 15 min). |

#### 6. CORS & Frontend URL
| Variable Name | Required | Example Placeholder | Description |
|---|---|---|---|
| `FRONTEND_URL` | Optional | `http://localhost:5173` | Canonical URL of the client frontend application. |
| `ALLOWED_ORIGINS` | Optional | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS allowed origins. |

#### 7. Media & Public Tunnel Configuration
| Variable Name | Required | Example Placeholder | Description |
|---|---|---|---|
| `PUBLIC_BASE_URL` | Optional | `https://xxxx.a.pinggy.link` | Public HTTPS backend URL used by external platforms (Instagram, Pinterest) to download uploaded media. |
| `MAX_MEDIA_UPLOAD_SIZE_BYTES`| Optional | `262144000` *(250 MB)* | Maximum permitted upload file size in bytes. |

#### 8. Google OAuth & Social Platform Integrations
| Variable Name | Required for Live OAuth | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google Sign-in | Client ID and secret from Google Cloud Console. |
| `GOOGLE_REDIRECT_URI` | For Google Sign-in | `http://localhost:8000/api/v1/auth/google/callback` |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | For Facebook Pages | App credentials from Meta Developer Portal. |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | For Instagram Business | Instagram App credentials from Meta Portal. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | For LinkedIn | App credentials from LinkedIn Developer Portal. |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | For X (Twitter) | OAuth 2.0 Client credentials from X Developer Portal. |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | For YouTube | Google Cloud project credentials with YouTube Data API v3. |
| `PINTEREST_CLIENT_ID` / `PINTEREST_CLIENT_SECRET`| For Pinterest | App credentials from Pinterest Developer Portal. |

#### 9. Real Email & SMTP Configuration
| Variable Name | Required for Emails | Default Value | Description |
|---|---|---|---|
| `SMTP_HOST` | For Email Delivery | `smtp.gmail.com` | SMTP outgoing host address. |
| `SMTP_PORT` | For Email Delivery | `587` | Outgoing SMTP port (`587` for TLS, `465` for SSL). |
| `SMTP_USERNAME` | For Email Delivery | `your-email@gmail.com` | SMTP authentication username / sender address. |
| `SMTP_PASSWORD` | For Email Delivery | `xxxx xxxx xxxx xxxx` | SMTP password or Google 16-character App Password. |
| `SMTP_USE_TLS` | For Email Delivery | `true` | Enable STARTTLS encryption. |
| `SMTP_FROM_NAME` | Optional | `SocialPilot` | Display name of the email sender. |

#### 10. Frontend Configuration (`frontend/.env`)
Create a `.env` file inside `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL=http://localhost:5173
```

---

## 🛠️ Local Installation & Setup Guide

Follow these steps in sequence to set up and run SocialPilot locally.

### Step 1: Clone the Repository
```bash
git clone https://github.com/Govind-Verma07/SocialPilot.git
cd SocialPilot
```

---

### Step 2: Configure the Backend

#### A. Create and Activate a Python Virtual Environment
**On Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Linux / macOS (Bash):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### B. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### C. Set Up Backend Environment Variables
```powershell
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```
Open `.env` in an editor and configure:
1. `DATABASE_URL`: Ensure your PostgreSQL database exists and is reachable.
2. `JWT_SECRET_KEY`: Generate a random secret via:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

---

### Step 3: Run Database Migrations

Apply Alembic migrations to construct the PostgreSQL schema:
```bash
# Verify Alembic sees your current revision
alembic current

# Apply all migrations to the latest revision (head)
alembic upgrade head
```

To view the complete migration history:
```bash
alembic history --verbose
```

---

### Step 4: Start the Backend API Server

With your virtual environment active in `backend/`:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **Health Check Endpoint**: `http://localhost:8000/`

---

### Step 5: Start Redis and Celery Workers (Optional / Recommended)

Background post scheduling and automated retry jobs can be executed using Celery workers with a local Redis instance.

1. **Start Redis Server**:
   Ensure Redis is running on port `6379`.
   ```bash
   redis-server
   ```
   *(Or run via Docker: `docker run -d -p 6379:6379 --name socialpilot_redis redis:7-alpine`)*

2. **Start the Celery Worker**:
   Open a separate terminal in `backend/` with the virtual environment activated:
   - **On Windows (requires the solo pool)**:
     ```bash
     celery -A app.worker.celery_app worker --loglevel=info -P solo
     ```
   - **On Linux / macOS**:
     ```bash
     celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
     ```

3. **Start Celery Beat (Periodic Task Scheduler)**:
   Open another terminal in `backend/`:
   ```bash
   celery -A app.worker.celery_app beat --loglevel=info
   ```

> [!NOTE]
> **Built-in Fallback**: If you do not have Redis or Celery running locally, the backend includes an automated in-process background scheduler (`ENABLE_INPROCESS_SCHEDULER=true` in `.env`) that scans and dispatches due posts every 15 seconds.

---

### Step 6: Start the Frontend Application

Open a new terminal window in the project root:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will launch at:
- **Web Application**: `http://localhost:5173`

---

### Step 7: (Optional) Public Tunnel for Live Social OAuth Callbacks

External OAuth providers (Facebook, Google, LinkedIn) require public HTTPS redirect URIs:
```bash
# From the backend directory
python start_pinggy.py
```
This starts an SSH tunnel via Pinggy and prints a public HTTPS URL (e.g. `https://xxxx.a.pinggy.link`). Update `PUBLIC_BASE_URL` in your backend `.env` accordingly.

---

## 🗄️ Database & Alembic Migrations

SocialPilot uses a hybrid storage model:

```
+---------------------------------------------------------------------------------+
|                                 DATABASE TIERS                                  |
+------------------------------------+--------------------------------------------+
| 1. PostgreSQL (Relational)         | 2. MongoDB & GridFS (Document/Blob)        |
| - Users, Roles & Settings          | - Uploaded Images, Videos, Carousels       |
| - Teams & Member Permissions       | - Checksum Deduplication Records           |
| - Encrypted Social Accounts        | - Raw Platform JSON Responses & Caching    |
| - Posts, Drafts & Junction Records | - Non-relational Platform Insights         |
| - Recurring Rules & Occurrences    |                                            |
| - Publishing Queue & Backoff Jobs  | * Operates with graceful degradation if    |
| - Audit Trail Publishing Logs      |   MongoDB is offline or unconfigured.      |
| - Campaigns, Budgets & ROI Metrics |                                            |
+------------------------------------+--------------------------------------------+
```

### Alembic Migration History
Schema changes are managed using Alembic. The following revisions are tracked in `backend/alembic/versions/`:

1. `9dd7efe62534`: **Milestone 1 Initial Schema** — Users, Teams, Team Members, Social Accounts, Permissions, Sync Logs, and User Settings.
2. `b1c2d3e4f5a6`: **Phase 1 Content Scheduling** — Posts table, Post-SocialAccount junction table, content type, and scheduled timestamps.
3. `c1d2e3f4a5b6`: **Phase 4 Recurring Posts** — Recurring rules table, frequency configurations, interval settings, and post association.
4. `d1e2f3a4b5c6`: **Phase 5 Publishing Results** — Per-platform publishing results and platform post ID tracking.
5. `e1f2a3b4c5d6`: **Phase 6 Automated Publishing** — Automated scan flags and due post claiming fields.
6. `f1a2b3c4d5e6`: **Phase 8 Publishing Queue** — Publishing jobs table with atomic claim locks, retry counters, and next retry timestamps.
7. `g1a2b3c4d5e6`: **Phase 9 Publishing Logs** — Detailed audit logging table with event status and payload details.
8. `h1a2b3c4d5e6`: **Fix Publishing Logs Column** — Alignment of log columns and payload tracking.
9. `i1a2b3c4d5e6`: **Multi-Account Support** — Support for attaching multiple distinct social accounts to a single post.
10. `j1a2b3c4d5e6`: **Milestone 3 Campaigns & Analytics** — Marketing campaigns, budget fields, target platforms, and post metrics.
11. `k1a2b3c4d5e6`: **Milestone 4 Notification Module** — In-app notification center, unread indicators, and user notification preference models.
12. `l1a2b3c4d5e6`: **Notification Email Fields** — Delivery status tracking, idempotency keys, and SMTP error sanitization.

### Migration Commands
```bash
# Check current migration version against database
alembic current

# Upgrade database to latest schema version
alembic upgrade head

# Rollback one migration step (if ever needed)
alembic downgrade -1
```

---

## ⚡ Redis & Celery Background Processing

The background subsystem manages asynchronous publishing, rate limiting, and scheduled dispatches without blocking HTTP request threads.

### Periodic Beat Schedule (`app/worker/celery_app.py`)
| Task Identifier | Function Name | Interval | Description |
|---|---|---|---|
| `check-due-scheduled-posts-periodically` | `check_and_publish_due_posts` | **Every 15s** | Queries posts with `status='scheduled'` and `scheduled_at <= now()`, converts them to atomic queue jobs. |
| `process-queued-and-retry-jobs` | `process_queued_and_retry_jobs` | **Every 30s** | Scans for retrying jobs whose exponential backoff period has elapsed (`next_retry_at <= now()`). |
| `check-and-send-scheduled-reminders` | `check_and_send_scheduled_reminders` | **Every 60s** | Scans for upcoming scheduled posts due within 15 minutes and issues notification reminders. |
| `sync-social-analytics-periodically` | `sync_social_analytics_task` | **Every 300s** | Queries connected platform APIs to pull updated follower counts and engagement metrics. |

### Atomic Job Claiming & Retry Algorithm
1. **Atomic Claim**: When a worker claims a job, it executes an atomic update (`status='claimed'`, `claimed_by=worker_id`, `claimed_at=now()`). This prevents duplicate executions across multiple worker instances.
2. **Transient vs Permanent Failures**:
   - **Transient Errors** (e.g., HTTP 429 Rate Limit, 503 Server Error, network timeout): Job is marked `status='retrying'`. The `retry_count` is incremented, and `next_retry_at` is calculated via exponential backoff (default: `60s`, `300s`, `900s`).
   - **Permanent Errors** (e.g., Invalid OAuth token, account revoked, file format rejected): Job is immediately marked `status='failed'` without wasting retries.
3. **Audit Trail**: Every state transition writes an immutable record to the `publishing_logs` table.

---

## 🐳 Docker Compose Deployment

A complete containerized environment is defined in `docker-compose.yml`, orchestrating Redis, the FastAPI backend, a Celery worker, and Celery Beat.

```bash
# 1. Start all services in the background
docker compose up -d

# 2. Check service health and running status
docker compose ps

# 3. View live logs from the backend and Celery workers
docker compose logs -f backend
docker compose logs -f celery_worker

# 4. Stop and remove containers
docker compose down
```

### Compose Service Overview
- `socialpilot_redis`: Redis 7 Alpine image with health check (`redis-cli ping`).
- `socialpilot_backend`: FastAPI app running via Uvicorn on port `8000`.
- `socialpilot_celery_worker`: Background Celery worker process with concurrency level 2.
- `socialpilot_celery_beat`: Periodic scheduler daemon triggering scheduled tasks.

---

## 📡 API Reference & Interactive Documentation

FastAPI automatically generates interactive OpenAPI documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Summary of Verified API Endpoints

#### Authentication & Profile (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new user account; returns access token and user info. |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with email/password; returns JWT access token. |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile and assigned role. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Stateless logout endpoint. |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset account password for a verified email. |
| `GET` | `/api/v1/auth/google/url` | Public | Generate Google OAuth 2.0 authorization redirect URL. |
| `GET` | `/api/v1/auth/google/callback` | Public | Process Google OAuth authorization code and log in user. |

#### Users & Settings (`/api/v1/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/users/me` | Authenticated | Retrieve user profile information. |
| `PATCH` | `/api/v1/users/me` | Authenticated | Update mutable profile fields (`full_name`). |
| `GET` | `/api/v1/users/me/settings` | Authenticated | Retrieve user settings (timezone, preferences). |
| `PUT` | `/api/v1/users/me/settings` | Authenticated | Update user settings and timezone. |

#### Team & Workspace Collaboration (`/api/v1/teams`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/teams` | Authenticated | List all workspaces owned by or shared with the user. |
| `POST` | `/api/v1/teams` | Authenticated | Create a new team workspace. |
| `GET` | `/api/v1/teams/{team_id}` | Authenticated | Retrieve workspace details and member list. |
| `PATCH` | `/api/v1/teams/{team_id}` | Workspace Owner | Update workspace name. |
| `POST` | `/api/v1/teams/{team_id}/members` | Owner / Admin | Invite member to workspace by email with role. |
| `PATCH` | `/api/v1/teams/{team_id}/members/{id}` | Owner / Admin | Update member's workspace role (`admin`, `editor`, `viewer`). |
| `DELETE`| `/api/v1/teams/{team_id}/members/{id}` | Owner / Admin | Remove a member from the workspace. |

#### Social Account Management (`/api/v1/social`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/social/accounts` | Authenticated | List all connected social accounts and status badges. |
| `GET` | `/api/v1/social/accounts/{id}` | Authenticated | Retrieve account details, permissions, and sync history. |
| `DELETE`| `/api/v1/social/accounts/{id}` | Authenticated | Disconnect social account and revoke access. |
| `POST` | `/api/v1/social/accounts/{id}/sync` | Authenticated | Trigger manual profile and token sync for an account. |
| `GET` | `/api/v1/social/oauth/{platform}/url` | Authenticated | Generate signed OAuth 2.0 authorization URL for platform. |
| `GET` | `/api/v1/social/oauth/{platform}/callback` | Public / Redirect | OAuth callback exchange receiving code and saving encrypted tokens. |

#### Content Posts & Scheduling (`/api/v1/posts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/posts` | Authenticated | Create a post (draft, immediate dispatch, or scheduled). |
| `GET` | `/api/v1/posts` | Authenticated | List posts with pagination and status filters. |
| `GET` | `/api/v1/posts/calendar` | Authenticated | Retrieve posts for calendar view across a date range. |
| `GET` | `/api/v1/posts/drafts` | Authenticated | List posts saved in draft status. |
| `GET` | `/api/v1/posts/scheduled` | Authenticated | List posts queued for future scheduled dispatch. |
| `GET` | `/api/v1/posts/{id}` | Authenticated | Retrieve details of a specific post. |
| `PUT` | `/api/v1/posts/{id}` | Authenticated | Edit post content, scheduled date, or associated accounts. |
| `DELETE`| `/api/v1/posts/{id}` | Authenticated | Delete a post. |
| `POST` | `/api/v1/posts/{id}/publish` | Authenticated | Trigger immediate "Publish Now" across all attached accounts. |
| `GET` | `/api/v1/posts/{id}/publishing-logs` | Authenticated | Retrieve audit log events for a post. |

#### Recurring Posts (`/api/v1/recurring-posts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/recurring-posts` | Authenticated | Create a recurring schedule rule (daily, weekly, monthly). |
| `GET` | `/api/v1/recurring-posts` | Authenticated | List all active and paused recurrence rules. |
| `GET` | `/api/v1/recurring-posts/{id}` | Authenticated | Retrieve rule details and generated occurrences. |
| `PUT` | `/api/v1/recurring-posts/{id}` | Authenticated | Update rule interval, frequency, or toggle active status. |
| `DELETE`| `/api/v1/recurring-posts/{id}` | Authenticated | Delete rule and remove future unposted occurrences. |

#### Media & Asset Storage (`/api/v1/media`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/media/upload` | Authenticated | Upload image/video asset to MongoDB GridFS (up to 250MB). |
| `GET` | `/api/v1/media/{media_id}` | Authenticated | Retrieve media asset metadata document. |
| `GET` | `/api/v1/media/public/{media_id}`| Public | Public streaming endpoint for social platforms to download media. |
| `DELETE`| `/api/v1/media/{media_id}` | Authenticated | Remove asset and chunks from GridFS. |

#### Campaign Management (`/api/v1/campaigns`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/campaigns` | Authenticated | Create a marketing campaign with objectives and budget. |
| `GET` | `/api/v1/campaigns` | Authenticated | List campaigns with filters and computed tracking metrics. |
| `GET` | `/api/v1/campaigns/{id}` | Authenticated | Retrieve campaign details and engagement metrics. |
| `PUT` | `/api/v1/campaigns/{id}` | Authenticated | Update campaign timeframe, status, or budget. |
| `DELETE`| `/api/v1/campaigns/{id}` | Authenticated | Delete campaign and dissociate posts. |
| `POST` | `/api/v1/campaigns/{id}/posts` | Authenticated | Associate existing posts to this campaign. |
| `GET` | `/api/v1/campaigns/{id}/posts` | Authenticated | List all posts attached to the campaign. |

#### Analytics & Reports (`/api/v1/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/content` | Authenticated | Aggregated content performance (impressions, reach, likes, clicks). |
| `GET` | `/api/v1/analytics/audience` | Authenticated | Follower count and audience growth across connected platforms. |
| `GET` | `/api/v1/analytics/campaigns` | Authenticated | Campaign ROI, cost per engagement, and progress tracking. |
| `POST` | `/api/v1/analytics/comparison`| Authenticated | Side-by-side performance comparison of multiple campaigns. |
| `GET` | `/api/v1/analytics/export` | Authenticated | Download complete analytics report in CSV or JSON format. |

#### Notification Center (`/api/v1/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Authenticated | Paginated in-app notifications stream. |
| `GET` | `/api/v1/notifications/unread-count` | Authenticated | Badge counter of unread notifications. |
| `PATCH` | `/api/v1/notifications/{id}/read` | Authenticated | Mark a single notification as read. |
| `PATCH` | `/api/v1/notifications/read-all` | Authenticated | Mark all user notifications as read. |
| `GET` | `/api/v1/notifications/preferences` | Authenticated | Get user's granular email notification preferences. |
| `PUT` | `/api/v1/notifications/preferences` | Authenticated | Update notification delivery preferences. |
| `POST` | `/api/v1/notifications/test-email` | Authenticated | Send authenticated test email using configured SMTP settings. |

---

## 🌐 Social Platform Integrations & OAuth Flows

SocialPilot implements dedicated OAuth 2.0 authorization providers and publishing adapters across six major platforms:

```
+-------------------------------------------------------------------------------------------------------+
|                                    SUPPORTED PLATFORM MATRIX                                          |
+-------------+----------------------+------------------------------------------------+-----------------+
| Platform    | API Version          | Required OAuth Scopes                          | Media Supported |
+-------------+----------------------+------------------------------------------------+-----------------+
| LinkedIn    | v2 UGC API           | openid, profile, email, w_member_social        | Text, Image, Vid|
| Facebook    | Meta Graph v19.0     | pages_show_list, pages_manage_posts, ...        | Text, Image, Vid|
| Instagram   | Instagram Graph v19.0| instagram_business_basic, content_publish      | Image, Carousel |
| X (Twitter) | Twitter API v2       | tweet.read, tweet.write, users.read, offline   | Text, Media     |
| YouTube     | Data API v3          | https://www.googleapis.com/auth/youtube        | Video           |
| Pinterest   | Pinterest API v5     | boards:read, pins:read, pins:write             | Image Pins      |
+-------------+----------------------+------------------------------------------------+-----------------+
```

### Security & Token Protection
- **Fernet Symmetric Encryption**: Access tokens and refresh tokens are encrypted prior to database insertion (`encrypt_token`) using a key derived from `JWT_SECRET_KEY`.
- **Decrypted Just-In-Time**: Decryption occurs solely inside platform adapters at the moment of request execution (`decrypt_token`).
- **No Token Leaks**: API serialization schemas exclude raw tokens, ensuring secrets are never returned in client JSON responses or stored in plain-text logs.

### Live vs. Mock / Development Behavior
- **Sandbox / Test Mode**: If platform API keys are not supplied in `.env`, the OAuth URLs inform the user of unconfigured status. In test environments (`pytest`), mock adapters validate the end-to-end publishing pipeline cleanly without requiring live network calls.
- **External Public URL Requirement**: Platforms such as Instagram and Pinterest require a publicly accessible image/video URL to ingest media. In local environments, `start_pinggy.py` provides this public tunnel.

---

## 🧪 Testing & Verification

The repository contains an automated test suite verifying business logic, database models, background queues, and security layers.

### Running Backend Tests
Execute the test suite using pytest from the `backend/` directory:
```bash
cd backend
pytest -v
```

### Verified Test Suite Statistics
- **202 Automated Tests** across 26 test files.
- **In-Memory SQLite Fixtures**: Tests run against isolated in-memory SQLite tables, verifying migrations and ORM interactions without modifying production databases.
- **Mock MongoDB & GridFS**: Async GridFS operations run against an in-memory mock collection ensuring offline test execution.
- **Eager Celery Execution**: Celery tasks run with `task_always_eager=True`, validating worker workflows synchronously in unit tests.

### Frontend Quality Verification
Verify the frontend build and static code analysis:
```bash
cd frontend

# Run Oxlint static analysis
npm run lint

# Build production bundle
npm run build
```
- **Build Status**: Verified with Vite 8.2.2. Produces an optimized distribution bundle in `frontend/dist/` in under 1 second.

---

## 🚀 Production Deployment

### Frontend Deployment (Vercel)
The repository includes a root `vercel.json` and `frontend/vercel.json` configuring client-side routing rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
1. Deploy `frontend/` to Vercel.
2. Configure Environment Variable: `VITE_API_BASE_URL=https://socialpilot-lyart.vercel.app/`.

### Backend Deployment (Docker / Cloud Hosting)
1. **Environment Variables**: Configure the production settings detailed in [Environment Configuration](#-environment-configuration).
2. **Database Migration**: Run `alembic upgrade head` during release phase.
3. **Services Required in Production**:
   - Web Process: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Celery Worker: `celery -A app.worker.celery_app worker --loglevel=info`
   - Celery Beat: `celery -A app.worker.celery_app beat --loglevel=info`
   - Managed Redis and PostgreSQL instances.

---

## ⚠️ Known Limitations & Troubleshooting

### 1. Celery Worker on Windows
- **Issue**: Celery's default `prefork` process pool is not supported on Windows and will throw `ValueError` or freeze.
- **Solution**: Always start Celery workers on Windows using the solo pool:
  ```bash
  celery -A app.worker.celery_app worker --loglevel=info -P solo
  ```
  *(Or execute via the provided `docker-compose.yml`)*.

### 2. Public Media URLs for Instagram and Pinterest
- **Issue**: Instagram Graph API and Pinterest require an accessible public HTTPS URL to download media files. Local URLs like `http://localhost:8000/api/v1/media/...` will be rejected by Meta/Pinterest servers.
- **Solution**: Run `python start_pinggy.py` to establish an HTTPS tunnel, and assign the resulting tunnel URL to `PUBLIC_BASE_URL` in `.env`.

### 3. Google App Passwords for SMTP
- **Issue**: Attempting to send notification emails through Gmail with standard account passwords fails with authentication errors.
- **Solution**: Enable 2-Factor Authentication on your Google Account, generate a 16-character **App Password**, and use it as `SMTP_PASSWORD`.

### 4. MongoDB Optionality
- **Issue**: MongoDB connection error on startup if `MONGODB_URI` is not configured.
- **Solution**: The application handles this gracefully. MongoDB is only required for binary GridFS file uploads and metadata caching. All relational scheduling, campaigns, and user operations continue to work via PostgreSQL.

---

## 🗺️ Future Roadmap

- [ ] **AI-Powered Post Caption Generator**: Integration of LLM endpoints (e.g. Gemini API) to suggest captions, optimize tone, and suggest platform-specific hashtags.
- [ ] **Direct Social Listening & Comment Moderation**: Bi-directional webhook intake to monitor mentions, comments, and direct replies within SocialPilot.
- [ ] **Approval Workflows for Enterprise Teams**: Multi-tiered review flow requiring manager sign-off before a post can transition from `draft` to `scheduled`.
- [ ] **Dark / Light Theme Customization**: Native client-side theme switcher expanding on the current glassmorphism palette.

---

## 👥 Contributors & Acknowledgements

Developed by **Govind Verma** as part of the **Infosys Springboard Internship** project:
- **Project**: *Intelligent Social Media Scheduling and Multi-Platform Campaign Management Platform (SocialPilot)*
- **GitHub**: [@Govind-Verma07](https://github.com/Govind-Verma07)
- **Repository**: [https://github.com/Govind-Verma07/SocialPilot](https://github.com/Govind-Verma07/SocialPilot)

Special thanks to our **Infosys Springboard Mentors** for their guidance, architectural reviews, and project evaluation throughout the internship tenure.

---

<div align="center">
  
</div>
