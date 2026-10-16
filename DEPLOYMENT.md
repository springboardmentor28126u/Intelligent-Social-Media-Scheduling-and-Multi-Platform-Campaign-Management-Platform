# Deployment

SocialPilot is deployed on free hosting tiers. This page explains how the live version is put together and how to operate it. It contains no secrets, only the names of the settings.

## Live demo

- Frontend: https://socialpilot-app-lemon.vercel.app
- API: https://socialpilot-deploy.onrender.com

The API runs on a free Render service that sleeps after about 15 minutes without traffic. The first request after a pause can take around 50 seconds while it wakes up.

## Architecture

| Part | Service | Notes |
| --- | --- | --- |
| Frontend (React + Vite) | Vercel | Root directory `frontend`; `VITE_API_URL` points at the API |
| API (FastAPI) | Render web service (Docker) | Root directory `Backend`; runs Alembic migrations on start, then gunicorn |
| Database | Neon (PostgreSQL) | Direct connection string in `DATABASE_URL` |
| Publishing worker | GitHub Actions | Runs `publishing_worker.py --once`, started manually |

The frontend's `vercel.json` Content-Security-Policy `connect-src` must include the API origin, otherwise the browser reports "Failed to fetch".

## Settings

The backend is configured only through environment variables. Nothing is read from a committed file in production (`APP_ENV=production`).

Required on the API and on the worker (the same values in both places):

- `DATABASE_URL`
- `JWT_SECRET_KEY` (at least 32 characters)
- `SOCIAL_TOKEN_KEY` (a valid Fernet key; it must be identical on the API and the worker, or saved social tokens cannot be decrypted)
- `CORS_ORIGINS` (explicit HTTPS origin of the frontend)

Per platform (client ID, client secret and redirect URI for each):

- Facebook: `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_REDIRECT_URI`
- Instagram: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `INSTAGRAM_REDIRECT_URI`
- YouTube: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`, `YOUTUBE_PRIVACY_STATUS`
- Shared: `META_GRAPH_VERSION`

Each redirect URI must also be registered, character for character, in that platform's developer console. See `Backend/OAUTH_CALLBACK_CHECKLIST.md`.

Do not set `FORWARDED_ALLOW_IPS` to a CIDR range on Render. Gunicorn rejects it and the service fails to start.

## Connected platforms

- Instagram, Facebook and YouTube are connected through OAuth and publish from the live site.
- The Meta app is in test mode, so only added testers and test accounts can connect.
- YouTube uploads are set to private for testing.
- X needs paid API credits and is not enabled. LinkedIn needs a verified Company Page and is not enabled.

## Publishing worker

Posts are stored as scheduled jobs. A separate worker publishes the ones that are due. A free Render service has no background worker, so the worker runs as a GitHub Actions workflow instead.

- Workflow: `.github/workflows/publishing-worker.yml`
- Command: `python publishing_worker.py --once --audience-hours 0 --engagement-minutes 0`
- Trigger: manual only (`workflow_dispatch`). Open the repository's Actions tab, choose Publishing worker, and click Run workflow. Due posts are published about a minute later.
- The workflow reads the settings above from repository secrets with the same names.
- Only one run happens at a time (a concurrency group prevents overlap).

The workflow is manual on purpose. A 5-minute schedule would need roughly 8,600 Actions minutes a month, far above the free allowance for a private repository, and it would publish without anyone clicking. The schedule lines are present in the file but commented out.

For a server with a permanent process, `docker-compose.yml` has a `workers` profile that runs the publishing and notification workers continuously.

## Checking a deployment

1. Open the frontend, register an account and sign in.
2. Connect a platform from Social Accounts.
3. Create a post and schedule it, or use Publish now.
4. Run the Publishing worker workflow and wait for it to finish.
5. Check the post's status on the Posts page, and check the platform itself.

If a post stays Scheduled, the worker has not run yet. If it shows Failed, open the post's Details and View logs.

## Security notes

- Secrets live only in Render, Vercel and GitHub Actions secrets, never in the repository. `.env`, `.env.social.local` and `frontend/.env.local` are ignored by Git.
- Social account tokens are stored encrypted with `SOCIAL_TOKEN_KEY`.
- The API enforces the role rules on the server: only content creators connect accounts, schedule and publish; managers draft and approve; business users and administrators are view-only.
- Registration and login are rate limited by client IP, using the proxy-aware address behind Render. Passwords must be at least 8 characters.
- The frontend sends CSP and HSTS headers.
- Rotate any secret that has ever been committed or shown on screen, and update it in all three places (local, Render, GitHub).
