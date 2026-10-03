# SocialPilot: Social Media Scheduler & Multi-Platform Campaign Management Platform

[![CI/CD Pipeline](https://github.com/springboardmentor28126u/Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/springboardmentor28126u/Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?style=flat&logo=postgresql)](https://neon.tech)
[![Docker](https://img.shields.io/badge/Docker-Multi--Container-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SocialPilot** is an enterprise-grade, cloud-native social media scheduling and multi-platform campaign management application. It empowers creators, marketing managers, and businesses to compose, schedule, dispatch, and analyze content across **YouTube, Twitter/X, Instagram, Facebook, LinkedIn, and Pinterest** from a single modern dashboard with what-if scenario simulations.

---

## 🚀 Key Features & Modules

- **Unified Social Media Command Center (Module 2)**: Single-click connectivity for YouTube, Twitter/X, Instagram, Facebook, LinkedIn, and Pinterest with live API validation & sandbox fallback.
- **Content Studio & Media Engine (Module 3)**: Multi-platform post composer, media upload pipeline, and character validation.
- **Intelligent Queue & Calendar Scheduler (Module 4)**: Timezone-aware scheduling engine with visual calendar queue.
- **What-If Scenario Simulation Engine (Module 5)**: Predictive simulation forecasting engagement rates and audience reach based on cadence and budget.
- **Cross-Platform Analytics Dashboard (Module 6)**: Real-time charts, impression counters, engagement rates, and platform breakdown visuals.
- **Live Notification Center (Module 7)**: Real-time alerts for publications, tokens, and campaign milestones with mark-all-read capabilities.
- **Reporting & Streaming CSV Export (Module 8)**: Tabular analytics aggregation and one-click streaming CSV report downloads.
- **Multi-Container Production Deployment (Module 9)**: Docker, Docker Compose, Nginx reverse proxy, and GitHub Actions CI/CD automation.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (React 19), Tailwind CSS v4, Recharts, Lucide Icons |
| **Backend API** | FastAPI (Python 3.12), Pydantic v2, Uvicorn ASGI Server |
| **Database & ORM** | PostgreSQL (Neon Serverless Cloud) + SQLite (In-Memory Tests) + SQLAlchemy ORM |
| **Caching** | Redis 7 Alpine |
| **Proxy & Gateway** | Nginx Alpine (Reverse proxy, Gzip compression, 50MB uploads) |
| **DevOps & CI/CD** | Docker Multi-stage, Docker Compose, GitHub Actions |

---

## ⚡ Quick Start Guide

### Option 1: Docker Compose (Recommended for Production)

Run the entire multi-container stack with a single command:
```bash
docker-compose up --build -d
```

- **Frontend Web Dashboard**: [http://localhost](http://localhost) (or `http://localhost:3000`)
- **Backend Swagger API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Diagnostic**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Option 2: Local Development Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows (or: source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Automated Testing Suite

SocialPilot includes a comprehensive Pytest automated test harness with **24 tests** and **100% pass rate**:

```bash
cd backend
pytest tests/ -v
```

### Live E2E Platform Verification
Run the 8-step live integration verification script:
```bash
python scripts/test_e2e_platform.py
```

---

## 📚 Project Documentation

- **[Master Project Documentation](PROJECT_DOCUMENTATION.md)**: Complete guide covering all 9 modules, architecture diagrams, and database schemas.
- **[Milestone 4 Delivery Report](MILESTONE_4_REPORT.md)**: Detailed report on testing, deployment, export engine, and syllabus alignment.
- **[Viva Presentation Slide Deck](docs/PRESENTATION_SLIDES.md)**: 15-slide structured presentation deck prepared for viva defense.

---

## 👤 Author & Maintainer

**Dimple Thatireddy**  
- Email: `dimplethatireddy@gmail.com`  
- Role: Lead Full-Stack SaaS Developer
