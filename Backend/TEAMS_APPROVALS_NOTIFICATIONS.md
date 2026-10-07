# Teams, approval, report exports and notifications

## Using the features

1. Open **Teams**, create a workspace and invite an email address (registration can happen later).
2. Invitations expire after seven days. After registering with the invited email, the user opens **Teams** and accepts. Until then, they cannot see team content.
3. Use the workspace selector above every page. Personal content stays private; team content is shared only with active members.
4. Team administrators manage memberships and the approval setting. Managers review content; creators create and submit it; business users have read-only access.
5. Create a draft in the team workspace. In **Content Approval**, select it and submit for review.
6. A different manager or administrator approves or requests changes with a comment. Authors cannot approve their own draft. A team with one member must invite a reviewer or explicitly turn off required approval.
7. Open the approved post and schedule it. Editing content invalidates its approval. Pending submissions must be withdrawn before editing. Reviews retain the author, revision, comment and time.
8. **Reports** provides native Excel and paginated PDF downloads for campaigns, audience growth, publishing/platform performance and per-post engagement. Downloads respect the selected workspace and reporting period. Full-report downloads include all campaigns; the existing comparison checkboxes affect on-screen comparisons and CSV only.
9. **Notifications** stores invitations, reviews, account changes and publishing results, with persisted read state and opt-in delivery settings.

Existing personal data is not automatically moved into teams. Connect social accounts from within the team workspace to share them. Workspace administrators cannot use their team role to access system administration.

## Local setup

Supply `DATABASE_URL`, `JWT_SECRET_KEY` and `SOCIAL_TOKEN_KEY` privately through the process environment first. See the root README for current setup.

Run from `Backend`:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe backup_and_migrate.py
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

The backup command uses `PG_DUMP_PATH` if set, otherwise the installed PostgreSQL 17 tool. It aborts if the backup fails. Backups are sensitive and excluded from Git. The collaboration migration preserves personal records and adds tables; it does not send notifications or publish posts. Restart existing backend processes after upgrading.

In separate terminals, when ready to operate the relevant services:

```powershell
# Publishes due posts. Start only when those posts are intended to publish.
.\venv\Scripts\python.exe publishing_worker.py
# Creates reminders/alerts and delivers opted-in email and push messages.
.\venv\Scripts\python.exe notification_worker.py
```

The notification worker checks upcoming posts in the next 24 hours, daily campaign alerts and expiring social credentials. API actions and publishing results create inbox events immediately. Duplicate scans do not duplicate events.

## Email and browser push configuration

Supply the applicable notification variables through the process environment or hosting secrets; protected local files are not loaded. Never commit real credentials.

- Email: configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and credentials when required. SMTP uses STARTTLS by default; set `SMTP_SSL=true` for implicit TLS, normally with port 465.
- Push: configure matching `VAPID_PRIVATE_KEY` and URL-safe `VAPID_PUBLIC_KEY`, plus a real `VAPID_SUBJECT` contact such as `mailto:admin@your-domain`.
- The user must enable email or browser push under **Notifications**. Push also requires browser consent and HTTPS (localhost is supported for testing).
- Each browser subscription is tied to a single user. Disable push before sharing the browser with another account. Push messages contain a generic update rather than private post content.
- If no provider is configured, the UI says so and keeps its delivery switch disabled. In-app notifications still work.
- Delivery status is visible in the inbox. Missing provider settings defer delivery. Failed or interrupted sends are not automatically repeated because the provider may already have accepted them. Expired push subscriptions are removed. No live email/push delivery is claimed until configured and tested.

## Data and security design

Each team has a non-login storage principal, so all existing owner-scoped posts, campaigns, credentials, queue jobs and analytics remain isolated without copying a person's private data. JWT authentication always identifies a real user; `X-Workspace-ID` is resolved against current membership on every content request. Global user administration and personal account settings keep the real-user scope. OAuth attempts retain the initiating member and recheck membership at callback time.

Scheduling, manual retries and the publishing worker enforce approval. Concurrent reviews lock the draft; stale revisions fail. Users removed from a team cannot read its content, notifications or exports. Scheduled jobs are team-owned and continue after a member leaves unless cancelled by an authorized team member.

Notification events and outbox deliveries are persisted transactionally. A separate worker handles network delivery. Spreadsheet text is written as text, not executable formulas. Exports do not include passwords or social credentials.

## Verification

```powershell
$env:SOCIALPILOT_TEST_POSTGRES = '1'
.\venv\Scripts\python.exe -m unittest discover -s tests -q
Remove-Item Env:SOCIALPILOT_TEST_POSTGRES
```

PostgreSQL tests use disposable schemas, including migration upgrade/downgrade/upgrade and existing-record preservation. SQLite tests mock publishing and external notification delivery. Browser testing uses `tests/ui_fixture.py` on port 8011 with disposable data and real publishing disabled. Neither testing route sends real social posts, email or push messages.

Deployment and provider activation are separate follow-up actions.
