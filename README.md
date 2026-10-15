# Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform

## Demo data

To populate the database with mock campaigns, social accounts, and scheduled posts for an existing user, run:

```bash
cd backend
./.venv/Scripts/python.exe seed_demo.py --email your-user@example.com
```

This creates sample Facebook, Instagram, and LinkedIn records plus a few campaign and post states so the dashboard, planner, and analytics views have realistic data to work with. The demo accounts are intentionally created without real tokens.

## X account connection

To enable X OAuth, create an OAuth 2.0 app in the X Developer Portal and add
these settings to `backend/.env`:

```env
X_CLIENT_ID=your-client-id
X_CLIENT_SECRET=your-client-secret
X_REDIRECT_URI=http://127.0.0.1:8000/social-accounts/x/callback
FRONTEND_URL=http://localhost:5173
```

Register the redirect URI exactly as shown in the X app settings. The app
requests `tweet.read`, `tweet.write`, `users.read`, and `offline.access`.
After restarting the backend, connect X from the **Social Accounts** page.
X publishing currently supports text-only posts.

If your frontend is served from more than one host, set `FRONTEND_URL` to
the primary origin and list any additional allowed origins in `FRONTEND_URLS`
as a comma-separated list. X and Facebook OAuth callbacks return the browser
to the same allowed frontend origin where the user started connecting.

## AI caption generator

The Create Post page can generate an editable social caption through the
authenticated `POST /ai/captions/generate` endpoint. Configure a Groq API key
in `backend/.env` before starting the backend:

```env
GROQ_API_KEY=your-groq-api-key
```

Optionally set `GROQ_MODEL` to use another model available to your Groq
account. The default is `qwen/qwen3.8-27b`. The endpoint requires the
existing JWT bearer token and accepts a topic, platform, and tone. It returns
an editable caption with relevant hashtags; it does not create, schedule, or
publish a post.

To test locally, start the backend from `backend` with
`uvicorn app.main:app --reload`, and start the frontend from `frontend` with
`npm run dev`. Sign in, open **Create Post**, describe the topic, select a
platform and tone, then choose **Generate Caption + Hashtags**. Edit the
result before copying it or using it in the existing post-content field.

## AI post rewriter

The Create Post content editor includes **AI Rewrite**. It uses the
authenticated `POST /ai/captions/rewrite` endpoint and the existing Groq
configuration (`GROQ_API_KEY` and optional `GROQ_MODEL`). Review the original
and rewritten text side by side; the post editor changes only when you choose
**Use Rewritten Content**. Rewriting never publishes or schedules a post.

## Analytics

The authenticated `GET /analytics/advanced` endpoint summarizes existing post
records by date, status, platform, and campaign. It accepts `start_date`,
`end_date`, `platform`, and `campaign_id` query parameters. Post activity is
aggregated in the database; date series use daily buckets for ranges up to one
year and monthly buckets for longer ranges. Engagement, reach, impressions,
and similar metrics are reported as unavailable until the connected platforms
provide actual metric data; the analytics UI does not estimate them.

The Analytics page can export the active date, platform, and campaign filters
as CSV or Excel (`.xlsx`) using the authenticated `GET /analytics/export`
endpoint. Choose `post_details`, `platform_summary`, or `campaign_summary`
in the UI (the API uses the corresponding `report_type` query parameter) and
select `file_format=csv` or `file_format=xlsx`. The endpoint scopes every
export to the authenticated user's posts and their owned accounts and
campaigns. Platform engagement columns are marked `Data unavailable` until
real metrics are stored; export rows do not include post content, credentials,
or tokens.
