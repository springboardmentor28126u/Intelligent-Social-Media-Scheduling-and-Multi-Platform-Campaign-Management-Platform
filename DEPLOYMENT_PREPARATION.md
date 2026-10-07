# Deployment preparation — approval required before execution

No cloud resources have been created, no database has been uploaded, and no provider messages have been sent. The settings below are a runbook, not a deployment record. Local Docker verification passed with disposable data on 6 October 2026; see [Docker runbook](docs/DOCKER.md). Cloud verification remains separate.

## Service settings

| Service | Exact configuration |
| --- | --- |
| Vercel frontend | Import repository; root directory `frontend`; framework Vite; Node 24.x; install `npm ci`; build `npm run build`; output `dist`; use committed `vercel.json`; production branch is the branch containing the approved commits (currently local `master`) |
| Render API | Web Service; runtime Docker; root `Backend`; Dockerfile `./Dockerfile`; Docker context `.`; default command `sh start.sh`; health path `/health`; one instance; `WEB_CONCURRENCY=2`; `PORT=10000`; `RUN_MIGRATIONS=false` after the one-off migration below; auto-deploy disabled |
| Render publishing | Background Worker; same repository, commit, root and image; Docker command `python publishing_worker.py`; one instance; no HTTP port; auto-deploy disabled; create/start only after publishing approval |
| Render notifications | Background Worker; same image/root/commit; Docker command `python notification_worker.py`; one instance; no HTTP port; auto-deploy disabled; create/start only after delivery approval |
| Neon | Project `socialpilot`; PostgreSQL 17; database `socialpilot`; separate staging branch before production; choose a region nearest the Render API/worker region (prefer Singapore when both dashboards offer it); TLS required; retain both pooled and direct connection details privately |

Use an always-on Render web plan and worker plans for reliable scheduling. This target is not an entirely free always-on deployment: Render's free options do not cover continuously running background workers. Confirm current billing in the dashboard before creating paid services. See [Render service types](https://render.com/docs/service-types), [free plan scope](https://render.com/docs/free), and [background workers](https://render.com/docs/background-workers).

Render builds the Docker image from the repository and uses HTTP health checks for rollout readiness. Verify settings against [Docker on Render](https://render.com/docs/docker) and [health checks](https://render.com/docs/health-checks). Vercel's Vite variables are injected at build time; rebuild after changing the API URL. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Environment variable inventory

Supply secrets through each service's dashboard or secret manager. Do not copy protected local environment files and do not put credentials in command arguments, logs or Git.

| Variable | Services / value |
| --- | --- |
| `VITE_API_URL` | Vercel only: final HTTPS Render API origin, without `/api` or a trailing slash; this value is public |
| `APP_ENV` | API and both workers: `production` |
| `DATABASE_URL` | API/workers: Neon pooled PostgreSQL URL with TLS; maintenance process: direct URL with TLS instead |
| `JWT_SECRET_KEY` | API/workers: strong random secret, at least 32 characters; keep identical across API instances |
| `SOCIAL_TOKEN_KEY` | API/workers: valid Fernet key; preserve the existing encryption key if restoring encrypted social credentials, otherwise reconnect all accounts |
| `CORS_ORIGINS` | API/workers: exact production frontend HTTPS origin; comma-separated explicit staging origin only when intended; no wildcard |
| `PORT` | API: Render-injected `10000` |
| `WEB_CONCURRENCY` | API: `2` initially |
| `RUN_MIGRATIONS` | API: `false` after approved one-off migrations; Compose defaults to migration-on-start |
| `FORWARDED_ALLOW_IPS` | API: trusted ingress addresses only; verify Render proxy handling before public launch; never trust arbitrary forwarded headers on a directly reachable server |
| `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_REDIRECT_URI` | API/publisher when Facebook is enabled |
| `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `INSTAGRAM_REDIRECT_URI` | API/publisher when Instagram is enabled |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` | API/publisher when YouTube is enabled |
| `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI` | API/publisher when X is enabled |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | API/publisher when LinkedIn is enabled |
| `LINKEDIN_VERSION` | API/publisher: supported LinkedIn REST API version (current code default `202607`); verify availability before go-live |
| `X_METRICS_MINUTES` | API/publisher: minimum X metrics refresh interval, default `360` |
| `YOUTUBE_MAX_MB`, `YOUTUBE_PRIVACY_STATUS`, `YOUTUBE_CATEGORY_ID` | Publisher: video cap (default `1024` MB), privacy (default `public`; use `private` for an approved test), category (default `22`) |
| `META_GRAPH_VERSION` | API/publisher: Meta version enabled and verified for the app |
| `<PROVIDER>_EXTRA_SCOPES` | Optional API/publisher; enable only approved extra analytics scopes; provider prefix is uppercase |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SSL` | Notification worker and API readiness: leave unset until email approval; STARTTLS with port 587 by default, implicit TLS with `SMTP_SSL=true` and port 465 |
| `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | API/notification worker when push is approved; subject is a valid contact; keep private key secret |
| `PG_DUMP_PATH`, `BACKUP_DIR` | Maintenance machine only: installed pg_dump executable and protected persistent backup directory |
| `DEMO_PASSWORD` | Local/staging seed only; never seed production |

All backend modules now read process variables only. Vite has dotenv loading disabled too. The three protected local files remain untouched and are no longer implicitly loaded by this code.

## Database transfer and migration sequence

This sequence is **not executed**. Obtain approval to transfer the database and its personal data to Neon first. Use a maintenance machine with PostgreSQL 17 client tools and this repository's backend dependencies. The script uses credentials from the process environment and suppresses database-tool error output. No credentials are printed.

1. Stop source writes and publishing/notification workers for a consistent cutover; retain the original database. Record the source Alembic revision and row counts. Do not run the new API against an unmigrated database.
2. Privately inject the source `DATABASE_URL`, `JWT_SECRET_KEY`, and `SOCIAL_TOKEN_KEY` through the operator's environment; set `APP_ENV=maintenance` and `BACKUP_DIR` to protected local storage. In `Backend`, run `python backup_and_migrate.py --backup-only`. This creates a custom-format backup without changing source schema. Record the reported filename and checksum privately.
3. Verify the archive with `pg_restore --list PATH_TO_DUMP` and test a restore into a disposable database. Use a pg_dump version at least as new as the source server. Do not upload an untested backup as the only copy.
4. Create an empty Neon staging branch/database after approval. Privately set libpq variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require` for its **direct** endpoint. Restore with `pg_restore --no-owner --no-acl --exit-on-error --dbname DB_NAME PATH_TO_DUMP`. Do not use `--clean` against a populated database. `DB_NAME` is just the database name; password stays in the environment.
5. Set `DATABASE_URL` to the same target's direct URL. Run `python backup_and_migrate.py` to back up the restored schema, then upgrade and verify it. Confirm `python -m alembic current` and `python -m alembic heads` both show the single head `a21c4e810014`. Check row counts and decryptability of a credential without logging the plaintext. Failed backup prevents migration.
6. Run all tests on disposable schemas, then staging login/post/schedule/report checks with no real delivery. Review pending/processing/uncertain jobs before worker activation. Preserve the existing `SOCIAL_TOKEN_KEY` or deliberately reconnect providers.
7. Repeat the approved transfer for production in the write-free maintenance window. Point Render at the pooled runtime URL, keep `RUN_MIGRATIONS=false`, then deploy API and frontend only after approval. Check `/health` and exact-origin CORS before allowing writes.
8. Update provider callbacks using `Backend/OAUTH_CALLBACK_CHECKLIST.md`. Activate one publisher and one notification worker only after separate approval and a reviewed queue. Reconcile jobs whose outcome is uncertain before retrying anything.

Direct maintenance connections avoid session-state issues associated with transaction pooling; this choice follows [Neon's operational guidance](https://neon.com/blog/inside-lubots-database-per-tenant-architecture). The app uses pooled connections for runtime traffic.

## Rollback

- Before cutover: retain the source database, encrypted backup, exact pre-change commit/image, and matching encryption key securely. Record the cutover time and pause queues.
- Application-only failure with compatible schema: stop both workers, restore the previous API/frontend deployment, leave additive schema columns/tables in place, and retest login/read paths. Keep `RUN_MIGRATIONS=false` during rollback. Never downgrade schema automatically at startup.
- Data/schema failure: stop writes and workers; take a fresh failure-state backup. Restore the pre-migration dump into a **new** database/Neon branch and verify it before switching connection settings. Do not overwrite the failed database. Restoring loses later writes unless explicitly reconciled, so obtain approval for the recovery point.
- Never roll back encrypted data without its original `SOCIAL_TOKEN_KEY`. Never replay queued publishing or notification jobs blindly; a provider might already have accepted them.
- Revisions 011-013 add campaign privacy, team-management flags, scheduling actor and revision-author role. Historical team scheduling actors and team revision roles remain unknown; hold workers until a creator has reviewed/recreated affected content. Creator role is now mandatory for publishing, including owners.
- Downgrading 011-013 removes privacy/actor metadata; use a verified backup for production rollback and keep workers stopped.
- Revision 009/010 downgrades drop invitation/limit tables. They are not a data-preserving production rollback. Prefer a compatible application rollback or verified backup restoration.

## Approval gate

Before deployment: Docker image/smoke checks must pass, secrets must be supplied privately, proxy IP behavior must be verified, provider permissions/callbacks reviewed, and a restore drill completed. Public self-registration currently has no email-ownership verification; because invitations attach by email, add verification or restrict registration before opening team access to untrusted users. Wait for the user's approval; this document grants none.

## Existing local database repair: migration 014

014 follows 013 without branching. It fills missing `posts.creator_role` only for
real personal owners (`users.is_workspace = false`), normalizing `user` to
`content_creator` and `admin` to `administrator`. Unknown roles remain NULL.
Missing personal `creator_id` values become the owner ID. Already-recorded author
roles/IDs are preserved; team posts are untouched. Personal creator drafts and
queued jobs work again. Manager/admin/business posts do not gain creator privileges.

Stop the local API, publishing worker and notification worker. In PowerShell:

```powershell
Set-Location 'C:\Users\Aryan\OneDrive\Desktop\SocialPilot_1'
& .\tools\migrate-local.ps1
```

Paste the real local PostgreSQL URL only at the hidden prompt. Do not load a dotenv
file or place secrets in command history. This helper uses the existing
`backup_and_migrate.py`, whose failed backup prevents migration. It suppresses raw
driver output, verifies the exact head and reports SUCCESS/FAILURE. The backup is
stored under `C:\SocialPilot_backups` by default, outside OneDrive. Supply
`-BackupDir 'D:\SocialPilot_backups'` to choose another private directory; missing
directories are created. Existing `backups/` remains ignored and untouched.
Process configuration is restored, and workers stay stopped.
The helper does not target cloud databases or the disposable test cluster.

014 downgrade is intentionally a data-retaining no-op: 013 already has the columns,
and clearing repaired values would reintroduce the bug. This is not a restoration
of pre-backfill NULL values. Earlier schema downgrades can remove metadata; retain
the verified backup for any production rollback. A verification failure does not
prove the migration rolled back. Preserve the backup and investigate privately.

## Pre-deployment API hardening

The Mongo connectivity endpoint and module have been retired; the application uses PostgreSQL. Former platform admin endpoints are removed and return 404, including anonymous requests. `/me/permissions` remains available. Business User and Administrator retain their three read permissions.

Set `APP_ENV=production` before starting the backend: `/docs`, `/redoc` and `/openapi.json` are disabled. Development keeps all three. This setting does not replace the required production secrets and CORS configuration. No migration is required; Alembic head remains `a21c4e810014`.

### Dependency audit and validation — 5 October 2026

Installed pip-audit 2.10.1 in the local venv as a development audit tool, not a production requirement. Audited `Backend/requirements.txt` with dependency resolution (50 packages). Initial audit: 13 advisories in PyJWT 2.13.0. Applied the permitted minor upgrade to PyJWT 2.15.0; final requirements audit exits successfully with **zero known vulnerabilities**. This is the vulnerability database result at audit time, not a guarantee against unknown vulnerabilities. No other application dependency was upgraded. Mongo's dependency was removed from the manifest; existing local venv packages were not purged.

| Initial advisory | Aliases | Initially listed fixed versions |
|---|---|---|
| PYSEC-2026-4145 | GHSA-ffc3-869f-jxw9, CVE-2026-102268 | 2.14.0 |
| PYSEC-2026-4146 | CVE-2026-103001, GHSA-gvp8-978c-rx2q | None listed by initial advisory |
| PYSEC-2026-4149 | GHSA-p4g4-x82p-q773, CVE-2026-102271 | 2.14.0 |
| PYSEC-2026-4152 | GHSA-w6j9-cwv2-h6wq, CVE-2026-102274 | 2.14.0 |
| PYSEC-2026-4144 | CVE-2026-102267, GHSA-9v7f-9g4p-ffgj | 2.14.0 |
| PYSEC-2026-4143 | GHSA-9j54-fg26-wv3r, CVE-2026-102266 | 2.14.0 |
| PYSEC-2026-4148 | CVE-2026-102270, GHSA-jwrc-g2q2-pq5p | 2.14.0 |
| PYSEC-2026-4140 | GHSA-2gx3-rcp4-g85q, CVE-2026-101917 | 2.14.0 |
| PYSEC-2026-4141 | GHSA-42vr-xj54-vc7v, CVE-2026-101918 | 2.15.0 |
| PYSEC-2026-4147 | CVE-2026-102269, GHSA-hxm8-2xgr-2p9m | 2.14.0 |
| PYSEC-2026-4151 | GHSA-w2cx-738m-mc7w, CVE-2026-102273 | 2.14.0 |
| PYSEC-2026-4150 | GHSA-r6x4-923q-g947, CVE-2026-102272 | 2.14.0 |
| PYSEC-2026-4142 | GHSA-8wjv-2p76-3863, CVE-2026-102265 | 2.14.0 |

One initial advisory listed no fix version; it is not reported against 2.15.0 by the final audit. Preserve that distinction rather than treating it as proof of a particular upstream fix.

Final checks after the upgrade: **139 backend tests passed, 22 frontend tests passed**, no failures or skips; frontend lint/build passed; disposable PostgreSQL migration round trips and schema drift checks passed. Single head remains `a21c4e810014`. No real database, deployment or push was used.

Admin-route tests in test_roles_api.py and test_collaboration.py now expect 404 instead of 403 (anonymous admin routes also return 404 rather than 401). test_auth.py preserves stale-token role checks without calling the removed require_admin helper. Production tests verify the removed Mongo endpoint and all three API documentation URLs in development and production. The explicitly named Docker environment example contained no Mongo settings and required no edit. The retired Mongo module is preserved locally in `_to_delete/Backend/mongo_database.py`; it is excluded from application code.
