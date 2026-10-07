# Backend roles and administration

Platform administration is disabled. Administrator is a view-only content role.

| Role | Social-account API access (UI only for creators) | List users / assign roles |
| --- | --- | --- |
| content_creator | Read, connect, disconnect | No |
| marketing_manager | Read only | No |
| business_user | Read only | No |
| administrator | Read only | No |

Only creators have `publish:write`. Creators and managers have
`content:write` for drafts and approval management; business users have read permissions only. Drafts, reviews
and campaigns use `content:write`. Connecting/disconnecting accounts, scheduling,
cancelling, restoring, retrying and running publishing jobs require `publish:write`.
OAuth callbacks recheck the initiating user's current workspace role.

Team requests use active membership permissions rather than the personal role.
Roles never grant access to another workspace. Unknown roles are rejected.

Existing `user` and `admin` database values map to `content_creator` and `administrator`
for authorization. Public signup still creates `user` accounts and never grants a role
supplied in a signup request.

Team owners retain management rights independently of their role. New owners keep
their account role, and can change their own team role. An owner with the creator
role can publish; an owner with the administrator role cannot. Owners cannot lose
management rights or leave. An `is_admin` membership flag delegates team management
without granting publishing. Administrator role also grants team management.

Migration `a21c4e810012` records the scheduling actor on new jobs. The worker
rechecks active membership and creator role immediately before sending. Demoted,
removed or unknown actors fail with a clear error; a current creator may retry.
Legacy personal jobs are backfilled to their owner. Historical team job actors
cannot be inferred, so those jobs fail closed. A creator can retry if the content
still has valid creator authorship/final approval; otherwise recreate it as a new
creator draft. Do not infer approval from an old status string.

Migration `a21c4e810013` records the author's role for new revisions. Promoting a
manager does not automatically approve earlier manager-authored content. Migration 014 repairs missing personal revision roles from the real owner
(including legacy role normalization), without replacing known authorship.
Historical team revisions still have unknown role-at-edit evidence and require
fresh creator review or recreation. No campaign, post or job records are deleted by these upgrades.

Manager approval moves content to `awaiting_creator`; only a creator gives final
approval for the current revision. Creator-authored revisions can publish directly.
Edits reset approval and increment the revision. Changing the team approval setting
does not bypass the creator-final-approval requirement for manager content.

Campaigns are private by default. Their creator, assigned members and workspace
managers can access them; business users only see team-shared campaigns. Reports,
post metrics, exports and campaign notifications use the same visibility policy.
Account follower totals are account-level metrics, not campaign metrics.

## API access

`GET /me/permissions` returns the effective role and real permission set. Platform admin endpoints return 404 for every role; no role can list platform users or assign platform roles through these endpoints. The legacy bootstrap script does not grant platform privileges under this policy.

Existing `user` and `admin` aliases normalize to creator and view-only administrator. Role changes apply to existing tokens on the next request. Personal profile and notification preferences remain self-service. Tests use disposable SQLite and PostgreSQL schemas, never the real database.

## Current roles — view-only policy (head `a21c4e810014`)

| Role | Navigation | Actions |
|---|---|---|
| Content Creator | Overview, Campaigns, Posts, Schedule, Calendar, Social Accounts, Analytics, Engagement, Reports, Notifications, Teams, Content Approval | Draft/edit, reviews and creator final approval, connect accounts, schedule/publish/retry, analytics sync; team demo mutations additionally require manage rights |
| Marketing Manager | Overview, Campaigns, Posts, Content Approval, Analytics, Engagement, Reports, Notifications, Teams | Draft/edit, manager review, engagement-note API updates; cannot publish, connect, sync or mutate demo data |
| Business User (view only) | Overview, Campaigns, Posts, Analytics, Engagement, Reports, Notifications, Teams | Read permitted accounts/posts/campaigns/analytics/reports; no content, review, sync, demo or publishing actions |
| Administrator (view only) | Overview, Campaigns, Posts, Analytics, Engagement, Reports, Notifications, Teams | Same three read permissions as Business User; no platform administration or content actions |

Business User and Administrator have exactly `accounts:read`, `posts:read`, `analytics:read`. Creator and manager permission sets are unchanged. All platform admin routes are removed (404 for every role); `/me/permissions` remains available. Users and Roles & Permissions navigation and the AdminUsers page are removed. Teams contains a read-only role reference and retains all four invite/role options.

Team management is a separate exception: only the owner or an explicit `is_admin` delegate can manage an existing team, regardless of their content role. Administrator role alone grants no management. View-only roles cannot create teams, author content, review, approve, sync, publish or connect accounts even when they hold management rights. Existing campaign visibility remains unchanged, including Business User access only to team-shared campaigns. No migration or real-database operation is needed; head stays `a21c4e810014`.

## Pre-deployment API hardening

The Mongo connectivity endpoint and module have been retired; the application uses PostgreSQL. Former platform admin endpoints are removed and return 404, including anonymous requests. `/me/permissions` remains available. Business User and Administrator retain their three read permissions.

Set `APP_ENV=production` before starting the backend: `/docs`, `/redoc` and `/openapi.json` are disabled. Development keeps all three. This setting does not replace the required production secrets and CORS configuration. No migration is required; Alembic head remains `a21c4e810014`.
