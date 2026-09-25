# Adding LinkedIn, X, YouTube (and more)

Facebook and Instagram are fully wired. For each new platform, follow this checklist.

## LinkedIn and X (code already exists)

1. Create the developer app and register the callback:
   `https://<your-tunnel>/oauth/linkedin/callback` or `/oauth/x/callback`.
2. Add `LINKEDIN_CLIENT_ID/SECRET/REDIRECT_URI` or `X_CLIENT_ID/SECRET/REDIRECT_URI` to `.env.social.local`.
3. Restart the backend. The Connect button on Social Accounts becomes active.
   Publishing (text posts) and token refresh for X already work.
4. For engagement numbers, add a branch to `provider_metrics()` in `analytics.py`,
   and include the provider in the `in_([...])` filters in `sync_engagement()` and
   `publishing_worker.sync_all_engagement()`.

## A brand-new platform (for example, YouTube)

| Where | What to add |
| --- | --- |
| `social_oauth.py` → `PROVIDERS` | Name, authorize URL, token URL, scopes; a profile lookup in `exchange()` |
| `publishers.py` → `publish()` | An `elif job.provider == "youtube":` branch that uploads and returns the post ID |
| `scheduling.py` → `validate_content()` | Content rules (for example, YouTube needs a video) |
| `posts.py` → `Platform` and the platform set in `validate_target()` | Add `"youtube"` |
| `analytics.py` → `provider_metrics()` / `provider_audience()` | Views/likes/comments and subscriber count |
| Frontend: `postUtils.platformName`, `PlatformBadge`, `Accounts` `PLATFORMS`, `Dashboard` `ALL_PLATFORMS`, the platform `<select>` in `Campaigns.jsx` | The label and icon |
| Frontend: `components/PostPreview.jsx` → `PREVIEWS` | A preview mock-up (optional) |

Campaigns, reports, heatmap, trends and demo data are provider-agnostic, so they
pick up the new platform automatically.
