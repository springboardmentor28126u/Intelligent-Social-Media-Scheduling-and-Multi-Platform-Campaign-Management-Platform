## Security regression verification — 7 October 2026

This section supersedes earlier test counts. All data used here was disposable.

| Check | Result |
| --- | --- |
| Backend, isolated Windows SQLite run | 150 discovered; 142 passed, 8 PostgreSQL-only tests skipped |
| Backend, Docker with disposable PostgreSQL | **150 passed, no failures or skips**; 11 new security tests |
| Frontend lint / production build | Passed after final changes |
| Frontend Node tests | **25 passed, no failures or skips**; 3 new security tests |
| Alembic heads | Exactly one: `a21c4e810014`; no migration added |
| Docker build and health | PostgreSQL, backend and frontend healthy |
| Docker smoke | Passed: SPA fallback, five security headers, register/login, synthetic post/schedule, PDF and XLSX; smoke job cancelled |
| Browser smoke | Disposable registration and login passed; demo analytics sparklines, engagement timeline, platform and follower charts rendered; no captured warning/error logs |
| Whitespace check | `git diff --check` passed |

New backend coverage exercises trusted proxy chains, untrusted spoofing, malformed and
missing headers, IPv6/CIDR/exact trust, rejection of wildcard trust, worker peer
preservation, route integration, separate hashed limit buckets, per-IP registration
limits, normalized per-email limits and window expiry, Retry-After, 8-character schema
boundaries, legacy short-password login, password change and preserved duplicate behavior.
Frontend coverage checks CSP origin validation/injection rejection, required headers and
script/style directives, and registration/change-password validation/messages. Existing
role, invitation and migration tests still pass unchanged.

The stack used Compose project `socialpilot-security-test` and its new disposable volume,
with `tmp/security-dummy.env` copied from public `.env.docker.example`. An override replaced
all service env_file entries, so the existing `.env.docker` and protected local env files
were not read. Only postgres/backend/frontend ran; no worker, real provider, email or push
was used. Docker registry DNS failed initially, then recovered. A CRLF shell-script startup
failure and a dynamic-address collision were corrected before the successful final smoke.

Reproduction of the isolated Docker run (from repository root):

```powershell
docker compose -p socialpilot-security-test --env-file tmp/security-dummy.env -f docker-compose.yml -f tmp/security-compose.yml up --build -d --wait postgres backend frontend
docker compose -p socialpilot-security-test --env-file tmp/security-dummy.env -f docker-compose.yml -f tmp/security-compose.yml cp Backend/tests backend:/app/tests
docker compose -p socialpilot-security-test --env-file tmp/security-dummy.env -f docker-compose.yml -f tmp/security-compose.yml exec -e APP_ENV=test -e SOCIALPILOT_TEST_POSTGRES=1 backend python -m unittest discover -s tests -q
docker compose -p socialpilot-security-test --env-file tmp/security-dummy.env -f docker-compose.yml -f tmp/security-compose.yml exec backend python -m alembic heads
docker compose -p socialpilot-security-test --env-file tmp/security-dummy.env -f docker-compose.yml -f tmp/security-compose.yml exec backend python smoke_docker.py
```

The ignored temporary override replaces backend/publishing-worker/notification-worker
`env_file` with `!override [./tmp/security-dummy.env]`. The dummy env is the public example,
not a copy of an existing private configuration. Screenshot: `tmp/security-charts.png`.

Skipped deliberately: full duplicate-email concealment would change the tested registration
201-user/400-duplicate contract; simply replacing the message would not conceal existence.
Unverified: deployed Vercel header delivery, a real external API origin, production proxy
addresses/chains, and HTTPS HSTS enforcement (the Docker test is HTTP). The Vercel config
must be generated with the deployment API origin before upload, as documented in README.
No deploy, push, real database access, real posts, email or push delivery occurred.

Changed files: Backend/client_ip.py, Backend/server_worker.py, Backend/login_limits.py,
Backend/main.py, Backend/schemas.py, Backend/start.sh, Backend/smoke_docker.py,
Backend/tests/test_security.py, docker-compose.yml, frontend/Dockerfile,
frontend/nginx.conf, frontend/vercel.json, frontend/security-config.mjs,
frontend/package.json, frontend/src/api.js, frontend/src/App.jsx,
frontend/src/pages/Profile.jsx, frontend/tests/security.test.mjs, README.md, TEST_REPORT.md.

---

# SocialPilot — Consolidated Test and Evaluation Report

Current review: 6 October 2026. This section supersedes the historical milestone reports below. No deployment, real email/push, or social publishing was performed in this preparation.

## Current verification

| Check | Result |
| --- | --- |
| Backend suite with disposable PostgreSQL | 139 tests passed in the Linux Docker container; zero failures or skips |
| Alembic graph and roundtrip | Single head `a21c4e810014`; upgrade/downgrade/upgrade passed; existing record preserved; no model/schema drift |
| Frontend lint and production build | Passed |
| Frontend Node tests | 22 passed; zero failures or skips |
| Responsive pages | Dashboard, Schedule, Teams, Approvals, Reports, Notifications at 360/768/1280 px: 18 page-width checks passed; narrow header and wrapping improved |
| Team/demo behavior | Invitation registration attachment, expiry/re-invite, membership isolation, review gating and idempotent three-member seed covered |
| Native exports | File signatures, workspace scope and spreadsheet formula safety covered; four-page synthetic PDF visually checked |
| Hindi / emoji | PDF missing glyphs confirmed visually and documented inside the export; Excel preserves Unicode |
| Backup-only mode | Successfully created an archive from the disposable PostgreSQL cluster; original database not accessed |
| Docker build, Compose startup, container smoke | Passed with dummy configuration: four healthy services, isolated ports 18000/15173, authentication, proxy, exports and worker; see [Docker runbook](docs/DOCKER.md) |
| Cloud restore/deployment and live provider/delivery verification | NOT RUN; approval and credentials required |

Migration 014 adds five disposable-PostgreSQL tests with fixtures created at 013:
existing personal creator drafts schedule and publish; pre-existing personal jobs
publish; legacy roles normalize while manager/unknown roles do not become creators;
team authorship stays NULL and requires creator final approval; downgrade/upgrade
preserves repaired data and passes schema drift checks. Known author roles and
non-null author IDs are preserved. Provider calls are mocked; the real database
was not accessed. The local migration helper is syntax-checked and its invalid-URL
failure path is checked without database access; real-database execution remains
an operator action.

Workflow regression coverage now includes manager/admin/business 403 responses on
publishing routes, creator-only OAuth initiation, direct publishing with approval
required, manager-only/forged/stale approval rejection, demoted scheduling actors in
personal and team workspaces, role-at-edit provenance, owner management independence,
campaign privacy in aggregates/exports and notification delivery, and campaign data
preservation across downgrade/upgrade. Publishing and delivery use mocked providers.

The responsive and PDF visual checks below belong to the preceding preparation;
this workflow pass adds React server-render tests but does not claim a new live
browser/device or provider verification run.

Commands: `tools/check-step.ps1` runs isolated SQLite checks (3 PostgreSQL skips); `tools/check-step.ps1 -PostgresTest` runs against the disposable loopback cluster. Both run frontend lint/build/tests afterward. Environment files are never loaded. A test run was interrupted when the disposable cluster stopped between sessions; the cluster was restarted and the complete suite rerun. No test failure is hidden as a pass.

The first bundle split still preloaded shared React code from the charts group. A follow-up priority fix and regression test corrected it. Final main JS: 43.12 kB / 13.88 kB gzip; React: 189.60 / 59.61; deferred charts: 401.24 / 113.58. Initial main + React + runtime is about 233.43 kB / 73.91 kB gzip, versus the old 775.90 / 218.86 entry. Auth adds about 6.89 kB on demand. Total application bytes are not reduced by the same percentage as startup bytes.

## Platform status and regression coverage

| Platform | Implemented / mocked tests | Current live status |
| --- | --- | --- |
| Facebook | Page OAuth, text/image publication, metrics/audience and token handling | Existing flow retained; no new live publish verified |
| Instagram | Business OAuth, container/publish workflow, image validation, refresh before expiry, metrics | Existing flow retained; no new live publish verified |
| LinkedIn | OAuth/OpenID, REST text and single-image publication, upload, API version, refresh/reconnect, permission-aware metrics | Developer app permissions and live checks pending; no credentials inspected |
| X | OAuth2/PKCE/offline scopes, text/single-image upload, refresh, metrics refresh interval and audience adapter | Paid/API access and live checks pending; no credentials inspected |
| YouTube | OAuth offline/PKCE, channel lookup, resumable video upload, URL/size guards, refresh, video validation and statistics | Consent/API review, quota and live upload checks pending; no credentials inspected |
| Pinterest | Not implemented | Pending |

Tests in `test_new_platforms.py`, `test_social_oauth.py`, `test_publishers.py` and scheduling/worker suites exercise provider behavior with mocked network calls. They do not prove live provider authorization or delivery. Historical claims below are dated evidence only.

## Remaining scope and release risks

- Docker runtime and smoke checks passed with disposable data. This does not verify cloud deployment or live provider integrations.
- Apply migrations through 014 to the user's database only after a verified backup; this preparation migrated disposable test schemas only. The earlier local backup/migration to 008 belongs to the previous work phase.
- Public registration lacks email-ownership verification. An invitation must not be treated as proof of verified identity; restrict registration or add verification before public onboarding.
- Confirm trusted proxy/client-IP behavior before relying on per-IP login limits. A shared proxy/NAT can share that budget. Authentication tokens are currently stored in browser local storage.
- SMTP/VAPID setup, user opt-in and live email/push tests remain pending. Workers must remain stopped until approved.
- Hindi shaping/emoji embedding is not implemented in PDFs; use Excel when preserving those scripts is required.
- Pinterest, carousels/stories/reels, advanced demographics/geography, load benchmarks, alerting/operational monitoring and approved cloud deployment remain outside completed scope.
- Responsive checks used synthetic team content and empty schedule/report states. High-volume and unusually long-content layouts need further production-like coverage.

## Merged collaboration report (historical)

The following report is retained for traceability. Its registered-user-only invitation limitation and unverified Unicode note were superseded by the current changes. The original file is retained because file deletion was not authorized.

# Collaboration feature handover

Completed: teams and membership roles, revision-based content approval, native Excel/PDF report exports, persistent notification inbox and opt-in delivery infrastructure.

## Final verification

- Backend: 100 tests passed with `SOCIALPILOT_TEST_POSTGRES=1`; no skips. Includes isolated PostgreSQL migration roundtrip, preservation of existing records, and schema drift check.
- Frontend: ESLint passed, production build passed, 8 Node tests passed. Vite reports a non-blocking bundle-size warning (about 776 kB before gzip).
- Browser checks in the isolated test fixture: team creation, registered-member invitation and acceptance, workspace isolation, draft submission, independent manager approval, review history, and persisted notification read status.
- Excel/PDF API tests verify file formats, workspace isolation and spreadsheet formula safety. Browser generation showed a persistent save link. Automatic download events could not be confirmed in the embedded browser.
- A four-page synthetic PDF was rendered and visually inspected: repeated headers, column groups, pagination and footers were readable with no clipping. Non-Latin PDF font coverage has not been verified.

## Local database

The local database was backed up before migration to `a21c4e810008`. Backup: `backups/20261002T180230Z-before-collaboration.dump`. Migration and schema verification succeeded. Existing backend processes must be restarted to load the new code.

## Remaining activation steps

Email and browser push require SMTP/VAPID settings, user opt-in, and a running notification worker. External delivery was mocked in tests; no live delivery was performed. Invitations currently require an already registered user. Personal records remain personal; team social accounts must be connected inside the team workspace.

No cloud deployment or provider activation was performed. Further work awaits user approval. Setup and operating instructions are in `Backend/TEAMS_APPROVALS_NOTIFICATIONS.md`.


## Earlier milestone report — historical only

The open-item list below describes September 2026, not the current implementation. Use the current status above for decisions.

# SocialPilot — Test & Evaluation Report (Milestones 1–3)

Date: 25 Sep 2026 · Scope: every backend endpoint, every page for all four roles,
and the spec's evaluation criteria for Milestones 1, 2 and 3.

## How it was tested

| Layer | Method | Result |
| --- | --- | --- |
| Backend unit/API tests | `python -m unittest discover -s tests` (SQLite) | **65 passed**, 2 skipped (PostgreSQL-only) |
| PostgreSQL tests | same, with `SOCIALPILOT_TEST_POSTGRES=1` (worker locking, concurrency) | **All passed**, 5/5 repeat runs |
| Live API audit | 77 black-box checks against a running server + PostgreSQL 16 (auth, roles, accounts, posts, scheduling, worker, retries, campaigns, analytics, reports, isolation) | **77/77** |
| Browser audit | Playwright: login as each role, open every sidebar page, watch for console errors / failed requests; full UI flows (create → schedule → details → cancel → draft, profile, admin roles, notifications) | **0 errors**, all flows pass |
| Mobile | every page at 390 px width | no horizontal overflow |
| Frontend | ESLint, production build, `node --test tests/*.mjs` | clean, build OK, 7/7 |
| Migrations | `alembic upgrade head`, `downgrade`, `alembic check` | models and migrations in sync |

Live Facebook/Instagram posting needs your Meta app, so the audit replaces only
the network call with a stub. Everything else is the real code path.

## Milestone evaluation

| Criterion | Status |
| --- | --- |
| **M1** Architecture & setup (FastAPI, React, PostgreSQL, MongoDB, SQLAlchemy, Alembic) | ✅ |
| **M1** Authentication & account management (JWT, RBAC with 4 roles, profile, password, admin user/role screens) | ✅ |
| **M1** Social account integration (OAuth for Facebook/Instagram live; LinkedIn/X coded, not configured) | ✅ |
| **M2** Scheduling, drafts, recurring posts, calendar, queue | ✅ |
| **M2** Social API integration (Facebook Pages + Instagram live) | ✅ |
| **M2** Automated publishing (worker, retry/backoff, manual retry, uncertain-state safety) | ✅ |
| **M2** Publishing logs & tracking | ✅ |
| **M3** Campaign management & analytics dashboard | ✅ |
| **M3** Engagement tracking workflow | ✅ |
| **M3** Campaign reports, ROI & comparison, CSV / print-to-PDF | ✅ |
| **M3** Audience growth monitoring | ✅ |

## Bugs found and fixed in this audit

| # | Bug | Fix |
| --- | --- | --- |
| 1 | Same email with different capitals could register twice, and login was case-sensitive (`Admin@x.com` ≠ `admin@x.com`) | Emails stored lower-case; register/login/bootstrap match case-insensitively (older rows still work) |
| 2 | "Profile Information" menu item did nothing; no way to change name or password | New **Profile & account settings** page + `PATCH /me`, `POST /me/password` |
| 3 | Admin **Users** and **Roles & Permissions** were "Milestone" placeholders although the APIs existed | Built both screens (search users, change role with confirmation, self-change blocked; permission matrix) |
| 4 | Notification bell showed two hard-coded fake notifications and a permanent red dot | Real publishing updates (published / failed / needs review / going out in 24 h), unread dot only for new events, click opens the post; **Notifications** page replaces the placeholder |
| 5 | Dashboard Today / 7 / 30 day buttons changed nothing | Now filter "Posts created" and "Published posts" (with failed count) |
| 6 | Cancelled and failed posts displayed with a green ✓ or amber clock, same as success/pending | Consistent status colours: green published, red failed/needs review, grey draft/cancelled, amber pending |
| 7 | Edit button looked clickable but was silently disabled on scheduled/published posts | Opens details (reschedule, cancel, return to draft, change campaign); disabled buttons look disabled |
| 8 | Schedule list mixed months of cancelled history with upcoming posts; "Schedule Post" button did nothing for read-only users | Upcoming / All history toggle, shows the account name, button hidden without permission |
| 9 | OAuth callback tab showed raw JSON to the user | Friendly success/failure page that closes itself; API clients still receive JSON |
| 10 | Instagram tokens expire after ~60 days with no refresh, so scheduled posts would start failing | Token is refreshed automatically when fewer than 10 days remain |
| 11 | With two workers, sibling posts could wait a whole polling cycle (flaky PostgreSQL test, also on the original code) | Worker waits briefly for the parent lock; test now passes consistently |
| 12 | Posts page for Business Users said "Click the button below" with no button; placeholder page advertised features that were already built | Accurate read-only / placeholder wording |
| 13 | Success notices stayed on screen across pages until dismissed | Auto-dismiss after 6 seconds |
| 14 | Dashboard activity-feed bullets were invisible (missing colours) | Colour by status |

## Open items (not bugs in M1–M3 scope)

1. **Shared team data.** Every user sees only their own posts, campaigns and
   analytics. A Business User or Marketing Manager therefore sees empty screens
   unless they create content themselves. The spec lists *Team management* in
   the User Management module; adding a shared workspace (read access for
   managers/business users) is a design decision to make before the demo.
2. **Content Approval / "Pending Approval" status** (spec Module 5): still a placeholder.
3. **LinkedIn, X, YouTube, Pinterest** publishing: LinkedIn/X adapters exist but are unconfigured; YouTube/Pinterest not implemented. Videos, carousels, stories and reels are not supported.
4. **Email / push notifications, Excel (.xlsx) and server-side PDF export**: Reports & Export module. CSV and browser print-to-PDF work now.
5. **Audience demographics / geography**: need Meta insights permissions.
6. **Deployment** (Docker, cloud, CI): Milestone 4.

## Current roles — view-only policy (head `a21c4e810014`)

| Role | Navigation | Actions |
|---|---|---|
| Content Creator | Overview, Campaigns, Posts, Schedule, Calendar, Social Accounts, Analytics, Engagement, Reports, Notifications, Teams, Content Approval | Draft/edit, reviews and creator final approval, connect accounts, schedule/publish/retry, analytics sync; team demo mutations additionally require manage rights |
| Marketing Manager | Overview, Campaigns, Posts, Content Approval, Analytics, Engagement, Reports, Notifications, Teams | Draft/edit, manager review, engagement-note API updates; cannot publish, connect, sync or mutate demo data |
| Business User (view only) | Overview, Campaigns, Posts, Analytics, Engagement, Reports, Notifications, Teams | Read permitted accounts/posts/campaigns/analytics/reports; no content, review, sync, demo or publishing actions |
| Administrator (view only) | Overview, Campaigns, Posts, Analytics, Engagement, Reports, Notifications, Teams | Same three read permissions as Business User; no platform administration or content actions |

Business User and Administrator have exactly `accounts:read`, `posts:read`, `analytics:read`. Creator and manager permission sets are unchanged. All platform admin routes are disabled (403 for every authenticated role); `/me/permissions` remains available. Users and Roles & Permissions navigation and the AdminUsers page are removed. Teams contains a read-only role reference and retains all four invite/role options.

Team management is a separate exception: only the owner or an explicit `is_admin` delegate can manage an existing team, regardless of their content role. Administrator role alone grants no management. View-only roles cannot create teams, author content, review, approve, sync, publish or connect accounts even when they hold management rights. Existing campaign visibility remains unchanged, including Business User access only to team-shared campaigns. No migration or real-database operation is needed; head stays `a21c4e810014`.

### View-only role verification — 2026-10-05

Full backend suite: **137 passed, 0 failures, 0 skipped**. Frontend suite: **22 passed, 0 failures, 0 skipped**. Frontend lint and production build passed. Migration round trips and schema drift checks passed on the isolated test database; single head remains `a21c4e810014`, with no migration added.

Coverage includes exact read-only permission sets; disabled platform-admin endpoints for all four roles; denied content, reviews, sync, demo, team creation and publishing for view-only roles; permitted reads/exports; owner and explicit delegate team management; denial for administrator-role members without a flag; exact role navigation; and no review actions even when a view-only member holds team-management rights. Existing creator-only publishing, staged approval and campaign-visibility tests remain passing. Older admin-write tests were updated or replaced by disabled-endpoint tests. No real database, deployment, push, provider publishing or email delivery was used.

The disposable security-test containers/network were stopped after verification; its test volume was retained.
