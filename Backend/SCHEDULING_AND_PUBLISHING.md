# Scheduling and publishing — Milestone 2 backend

PostgreSQL stores scheduled occurrences, per-account results and publishing logs.
The frontend uses these APIs for drafts, scheduling, account authorization,
queue results, and publishing logs. Existing browser-local campaigns are not
automatically imported.

From `frontend`, run `npm install` once, then `npm run dev`. The API defaults to
`http://localhost:8000`; set `VITE_API_URL` before starting Vite to use another
backend. In Campaigns, save a draft or select authorized accounts and schedule
it. Open Details to view occurrence logs, reschedule, cancel, return an entirely
cancelled post to draft, or retry a confirmed failed job. Schedule and Calendar
show individual occurrences; published status comes from worker results.

For an isolated browser walkthrough, run `python tests/ui_fixture.py` from
Backend, and point Vite at `http://127.0.0.1:8011`. Sign in with
`ui@example.com` / `Local-test-only-123!`. This fixture uses a temporary SQLite
database, fake accounts, and a disabled worker; it does not verify live publishing.

## Start the API and worker

Run from Backend with your local `.env` configured:

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

In another terminal, also in Backend:

```powershell
.\venv\Scripts\python.exe publishing_worker.py --interval 10
```

The worker sends real posts for due jobs across users. Start it when you intend
those jobs to publish. `--once` processes up to 20 due jobs and exits. Without a
worker, jobs remain stored until it runs or you call `POST /queue/run`. That
endpoint processes one background batch of the caller's due jobs, not a recurring
scheduler.

Complete account authorization using [SOCIAL_CONNECTIONS.md](SOCIAL_CONNECTIONS.md).
Manually added accounts without OAuth credentials cannot be scheduled. Keep
`SOCIAL_TOKEN_KEY` stable; Facebook/Instagram also require `META_GRAPH_VERSION`.
The X adapter refreshes expired tokens if a refresh token and X client credentials
are available. Other expired tokens require reconnection.

## Try the workflow

Open [API docs](http://127.0.0.1:8000/docs), use `POST /login`, then Authorize with
the returned access token.

1. Create a draft with `POST /posts`:

   ```json
   {"title": "Launch update", "content": "Our new product is coming soon!"}
   ```

2. Find authorized account IDs with `GET /accounts`.
3. Call `POST /posts/{post_id}/schedule`, replacing the date with a future time
   and account IDs with your own:

   ```json
   {
     "scheduled_at": "2030-10-01T09:00:00+05:30",
     "timezone_name": "Asia/Kolkata",
     "account_ids": [1],
     "recurrence": "weekly",
     "occurrences": 3
   }
   ```

4. Inspect `GET /queue?post_id=...` and `GET /queue/{job_id}/logs` for results.

Each account gets a separate job per occurrence, snapshotting the draft content
and image URL. An offset is required in `scheduled_at`. The IANA timezone controls
recurrence: daily/weekly schedules retain local clock time across daylight-saving
changes and reject nonexistent local times. Single publications use recurrence
`none` and occurrences `1`. Limits are 10 accounts and 52 occurrences.

| Endpoint | Behavior |
| --- | --- |
| `POST /posts/{id}/schedule` | Create or replace an unexecuted schedule |
| `POST /posts/{id}/cancel` | Cancel remaining scheduled/retry jobs; reject while publishing |
| `POST /posts/{id}/restore-draft` | Restore only when all jobs are cancelled or no history exists |
| `GET /calendar?start=...&end=...` | Jobs in an inclusive-start, exclusive-end range of up to 366 days |
| `GET /queue` | Filter by status/post_id; paginate with offset/limit |
| `GET /queue/{id}/logs` | Ordered job history |
| `POST /queue/{id}/retry` | Retry a confirmed failed job after fixing its cause |
| `POST /queue/run` | Process one owner-scoped background batch |

All routes enforce ownership, including for administrators. Creators, managers
and administrators can manage their own schedules; business users can read their
own queue/calendar. Calendar includes cancelled jobs. Calendar pagination defaults
to 200; queue defaults to 100; both allow at most 500 results per page.

## Supported content

| Adapter | Implemented content |
| --- | --- |
| Facebook Pages | Text, or one public HTTPS image with caption |
| Instagram | One public HTTPS image with caption; image required |
| LinkedIn | Member text posts |
| X | Text posts |

Set `image_url` on the draft before scheduling. Platforms fetch the image; the
backend does not upload or host files. Video, carousels, LinkedIn/X images and
team approvals are not implemented. Provider permission/media validation still
applies at publication time.

## Failures and recovery

- Confirmed success stores the provider post ID and a published log entry.
- Retryable errors use exponential backoff and adapter delays, up to five attempts.
  Confirmed failures become `failed`; manual retry resets the attempt count.
- Ambiguous network writes, missing confirmations and processing claims abandoned
  for ten minutes become `uncertain`. They are never automatically retried.
  Inspect the platform before creating a replacement draft. Automated
  reconciliation is not implemented. Avoid suspending a worker during publishing.
- Post status aggregates jobs, including `partially_published` and `needs_review`.
  Future recurring jobs can keep the post `scheduled`; inspect jobs for earlier
  failures. Revoked publishing permission prevents subsequent worker attempts.

PostgreSQL workers lock parent posts during claims, skip locked posts and
serialize result aggregation. Confirmed published jobs are never selected again.
This reduces duplicates but does not guarantee exactly-once delivery when a
provider accepts a request and its response is lost.

## Tests

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -q
```

Include PostgreSQL concurrency tests using temporary schemas in the configured
database (requires schema creation permission):

```powershell
$env:SOCIALPILOT_TEST_POSTGRES = '1'
.\venv\Scripts\python.exe -m unittest discover -s tests -q
Remove-Item Env:SOCIALPILOT_TEST_POSTGRES
```

Tests remove their generated schemas and use simulated publishers. All 54 tests
passed with PostgreSQL tests enabled on September 22, 2026. Live provider
authorization and publication remain unverified.
