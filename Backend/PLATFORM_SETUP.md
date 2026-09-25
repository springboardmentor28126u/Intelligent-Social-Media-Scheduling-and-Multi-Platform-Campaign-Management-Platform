# Connecting LinkedIn, X and YouTube

The code is complete. Each platform needs a developer app with a callback URL.
Put the keys in `Backend/.env.social.local`, restart the backend, then go to
**Social Accounts → Connect**.

Run `alembic upgrade head` once to add video support (migration `a21c4e810007`).

The callback URL is `https://<your-tunnel-or-domain>/oauth/<provider>/callback`.
It has to match the provider portal exactly. LinkedIn, X and Google accept
`http://localhost:8000/...` for local testing.

---

## LinkedIn (personal profile posts)

1. Go to <https://www.linkedin.com/developers/apps> and click **Create app**. You need a LinkedIn Page to link it to.
2. On the **Products** tab, add **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**.
3. Under **Auth → Authorized redirect URLs**, add `https://<host>/oauth/linkedin/callback`.
4. Add to `.env.social.local`:
   ```
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   LINKEDIN_REDIRECT_URI=https://<host>/oauth/linkedin/callback
   LINKEDIN_VERSION=202607
   ```
5. **Optional: analytics.** LinkedIn gives post analytics and follower counts only
   to approved apps. After LinkedIn grants **Member Post Analytics** and
   **Member Profile Analytics**, add
   `LINKEDIN_EXTRA_SCOPES=r_member_postAnalytics r_member_profileAnalytics`
   and reconnect. Publishing works without these.

What works: text posts and posts with one image. Tokens last about 60 days, and
then the account needs reconnecting. The app refreshes tokens automatically if
LinkedIn issued a refresh token.

## X (Twitter)

1. Go to <https://developer.x.com/en/portal/dashboard>, then **Projects & Apps**, then your app, then **User authentication settings**.
2. App permissions: **Read and write**. Type of app: **Web App (confidential client)**.
3. Callback URI: `https://<host>/oauth/x/callback`. Website URL: any valid URL.
4. Copy the **OAuth 2.0 Client ID and Client Secret**, not the API Key.
   ```
   X_CLIENT_ID=...
   X_CLIENT_SECRET=...
   X_REDIRECT_URI=https://<host>/oauth/x/callback
   X_METRICS_MINUTES=360
   ```

What works: text posts, posts with one image (up to 5 MB), likes, replies,
reposts and impressions, and follower count. Tokens refresh automatically.
The Free tier allows very few reads, so each post's metrics refresh at most
every `X_METRICS_MINUTES` (default 6 hours). Image upload
(`media.write`) needs an API tier that includes media upload.

## YouTube

1. Go to <https://console.cloud.google.com/>, create a project, then **APIs & Services → Library** and enable **YouTube Data API v3**.
2. Set up the **OAuth consent screen** as External, and add your Google account as a **Test user**.
3. Under **Credentials → Create credentials → OAuth client ID**, choose **Web application**, with the
   authorized redirect URI `https://<host>/oauth/youtube/callback`.
4. Add to `.env.social.local`:
   ```
   YOUTUBE_CLIENT_ID=....apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=...
   YOUTUBE_REDIRECT_URI=https://<host>/oauth/youtube/callback
   YOUTUBE_PRIVACY_STATUS=public     # or unlisted / private
   YOUTUBE_MAX_MB=1024
   ```
5. The signed-in Google account must have a YouTube channel.

To publish, create a post, pick **YouTube**, and paste a **public HTTPS video URL**
(a direct .mp4 link). The post title becomes the video title (max 100 characters)
and the content becomes the description. The worker downloads the video and
uploads it with YouTube's resumable upload. Views, likes, comments and subscribers
are tracked.

**Important:** Google locks videos uploaded by an **unverified** API project to
**private** until the project passes Google's API compliance audit. For a demo,
that's fine. For real public uploads, apply for the audit in Google Cloud.
Uploads cost about 1,600 quota units (default quota is 10,000 per day), so about 6 uploads per day.

---

## Security notes

- Media URLs must be public HTTPS URLs. The server refuses URLs that resolve to
  private or local addresses, follows at most 3 redirects, and checks the file
  type and size before uploading.
- Tokens are stored encrypted (`SOCIAL_TOKEN_KEY`). Provider error messages
  are never shown or logged, because they can contain tokens.
