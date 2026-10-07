# Team workflow change report

Completed 4 October 2026. This report includes the later creator-only correction.

## Final behavior

- Only the effective `content_creator` role can connect/disconnect accounts, schedule, publish immediately, retry, cancel/restore publishing jobs or run the queue. System and workspace administrator roles cannot publish.
- Team owner rights and the membership admin flag are separate from publishing role. Owners keep management rights and can choose creator or administrator. Owners cannot be removed or stripped of management rights.
- The scheduling actor is stored per job and their current active creator role is rechecked immediately before sending. Demoted/removed/unknown actors fail with a clear message. Campaign access is rechecked too.
- Manager approval moves a draft into Awaiting creator. Only a creator gives final approval. Notifications go to eligible creators/managers and history records the revision, actor, stage and comment. Rejections require a comment.
- Creator-authored revisions publish directly even with required approval enabled. The role that authored a revision is recorded; promotion alone cannot approve older manager content. Edits and campaign moves invalidate approval and increment the revision.
- Private campaigns are visible to their creator, assigned members and team managers. Business users only see team-shared campaigns. Linked posts, jobs, analytics, exports and notifications use the same filter. Account-level follower totals are not attributed to campaigns.
- The frontend has creator-only controls and explanations, an Awaiting creator queue, approval badges, campaign sharing/assignment controls, and separate management/publishing explanations in Teams.
- The demo seed and five-minute script match the new workflow.

## Commits and checks

Every step ran backend tests, frontend lint, frontend production build and frontend tests before committing.

| Commit | Step | Backend tests | Frontend tests |
| --- | --- | ---: | ---: |
| `dd45795` | Split content and publishing permissions | 110 | 9 |
| `d45ba86` | Staged creator approval and worker guard | 114 | 9 |
| `19f6980` | Campaign privacy, exports, notifications and migration | 118 | 9 |
| `ec82329` | Creator-only correction and owner management | 122 | 9 |
| `541ab40` | Workflow UI, immediate publishing and demo seed | 124 | 12 |
| Final handover commit (see conversation / git log) | Revision provenance, metadata invalidation, rendered UI tests and documentation | 127 | 16 |

Final verification: 127 backend tests passed with no skips using isolated SQLite and disposable PostgreSQL schemas. Frontend lint/build passed; 16 frontend tests passed, including rendered React controls and existing bundle/calendar/export tests. Alembic reports a single head `a21c4e810013`; model/schema drift check and downgrade/upgrade tests passed. YouTube, X, LinkedIn, Facebook and Instagram regression tests used mocked providers. No live-provider success is claimed.

## Upgrade notes and remaining operator work

The real application database was not accessed or migrated. Apply the chain through 013 only after an approved verified backup; the deployment runbook describes `backup_and_migrate.py`. No deployment, real social publishing, email or push delivery was performed. No environment files were read, edited or committed, and no project files were deleted.

Migration 011 preserves existing campaigns and budgets, assigns workspace-owner ownership and grants current creator members access without whole-team sharing. Historical account connector identity was not recorded, so an exact original connector cannot be reconstructed. Review those legacy assignments before rollout.

Migration 012 preserves management rights and records new scheduling actors. Legacy personal job actors are backfilled to their owner; legacy team job actors remain unknown and fail safely. A current creator can retry only when the content still has valid creator authorship/final approval; otherwise recreate the content as a new creator draft.

Migration 013 preserves existing posts and leaves unknown historical author roles unset. Such drafts require fresh creator review (in teams) or a new creator-authored revision/recreation. An old approved status alone is insufficient. A fresh disposable demo database is needed for the updated seed; existing seeds are deliberately left unchanged.

Live browser/device, Docker runtime, cloud deployment and external-provider checks remain operator follow-ups. This change used React render tests; previous responsive/PDF visual evidence in TEST_REPORT.md belongs to the earlier preparation. Downgrades remove new permission metadata, so use a verified backup and keep workers stopped for production rollback.

## Every changed file

This complete list is relative to the project root, compared with baseline `8e1919c`.

- [Backend/ROLE_ACCESS.md](Backend/ROLE_ACCESS.md)
- [Backend/alembic/versions/a21c4e810011_campaign_visibility.py](Backend/alembic/versions/a21c4e810011_campaign_visibility.py)
- [Backend/alembic/versions/a21c4e810012_creator_publishing.py](Backend/alembic/versions/a21c4e810012_creator_publishing.py)
- [Backend/alembic/versions/a21c4e810013_revision_author_role.py](Backend/alembic/versions/a21c4e810013_revision_author_role.py)
- [Backend/analytics.py](Backend/analytics.py)
- [Backend/approvals.py](Backend/approvals.py)
- [Backend/campaigns.py](Backend/campaigns.py)
- [Backend/demo.py](Backend/demo.py)
- [Backend/main.py](Backend/main.py)
- [Backend/models.py](Backend/models.py)
- [Backend/notifications.py](Backend/notifications.py)
- [Backend/posts.py](Backend/posts.py)
- [Backend/publishing_worker.py](Backend/publishing_worker.py)
- [Backend/reports.py](Backend/reports.py)
- [Backend/roles.py](Backend/roles.py)
- [Backend/scheduling.py](Backend/scheduling.py)
- [Backend/seed_team_demo.py](Backend/seed_team_demo.py)
- [Backend/social_oauth.py](Backend/social_oauth.py)
- [Backend/teams.py](Backend/teams.py)
- [Backend/tests/test_campaign_visibility.py](Backend/tests/test_campaign_visibility.py)
- [Backend/tests/test_collaboration.py](Backend/tests/test_collaboration.py)
- [Backend/tests/test_collaboration_migration.py](Backend/tests/test_collaboration_migration.py)
- [Backend/tests/test_creator_approval.py](Backend/tests/test_creator_approval.py)
- [Backend/tests/test_creator_only.py](Backend/tests/test_creator_only.py)
- [Backend/tests/test_review_gaps.py](Backend/tests/test_review_gaps.py)
- [Backend/tests/test_roles_api.py](Backend/tests/test_roles_api.py)
- [Backend/tests/test_scheduling.py](Backend/tests/test_scheduling.py)
- [Backend/tests/test_workflow_permissions.py](Backend/tests/test_workflow_permissions.py)
- [Backend/visibility.py](Backend/visibility.py)
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- [DEPLOYMENT_PREPARATION.md](DEPLOYMENT_PREPARATION.md)
- [FINAL_REPORT_OUTLINE.md](FINAL_REPORT_OUTLINE.md)
- [README.md](README.md)
- [TEST_REPORT.md](TEST_REPORT.md)
- [WORKFLOW_CHANGE_REPORT.md](WORKFLOW_CHANGE_REPORT.md)
- [frontend/src/App.jsx](frontend/src/App.jsx)
- [frontend/src/components/ApprovalBadge.jsx](frontend/src/components/ApprovalBadge.jsx)
- [frontend/src/components/CampaignCard.jsx](frontend/src/components/CampaignCard.jsx)
- [frontend/src/components/PublishingDetails.jsx](frontend/src/components/PublishingDetails.jsx)
- [frontend/src/pages/Accounts.jsx](frontend/src/pages/Accounts.jsx)
- [frontend/src/pages/Approvals.jsx](frontend/src/pages/Approvals.jsx)
- [frontend/src/pages/CampaignHub.jsx](frontend/src/pages/CampaignHub.jsx)
- [frontend/src/pages/Campaigns.jsx](frontend/src/pages/Campaigns.jsx)
- [frontend/src/pages/RolesMatrix.jsx](frontend/src/pages/RolesMatrix.jsx)
- [frontend/src/pages/Teams.jsx](frontend/src/pages/Teams.jsx)
- [frontend/src/workflowPolicy.js](frontend/src/workflowPolicy.js)
- [frontend/tests/workflow-render.test.mjs](frontend/tests/workflow-render.test.mjs)
- [frontend/tests/workflow.test.mjs](frontend/tests/workflow.test.mjs)
