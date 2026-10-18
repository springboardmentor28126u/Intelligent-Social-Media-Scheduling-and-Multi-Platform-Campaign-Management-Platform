\# SocialPilot — Social Media Management Platform



\## 1. Project Overview



SocialPilot is a web-based social media management platform designed to manage social media posts, scheduling, campaigns, and analytics from one place.



The project provides a centralized dashboard to help users organize content and monitor social media management activities.



\## 2. Project Objectives



\- Manage social media posts from one dashboard.

\- Create and organize post drafts.

\- Schedule content for future dates.

\- Manage social accounts and campaigns.

\- View analytics and report summaries.

\- Export report data as CSV files.



\## 3. Key Features



\### Dashboard

\- Overview of posts, scheduled content, engagement, and followers.

\- Recent post information.

\- Social account connection status.

\- Quick actions for common tasks.



\### Posts and Scheduling

\- Create and manage posts.

\- Save drafts.

\- Schedule posts.

\- View scheduled content in a calendar.

\- Track publishing workflow and logs.



\### Social Account Management

\- View supported social platform accounts.

\- Manage account connection information.



\### Campaign Management

\- Create and manage campaigns.

\- Maintain campaign details and dates.

\- Track campaign status.



\### Analytics and Reports

\- View analytics metrics.

\- Review report summaries.

\- Export available report data as CSV.



\## 4. Technology Stack



| Component | Technology |

|---|---|

| Frontend | React |

| Frontend build tool | Vite |

| Backend | Python and Flask |

| Database | Supabase |

| Routing | React Router |

| Icons | Lucide React |

| Charts | Recharts |

| Version control | Git and GitHub |



\## 5. Project Structure



```text

SocialPilot/

├── backend/

│   └── app/

├── database/

├── frontend/

│   ├── public/

│   ├── src/

│   ├── package.json

│   └── .env

├── .env.example

├── .gitignore

├── app.py

├── docker-compose.yml

├── LICENSE

├── MILESTONES.md

└── README.md

```



The exact files inside each directory may vary as development continues.



\## 6. Prerequisites



Install the following tools:



\- Python

\- Node.js and npm

\- Visual Studio Code

\- A Supabase project



\## 7. Frontend Setup



Open a terminal and navigate to the frontend directory:



```bash

cd frontend

npm install

```



Create or configure the frontend environment file named `.env`:



```env

VITE\_SUPABASE\_URL=your\_supabase\_project\_url

VITE\_SUPABASE\_ANON\_KEY=your\_supabase\_publishable\_key

```



Replace the placeholder values with the appropriate values from your Supabase project.



Start the development server:



```bash

npm run dev

```



Open the local URL printed in the terminal, usually `http://localhost:5173/`.



To build the frontend for production:



```bash

npm run build

```



\## 8. Backend Setup



The backend uses Python and Flask.



Navigate to the backend application directory:



```bash

cd backend/app

```



Activate your configured Python virtual environment and install the dependencies listed in the backend requirements file, if present.



Start the backend using the application's configured entry point. For example, if `app.py` defines the Flask application:



```bash

python app.py

```



Use the actual application entry point and dependency file present in the repository.



\## 9. Database Configuration



SocialPilot uses Supabase for database storage.



Configure the required environment variables and ensure the database tables and columns match the application's implementation.



Never commit private credentials, service-role keys, passwords, or other secrets to GitHub. Use environment variables and secure deployment settings.



Before public deployment, configure and test appropriate database Row Level Security (RLS) policies.



\## 10. Development Milestones



\### Milestone 1 — Core Application

\- Project setup.

\- Authentication and dashboard foundation.

\- Social account management.

\- Post creation and basic scheduling.

\- Database integration.



\### Milestone 2 — Scheduling Workflow

\- Calendar and content scheduling.

\- Draft management and previews.

\- Publishing queue and logs.

\- Multi-platform scheduling workflow.



\### Milestone 3 — Campaigns and Analytics

\- Campaign management.

\- Analytics dashboard.

\- Report summaries and CSV export.



\### Milestone 4 — Testing and Deployment Preparation

\- Application and authentication testing.

\- Frontend production build verification.

\- Backend startup and database connection checks.

\- Documentation and deployment preparation.



These milestone descriptions reflect the current project prototype; individual features should be verified against the source code.



\## 11. Current Limitations and Deployment Status



\- Live publishing to external social media platforms requires the relevant platform APIs, OAuth integration, and credentials.

\- Analytics and publishing results should be verified against real platform data before production use.

\- Public cloud deployment and a live website URL must be confirmed separately.

\- Security policies, authentication, environment variables, and database access must be reviewed before public release.



\## 12. Version Control



The project is maintained in GitHub on the `Meghana-Tottempudi` development branch.



Use Git to track changes and push verified updates to the repository.



\## 13. Future Improvements



\- Complete official social platform API integrations.

\- Enhance analytics and campaign performance reports.

\- Strengthen authentication and database security.

\- Deploy the frontend and backend to cloud hosting.

\- Add automated testing and monitoring.



\## 14. Conclusion



SocialPilot is a social media management prototype that brings post organization, scheduling workflows, campaign management, and analytics into one application. Further integration, testing, and deployment work can extend it into a more complete platform.



