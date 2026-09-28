# 🚀 IntelliPost — Plan. Post. Perform.

> **Intelligent Social Media Management & Multi-Platform Scheduling SaaS Platform**

---

## 🌟 Overview

**IntelliPost** is a full-stack, enterprise-grade social media management workspace that empowers creators, businesses, and marketing teams to create, AI-adapt, schedule, publish, and analyze social content across **Instagram, Facebook, LinkedIn, X (Twitter), YouTube, and Pinterest** from one unified platform.

---

## 🛠️ Technology Stack

| Area | Technology |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Styling & UI** | Tailwind CSS + Lucide Icons + Custom Modern Design System |
| **Backend Framework** | FastAPI (Python 3.11+) + Uvicorn |
| **ORM & Database** | SQLAlchemy 2.0 + SQLite (Default zero-config) / PostgreSQL |
| **Security & Auth** | JWT (JSON Web Tokens) + PBKDF2 Password Hashing |
| **AI Co-Pilot** | IntelliPost Native Multi-Platform Content Adapter Engine |
| **Scheduler** | Asynchronous Background Worker with Interval Triggers |

---

## 🎨 Brand Design System

- **Primary**: `#635BFF` (Electric Indigo)
- **Secondary**: `#7C3AED` (Royal Purple)
- **Accent**: `#06B6D4` (Cyan)
- **Success**: `#10B981` (Emerald)
- **Warning**: `#F59E0B` (Amber)
- **Danger**: `#EF4444` (Rose)
- **Background**: `#F8FAFC` (Clean Slate)
- **Dark**: `#0F172A` (Midnight Slate)

---

## 📂 Project Architecture

```
IntelliPost/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI Application Entrypoint
│   │   ├── core/
│   │   │   ├── config.py               # Settings & Environment Variables
│   │   │   ├── security.py             # Password Hashing & JWT
│   │   │   └── database.py             # SQLAlchemy Session & Engine
│   │   ├── models/                     # Database Models (User, Post, Team, SocialAccount, etc.)
│   │   ├── schemas/                    # Pydantic Request/Response Schemas
│   │   ├── routers/                    # REST API Endpoints (/posts, /analytics, /ai, etc.)
│   │   └── services/                   # Business Logic (AI Service, Scheduler, Seeder)
│   ├── requirements.txt
│   └── .env.example
│
├── nexora/ (Frontend)
│   ├── app/
│   │   ├── page.tsx                    # 15-Section Public Marketing Landing Page
│   │   ├── features/                   # In-depth Feature Breakdown
│   │   ├── pricing/                    # 3-Tier Pricing with Billing Switch
│   │   ├── about/                      # Mission, Vision, and Values
│   │   ├── contact/                    # Interactive Support & Contact Form
│   │   ├── login/ & register/          # Auth Pages with 1-Click Demo Login
│   │   └── dashboard/                  # Full Web App Workspace
│   │       ├── page.tsx                # Main KPIs, Trends & Platform Overview
│   │       ├── calendar/               # Month/Week/Day Content Calendar
│   │       ├── create-post/            # Post Composer + AI Co-Pilot & Device Previews
│   │       ├── campaigns/              # Campaign Management & Progress Tracking
│   │       ├── analytics/              # Deep Charts & Platform Reach Comparison
│   │       ├── social-accounts/        # Social Accounts Hub & Token Health
│   │       ├── team/                   # Team Management & RBAC Permissions Matrix
│   │       ├── reports/                # Reports Center + PDF & Excel/CSV Export
│   │       ├── notifications/          # Real-time Notifications Center
│   │       └── settings/               # Profile, AI Tuning & API Key Settings
│   ├── components/                     # Previews (Instagram, LinkedIn, X, FB), Navbar, Sidebar
│   └── lib/                            # API Client, Auth Session, Formatters
│
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Start the FastAPI Backend

```bash
cd backend
# Optional: create & activate virtual environment
# python -m venv venv && venv\Scripts\activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run the backend server
python -m uvicorn app.main:app --reload --port 8000
```
- **Backend API**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

### 2. Start the Next.js Frontend

```bash
cd nexora
npm run dev
```
- **Frontend App**: `http://localhost:3000`

---

## 🔑 Demo Login Credentials

- **Email**: `admin@intellipost.com`
- **Password**: `password123`
*(Or click the "Fill Demo" button on `/login` for 1-click access!)*
