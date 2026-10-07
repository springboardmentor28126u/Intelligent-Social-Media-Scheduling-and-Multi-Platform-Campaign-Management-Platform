# Local Docker verification

This stack is for isolated local testing, not deployment. Do not use its public
dummy credentials for real accounts. Docker Desktop must show Engine running;
`docker info` must succeed with Linux containers. Windows requires WSL 2 and
working virtualization. Installation, terms, reboots and system settings are
operator actions. Docker Desktop sign-in is not needed for this tested stack.

Run PowerShell from `C:\Users\Aryan\OneDrive\Desktop\SocialPilot_1`. Open a fresh
terminal after installation so Docker's CLI and credential helper are on PATH.
Do not use the separate GitHub submission folder.

## Configuration and ports

Copy only `.env.docker.example` to the ignored `.env.docker`, only when the latter
does not already exist. Never copy Backend/.env, Backend/.env.social.local or
frontend/.env.local. Build contexts exclude all environment files, caches, logs
and dumps; Vite has environment-file loading disabled. No host folders are mounted.

The example already contains public dummy values, so nothing needs filling in for
the smoke test. These identifiers are the configuration fields, never credentials
to paste into chat:

| Variable | Purpose |
|---|---|
| POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD | Throwaway container database only |
| DATABASE_URL | Must match those dummy credentials; hostname postgres, internal port 5432 |
| JWT_SECRET_KEY | Dummy signing key, at least 32 characters |
| SOCIAL_TOKEN_KEY | Valid public dummy Fernet key for this empty database only; never copy it over an existing real key |
| CORS_ORIGINS | Explicit localhost/127.0.0.1 origins matching WEB_PORT |
| API_PORT, WEB_PORT | Host defaults 18000 and 15173, bound to loopback |
| VITE_API_URL | Public frontend build argument; /api uses nginx proxy; rebuild frontend after changes |
| Provider client IDs/secrets/redirects, META_GRAPH_VERSION, SMTP/VAPID | Blank for this test; never supply real credentials or start delivery workers |

Backend internal port is 8000; nginx internal port is 8080. PostgreSQL has no host
port, so the real localhost:5432 database and local app ports 8000/5173 stay separate.
The project name scopes the database volume and network. Shell interpolation
variables can override the example: use a fresh terminal without conflicting
POSTGRES_*, API_PORT, WEB_PORT or VITE_API_URL variables. See
[Compose precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/).

## Build and start

```powershell
Set-Location 'C:\Users\Aryan\OneDrive\Desktop\SocialPilot_1'
if (-not (Test-Path -LiteralPath .env.docker)) {
    Copy-Item -LiteralPath .env.docker.example -Destination .env.docker
}
docker info
docker compose -p socialpilot-docker-test --env-file .env.docker config --quiet
docker compose -p socialpilot-docker-test --env-file .env.docker build backend frontend publishing-worker
docker compose -p socialpilot-docker-test --env-file .env.docker up -d --wait --wait-timeout 180 postgres backend frontend publishing-worker
docker compose -p socialpilot-docker-test --env-file .env.docker ps
```

The backend runs `alembic upgrade head` before Gunicorn starts with
uvicorn_worker.UvicornWorker. Single head: a21c4e810014. Backend and publishing
worker run as UID 10001; nginx runs as UID 101. Services have restart policies;
database/backend/frontend/publishing worker have healthchecks. The worker check
verifies its PID 1 command and database connectivity. Workers wait for a healthy API.

Publishing-worker is a separate optional service. Its explicit selection enables
only that service, not notification-worker. Automatic audience/engagement refresh
is disabled in the Compose command; polling interval is 10 seconds. No real
accounts exist in this dummy stack. Do not reuse this run with real provider data.

Open `http://localhost:15173`; API health is `http://127.0.0.1:18000/health`.
Production mode is enforced: /docs, /redoc and /openapi.json return 404.

## Smoke, logs and shutdown

```powershell
docker compose -p socialpilot-docker-test --env-file .env.docker exec -T backend python smoke_docker.py
docker compose -p socialpilot-docker-test --env-file .env.docker exec -T backend python -m alembic heads
docker compose -p socialpilot-docker-test --env-file .env.docker --profile workers logs --tail 50 postgres backend frontend publishing-worker
docker compose -p socialpilot-docker-test --env-file .env.docker --profile workers down
```

The smoke script uses only the Compose postgres service. It creates a synthetic
user, signs in through nginx, creates a draft, schedules a demo-marked future job,
downloads PDF/XLSX and cancels jobs. It never authorizes a provider. Treat logs as
private even after this dummy-only check; do not paste logs from real deployments.
Avoid `docker compose config` without --quiet or dumping container environments.

`down` removes only this named stack's containers/network and retains its database.
To reset **only its throwaway database**, use this instead:

```powershell
docker compose -p socialpilot-docker-test --env-file .env.docker --profile workers down --volumes
```

This removes its named postgres_data volume and attached anonymous volumes. Do
not use this reset command on a real data project. Images and build cache are
retained; no files are deleted. See [Docker down behavior](https://docs.docker.com/reference/cli/docker/compose/down/).

## Instagram and Facebook callbacks

Real connection is outside this test. When separately approved, Docker's API needs
an HTTPS tunnel to **host port 18000**, with the exact /oauth/instagram/callback and
/oauth/facebook/callback URLs registered in Meta and configured in the Docker-only
runtime environment. The existing local tunnel helper targets port 8000; it is
not the Docker port. Never copy real local configuration into images. Restart the
API after changing runtime callbacks. Preserve the original SOCIAL_TOKEN_KEY for
any existing real database; the example dummy key is only for disposable data.

## Verification record — 6 October 2026

Docker Desktop 4.94.0 / Linux Engine 29.8.2 built and ran the stack. All four
services became healthy. API health, disabled production docs, frontend/SPA,
proxy, signup/login, authenticated draft creation, future scheduling and PDF/XLSX
exports passed. No live publishing, OAuth, email or push was performed.
Publishing-worker had zero restarts/errors; notification-worker never started.

139 backend tests passed with zero failures/skips inside the Linux backend,
against disposable PostgreSQL schemas in this stack. Tests were copied at runtime
(not baked into images). The initial /tmp fixture location caused six migration
path errors; rerunning at the expected /app/tests location passed the full suite.
22 frontend tests, lint and build passed. Single migration head remains 014.

Scanned image configuration/history, stack logs and both worker log streams for
the known dummy credentials: none appeared. Exported images: 28 unique layers,
13,328 files, 52 /app files; no protected environment paths or dummy credentials
were found in any layer. Application/frontend layers contained no private-key
markers. This does not claim detection of every possible unknown secret; real
environment files were never opened and were excluded before build.

Actual test project: socialpilot-docker-qa-5580e760. Created and subsequently removed
containers: its postgres-1, backend-1, frontend-1 and publishing-worker-1; network
socialpilot-docker-qa-5580e760_default; named volume
socialpilot-docker-qa-5580e760_postgres_data. No anonymous volumes were created.
Removed resources are recorded only after teardown verification. No pre-existing
Docker containers or volumes existed at the start.

Retained images: socialpilot-docker-qa-5580e760-backend,
socialpilot-docker-qa-5580e760-publishing-worker,
socialpilot-docker-qa-5580e760-frontend and pulled postgres:17-alpine. Backend base
python:3.12-slim, build-stage node:24-alpine and nginx-unprivileged:stable-alpine
layers/build cache may also remain. No image or global cache pruning was run.

The ignored dummy .env.docker and system-temp folder
`C:\Users\Aryan\AppData\Local\Temp\socialpilot-docker-qa-5580e76096c44885a98c407ee1749e96`
(including exported images.tar and synthetic test logs) are retained for the owner
to remove manually. No local files, real PostgreSQL data or dumps were deleted.
