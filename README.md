# Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform

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
