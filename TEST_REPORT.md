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
