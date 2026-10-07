# OAuth callback checklist

Prepare these entries; do not change provider consoles until deployment is approved. Replace `API_HOST` with the final backend hostname, with no trailing slash. Use an API custom domain if available. Callback URLs must match exactly, including scheme and path.

| Console | Backend environment variable | Authorized redirect URI |
| --- | --- | --- |
| Meta Facebook Login | FACEBOOK_REDIRECT_URI | https://API_HOST/oauth/facebook/callback |
| Meta Instagram Business Login | INSTAGRAM_REDIRECT_URI | https://API_HOST/oauth/instagram/callback |
| Google Cloud OAuth web client (YouTube) | YOUTUBE_REDIRECT_URI | https://API_HOST/oauth/youtube/callback |
| X developer app, OAuth 2.0 | X_REDIRECT_URI | https://API_HOST/oauth/x/callback |
| LinkedIn developer app | LINKEDIN_REDIRECT_URI | https://API_HOST/oauth/linkedin/callback |

- Keep client IDs, client secrets, and redirect URIs together on the backend. Do not put provider secrets in Vercel or any VITE variable.
- Set `META_GRAPH_VERSION` to the version enabled and tested for the Meta application.
- Preserve provider products/scopes already used by this project. YouTube uses upload and read-only scopes; X uses PKCE and offline access; LinkedIn uses OpenID/profile/member posting. Facebook uses Page permissions; Instagram uses Business Login permissions.
- Check provider app testing/live status, allowed testers, business verification and permission review before onboarding other users. Production hosting alone does not grant provider approval.
- Verify connect, callback success, account listing and disconnect for all five providers on staging. Run only synthetic/mock publishing until the user approves a real test post.
- OAuth cookies are HttpOnly, scoped to `/oauth/{provider}`, and Secure for HTTPS callbacks. Use direct backend callback URLs, not the local nginx `/api` proxy path, for provider testing.
- The final browser returns to the existing application tab after authorization. Set `CORS_ORIGINS` to the exact frontend origin. No wildcard production CORS.

No provider credentials or console settings were inspected or changed during this preparation.
