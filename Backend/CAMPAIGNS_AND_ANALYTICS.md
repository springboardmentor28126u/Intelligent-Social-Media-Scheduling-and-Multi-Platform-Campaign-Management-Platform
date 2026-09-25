# Campaign management and analytics (Milestone 3)

Apply the new migration once from Backend:

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
```

This adds `campaigns`, `audience_snapshots`, and `posts.campaign_id`.
No new Python or npm packages are required.

## What is included

| Spec task | Where |
| --- | --- |
| Campaign management module | **Campaigns** page. Each campaign has a name, platforms, start/end dates, budget, attributed revenue, currency, objective, and targets |
| Campaign tracking workflow | Status (active, paused, completed, archived), phase from dates (upcoming, running, ended), goal/time progress bars, automatic alerts |
| Content grouping | Choose a campaign in the post editor, or add/remove posts on the campaign detail page |
| Campaign reports | Campaign detail report with CSV export and Print/PDF |
| Engagement analytics | Likes, comments and shares. Reach, impressions and clicks are collected when the app has Meta insights permissions |
| Audience growth reports | Follower snapshots for Facebook Pages and Instagram accounts. **Reports → Audience growth** |
| Interactive dashboards | Analytics dashboard (reach, clicks, followers, follower-growth chart) and the Reports tabs |
| ROI and campaign comparison | **Reports → Campaign comparison & ROI**: ROI %, cost per engagement, best-campaign badges |
| Performance reports | **Reports → Publishing performance**: success rate, platform comparison, engagement by hour and weekday |

Campaigns and Reports appear in the sidebar for all roles. Business users get
read-only access. The page formerly labeled "Campaigns" is now "Posts" because it
manages individual posts.

## Metric definitions

- Engagements = likes + comments + shares + clicks (latest synced snapshot per publication)
- ROI % = (revenue − budget) ÷ budget × 100. Enter attributed revenue on the campaign
- Cost per engagement = budget ÷ engagements
- Engagement rate = engagements ÷ reach × 100 (shown only when reach is available)
- Success rate = published ÷ (published + failed) publications

## Collecting data

- **Sync now** (Analytics) refreshes post engagement **and** follower counts
- **Sync followers** (Reports → Audience growth) refreshes follower counts only
- The publishing worker records follower snapshots every 6 hours by default:

```powershell
.\venv\Scripts\python.exe publishing_worker.py --interval 10 --audience-hours 6
```

Use `--audience-hours 0` to disable. Growth charts need at least two snapshots
taken on different days.

Instagram follower counts use the existing `instagram_business_basic` permission.
Facebook Page follower counts use `pages_read_engagement`. Post reach/impressions/clicks
need `read_insights` (Facebook) and `instagram_business_manage_insights`
(Instagram). If those permissions are missing, the values stay 0 and nothing fails.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET/POST | /campaigns | List with metrics / create |
| GET/PATCH/DELETE | /campaigns/{id} | Full report / update / delete (posts are kept) |
| POST | /campaigns/{id}/posts | Assign posts `{"post_ids": [1,2]}` |
| DELETE | /campaigns/{id}/posts/{post_id} | Remove a post from the campaign |
| GET | /posts?campaign_id= | Posts in a campaign |
| POST | /analytics/audience/refresh | Store follower snapshots |
| GET | /reports/campaigns?ids=&days= | Comparison and ROI |
| GET | /reports/audience?days= | Follower growth per account |
| GET | /reports/performance?days=&timezone_name= | Publishing and activity report |

All data is owner-scoped, following the same rules as posts.

## Tests

`tests/test_campaigns.py` covers CRUD, grouping, metrics/ROI math, alerts,
validation, owner isolation, role permissions, reports, and audience refresh.
The full suite has 63 tests and passes on SQLite. The migration was also
verified against PostgreSQL 16, including upgrade, downgrade, and upgrade again.

## Not in this milestone

Audience demographics and geographic distribution require Meta insights permissions and
at least 100 followers. Native Excel (.xlsx) and server-generated PDF exports belong to the
Reports & Export module. Currently CSV opens in Excel, and Print → Save as PDF produces
the PDF.

## Live analytics, previews and demo data

Apply the new migration once (`alembic upgrade head` → `a21c4e810006`).

- **Auto-sync:** the publishing worker refreshes engagement every 10 minutes and
  followers every 6 hours. Tune with `--engagement-minutes 10 --audience-hours 6`
  (`0` disables either). Analytics, Engagement, Campaigns and Reports reload every
  60 seconds. A **Live** badge shows how fresh the data is: green pulse means synced
  in the last 30 minutes.
- **Trend KPIs:** metric cards show sparklines and "+x% vs previous period", from
  `GET /analytics/summary` (`previous` block, zero-filled daily `timeline`).
- **Best time to post:** a weekday × hour heatmap with the best slot highlighted
  (`heatmap` and `best_slot` in `GET /reports/performance`).
- **Top post spotlight:** your best post with its image, plus a top-5 leaderboard.
- **Post previews:** the post editor shows a live Instagram / Facebook / LinkedIn / X
  mock-up for the selected platforms.
- **Demo data:** Overview → **Load demo data** creates about six weeks of sample
  accounts, campaigns, posts, metrics and followers for the signed-in user. Every
  sample row is flagged `is_demo` and marked *Sample*. It is never published or sent
  to Meta. Remove it with **Remove demo data** (`POST /demo`, `DELETE /demo`).
