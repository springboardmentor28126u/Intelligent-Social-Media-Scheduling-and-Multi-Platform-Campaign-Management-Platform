# SocialPilot – Social Media Scheduler and Campaign Management Platform

## 1. Project Overview

SocialPilot is a web-based social media management and campaign management platform designed to centralize content creation, post scheduling, social media account management, campaign tracking, analytics, and reporting.

The platform provides a role-based interface for administrators, business users, marketing teams, and content creators. It integrates social media platforms with a centralized application to simplify content management and campaign monitoring.

The system follows a frontend-backend architecture in which the React frontend communicates with a FastAPI backend through REST APIs. PostgreSQL is used for persistent data storage.

---

## 2. Project Objectives

The primary objectives of SocialPilot are:

* To provide a centralized platform for managing social media content.
* To enable users to create and manage social media posts.
* To schedule posts for future publication.
* To manage connected social media accounts.
* To organize social media activities into campaigns.
* To track campaign targets and actual performance.
* To provide analytics for social media activities.
* To generate campaign and performance reports.
* To implement role-based access for different categories of users.
* To provide administrative functionality for managing users and system activities.

---

## 3. Key Features

### 3.1 Authentication and User Management

The application provides user authentication and account management functionality.

Users can:

* Register an account.
* Log in to the platform.
* Access their role-specific dashboard.
* Manage their account settings.
* Access features according to their assigned role.

Protected application features are accessed through authenticated API requests.

---

### 3.2 Role-Based Access Control

SocialPilot supports four primary user roles.

| Role            | Responsibilities                                                                  |
| --------------- | --------------------------------------------------------------------------------- |
| Administrator   | User management, role management, administrative monitoring, and audit activities |
| Business User   | Campaign monitoring, performance tracking, targets, and reports                   |
| Marketing Team  | Campaign management, content scheduling, analytics, and reporting                 |
| Content Creator | Content creation, post management, and scheduling                                 |

The application provides different dashboard and navigation experiences based on the user's role.

---

### 3.3 Dashboard

The dashboard provides a centralized overview of social media activities.

Depending on the user's role, the dashboard can display:

* Connected social media accounts
* Posts
* Scheduled content
* Campaign information
* Engagement metrics
* Audience-related metrics
* Recent activities
* Upcoming posts
* Campaign performance

The dashboard provides users with quick access to the major modules of the application.

---

### 3.4 Post Management

The post management module allows users to create and manage social media content.

Users can:

* Create posts.
* Enter post content.
* Select target social media platforms.
* Upload media.
* Preview content.
* Save content for later use.
* Schedule posts.
* Publish posts where the required platform integration is available.

The application uses a reusable post creation interface through the `CreatePostModal` component.

---

### 3.5 Content Calendar

The Calendar module provides a visual representation of scheduled content.

Users can:

* View scheduled posts.
* Review upcoming posts.
* Inspect post information.
* Organize content based on scheduled dates.
* Manage scheduled content.

The calendar provides a centralized view for planning social media publishing activities.

---

### 3.6 Publishing Queue

The Queue module provides a centralized view of scheduled and pending publishing activities.

It can be used to:

* Review scheduled posts.
* Monitor publishing status.
* Identify posts requiring attention.
* Track publishing activities.

The queue helps users monitor the status of content throughout the publishing workflow.

---

## 4. Social Media Account Management

The Accounts module provides functionality for managing connected social media accounts.

SocialPilot currently includes integration work for:

* LinkedIn
* Instagram

The account management module allows users to view connected accounts and use them as target platforms for social media activities.

Additional platforms can be integrated by configuring their respective developer applications, credentials, permissions, and APIs.

---

## 5. LinkedIn Integration

SocialPilot includes LinkedIn API integration for authentication, account connection, and content publishing.

### 5.1 LinkedIn OAuth Flow

The LinkedIn authentication process follows the OAuth authorization flow:

```text
SocialPilot
    |
    v
Connect LinkedIn
    |
    v
LinkedIn Authorization
    |
    v
User Grants Permission
    |
    v
OAuth Callback
    |
    v
Backend Processes Authorization
    |
    v
LinkedIn Account Connected
```

The callback endpoint used by the backend is:

```text
/api/linkedin/callback
```

For local development:

```text
http://localhost:8000/api/linkedin/callback
```

### 5.2 LinkedIn Configuration

LinkedIn credentials should be stored using environment variables.

Example:

```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8000/api/linkedin/callback
```

Sensitive credentials must not be hard-coded into source files or committed to version control.

### 5.3 LinkedIn Functionality

The integration supports:

* LinkedIn account connection.
* OAuth-based authentication.
* LinkedIn account information retrieval.
* Content publishing.
* Integration with the SocialPilot post creation workflow.

---

## 6. Instagram Integration

SocialPilot also includes Instagram API integration.

The integration provides functionality for connecting Instagram accounts and incorporating Instagram into the application's social media management workflow.

The backend includes an Instagram callback route:

```text
/api/instagram/callback
```

For local development environments that require an externally accessible callback URL, a secure tunneling service can be used.

Instagram credentials should be stored using environment variables and must not be committed to source control.

---

## 7. Campaign Management

The Campaigns module allows users to organize related social media activities under a common marketing campaign.

Campaign information can include:

* Campaign name
* Campaign description
* Budget
* Target metrics
* Actual performance
* Campaign status
* Associated posts

Example:

```text
Campaign: Product Launch 2026
Budget: ₹50,000
Target Reach: 100,000
Actual Reach: 82,000
Status: Active
```

Campaign management provides a structured way to organize and monitor marketing activities.

---

## 8. Campaign Tracking

Campaign Tracking is used to compare planned campaign targets with actual performance.

The tracking interface can display:

* Campaign budget
* Amount spent
* Target values
* Actual values
* Campaign progress
* Performance comparison

Example:

```text
Target Reach : 100,000
Actual Reach : 82,000
Progress     : 82%
```

This comparison allows users to understand the current progress of a campaign and identify differences between planned and achieved results.

---

## 9. Analytics

The Analytics module provides an overview of social media performance.

The module can display information related to:

* Engagement
* Audience growth
* Platform performance
* Post performance
* Campaign performance
* Content activity

Analytics help users understand the performance of their social media activities and campaigns.

---

## 10. Reports

The Reports module provides structured information about campaign and social media performance.

Reports can contain:

* Campaign performance
* Post activity
* Engagement information
* Platform performance
* Audience-related metrics
* Target versus actual performance
* Budget and spending information

The application provides a dedicated Reports page for viewing report information.

---

## 11. Campaign Performance Comparison

SocialPilot provides comparison-based campaign reporting.

The application can present campaign information using target and actual values.

| Metric          |       Target |       Actual |
| --------------- | -----------: | -----------: |
| Reach           | Target value | Actual value |
| Engagement      | Target value | Actual value |
| Campaign Metric | Target value | Actual value |

Budget-related information can also be displayed:

| Budget Metric   |             Value |
| --------------- | ----------------: |
| Campaign Budget | Configured budget |
| Amount Spent    | Recorded spending |

These comparisons help users evaluate campaign progress and performance.

---

## 12. Administrator Module

The Administrator module provides system-level management functionality.

### 12.1 User Management

Administrators can access the user management interface to view and manage registered users.

### 12.2 Role Management

The role management module provides functionality for managing user roles and permissions.

### 12.3 Audit Logs

The audit log module provides a record of administrative and system-related activities.

The frontend includes dedicated pages for:

```text
AdminUsersPage
AdminRolesPage
AdminAuditLogsPage
```

---

## 13. Activity and Notifications

The application provides activity-related components for displaying recent events and updates.

Activities can include:

* Post-related activities
* Campaign activities
* Account activities
* System events
* User-related actions

The activity interface allows users to monitor important events within the application.

---

## 14. Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* CSS

### Backend

* Python
* FastAPI
* REST API

### Database

* PostgreSQL

### External Integrations

* LinkedIn API
* Instagram API

### Development Tools

* Git
* GitHub
* Visual Studio Code
* Postman
* ngrok for local callback testing where required

---

## 15. Frontend Architecture

The frontend is implemented using React and TypeScript.

The main frontend structure is:

```text
frontend/
└── src/
    ├── assets/
    ├── components/
    ├── context/
    ├── layouts/
    ├── pages/
    ├── routes/
    ├── services/
    ├── App.tsx
    ├── App.css
    ├── index.css
    └── main.tsx
```

### Components

Reusable components include:

```text
components/
├── ActivityItem.tsx
├── ChartCard.tsx
├── CreatePostModal.tsx
├── EngagementOverview.tsx
├── MarketingDashboard.tsx
├── MetricCard.tsx
├── Navbar.tsx
├── PostCard.tsx
├── QuickAction.tsx
├── SecondaryMetricCard.tsx
├── Sidebar.tsx
├── StatCard.tsx
├── ToastContainer.tsx
├── TopPerformingPost.tsx
├── UpcomingPost.tsx
└── UserAvatar.tsx
```

---

## 16. Application Pages

The frontend contains dedicated pages for the major modules.

```text
pages/
├── Accounts.tsx
├── AccountsPage.tsx
├── AdminAuditLogsPage.tsx
├── AdminRolesPage.tsx
├── AdminUsersPage.tsx
├── AnalyticsPage.tsx
├── CalendarPage.tsx
├── Campaigns.tsx
├── CampaignsPage.tsx
├── Dashboard.tsx
├── ForgotPassword.tsx
├── LandingPage.tsx
├── Login.tsx
├── Posts.tsx
├── PrivacyPolicy.tsx
├── QueuePage.tsx
├── Register.tsx
├── ReportsPage.tsx
├── SettingsPage.tsx
└── TeamPage.tsx
```

---

## 17. Backend Architecture

The backend is implemented using FastAPI.

The backend is responsible for:

* Authentication
* User management
* Role-based access
* Post management
* Campaign management
* Analytics
* Reports
* Social account management
* Social media integrations
* Administrative operations

The frontend communicates with the backend using REST APIs.

---

## 18. Database

PostgreSQL is used as the primary database.

The database is responsible for storing application data associated with:

* Users
* Roles
* Posts
* Campaigns
* Social media accounts
* Analytics information
* Reports
* Publishing activities

The FastAPI backend communicates with the PostgreSQL database through the application's database layer.

---

## 19. API Architecture

The communication flow between the major system components is:

```text
React Frontend
       |
       | REST API
       v
FastAPI Backend
       |
       +----------------+
       |                |
       v                v
PostgreSQL        Social Media APIs
                     |
                +----+----+
                |         |
             LinkedIn  Instagram
```

The frontend API service is located at:

```text
src/services/api.ts
```

---

## 20. API Modules

The backend API is organized around the following functional areas:

| Module          | Purpose                                      |
| --------------- | -------------------------------------------- |
| Authentication  | User registration, login, and authentication |
| Users           | User information and management              |
| Posts           | Create, manage, schedule, and publish posts  |
| Campaigns       | Campaign creation and management             |
| Analytics       | Performance and engagement information       |
| Reports         | Campaign and performance reporting           |
| Social Accounts | Connected social media account management    |
| LinkedIn        | LinkedIn authentication and publishing       |
| Instagram       | Instagram account integration                |
| Administration  | User, role, and audit management             |

The exact available endpoints depend on the current backend implementation.

---

## 21. Security

Security considerations include:

* Authentication for protected features.
* Role-based access control.
* Environment variables for sensitive credentials.
* OAuth-based social media authentication.
* Separation of frontend and backend responsibilities.
* Protection of API credentials from frontend source code.

Example environment configuration:

```env
DATABASE_URL=your_database_url

LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=your_callback_url

INSTAGRAM_CLIENT_ID=your_client_id
INSTAGRAM_CLIENT_SECRET=your_client_secret
INSTAGRAM_REDIRECT_URI=your_callback_url
```

Real credentials must never be committed to GitHub.

---

## 22. Installation and Setup

### 22.1 Prerequisites

The following software is required:

* Node.js
* npm
* Python 3.11 or later
* PostgreSQL
* Git

---

### 22.2 Clone the Repository

```bash
git clone <repository-url>
cd socialpilot
```

---

### 22.3 Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables.

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

```text
http://localhost:8000
```

FastAPI Swagger documentation:

```text
http://localhost:8000/docs
```

---

### 22.4 Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The terminal will display the local frontend URL.

---

## 23. Application Workflow

The overall workflow of SocialPilot is:

```text
User Authentication
        |
        v
Role-Based Dashboard
        |
        v
Connect Social Account
        |
        v
Create Post
        |
        v
Select Platform
        |
        v
Preview Content
        |
        +-------------------+
        |                   |
        v                   v
   Publish Now          Schedule Post
        |                   |
        +---------+---------+
                  |
                  v
            Post Management
                  |
                  v
          Campaign Management
                  |
                  v
           Campaign Tracking
                  |
                  v
              Analytics
                  |
                  v
               Reports
```

---

## 24. Project Structure

```text
SocialPilot/
|
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── ...
|
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   └── package.json
|
├── .env
├── README.md
└── ...
```

---

## 25. Testing and Verification

The application can be verified using the following methods.

### Frontend Build

```bash
npm run build
```

This verifies that the frontend can be compiled successfully.

### Backend API Testing

FastAPI provides interactive API documentation at:

```text
http://localhost:8000/docs
```

The available endpoints can be tested using the Swagger interface.

API requests can also be tested using tools such as Postman.

---

## 26. Current Social Media Integration Status

| Platform    | Status              |
| ----------- | ------------------- |
| LinkedIn    | Integrated          |
| Instagram   | Integrated          |
| Facebook    | Integration pending |
| YouTube     | Integration pending |
| X / Twitter | Integration pending |
| Pinterest   | Integration pending |

The current implementation and project demonstration primarily focus on LinkedIn and Instagram integrations.

Additional integrations require the corresponding developer applications, credentials, permissions, and API configuration.

---

## 27. Major Application Modules

The major modules of the platform are:

```text
Authentication
       |
       v
Dashboard
       |
       v
Accounts
       |
       v
Posts
       |
       v
Calendar
       |
       v
Queue
       |
       v
Campaigns
       |
       v
Analytics
       |
       v
Reports
       |
       v
Administration
```

---

## 28. Intended Users

SocialPilot is intended for:

* Social media marketing teams
* Content creators
* Businesses
* Marketing managers
* Digital marketing teams
* Organizations managing multiple social media activities

The platform provides a centralized environment for managing social media content and monitoring campaign performance.

---

## 29. Future Enhancements

Future versions of SocialPilot can include:

* Additional social media API integrations.
* Advanced social media analytics.
* Automated content recommendations.
* AI-assisted content generation.
* AI-based post performance analysis.
* Advanced audience insights.
* Automated campaign optimization.
* Enhanced scheduling capabilities.
* Advanced reporting and visualization.
* Improved notification mechanisms.
* Advanced team collaboration.
* Additional automation features.

---

## 30. Conclusion

SocialPilot provides a centralized solution for social media content management, scheduling, campaign management, performance tracking, analytics, and reporting.

The system combines a React and TypeScript frontend, FastAPI backend, PostgreSQL database, and social media API integrations to provide a structured workflow for social media management.

The modular architecture allows the platform to be extended with additional social media integrations, analytics capabilities, automation features, and AI-powered functionality in future development.

---

## 31. Project Information

| Category            | Details                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| Project Name        | SocialPilot – Social Media Scheduler and Campaign Management Platform           |
| Project Type        | Social Media Management and Campaign Analytics Platform                         |
| Frontend            | React, TypeScript, Vite, Tailwind CSS                                           |
| Backend             | Python, FastAPI                                                                 |
| Database            | PostgreSQL                                                                      |
| APIs                | REST APIs                                                                       |
| Social Integrations | LinkedIn, Instagram                                                             |
| Authentication      | Application Authentication and OAuth-based Social Integration                   |
| Architecture        | Frontend–Backend REST Architecture                                              |
| Primary Modules     | Posts, Calendar, Queue, Campaigns, Analytics, Reports, Accounts, Administration |
