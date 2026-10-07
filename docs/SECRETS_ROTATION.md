# Secrets rotation checklist

This is an operator checklist, not authorization to change credentials, publish,
send messages or deploy. Never paste values into chat, command history, reports,
screenshots or Git. The repository check does not open private environment files.

## Preserve the encryption key

**SOCIAL_TOKEN_KEY must never be regenerated during routine secret rotation.**
Replacing it would invalidate every stored social token encrypted with the old
key. Preserve the original key privately and consistently across the backend and
workers. Do not use the startup helpers to generate secrets. If this key is ever
compromised, stop workers and plan a separate recovery/re-encryption procedure;
do not simply replace it and restart.

## Before changing provider secrets

- Stop the backend, publishing worker and notification worker with Ctrl+C.
- Retain a private database backup outside OneDrive. Treat backup dumps as
  sensitive: they contain account data and encrypted tokens. Restrict access.
- Identify the exact provider app and credentials in its console. Client IDs
  are identifiers; client secrets and account access/refresh tokens are secrets.
- Keep callbacks unchanged unless intentionally updating the tunnel address.

## Meta: Instagram and Facebook

- Open your app in the [Meta developer dashboard](https://developers.facebook.com/apps/).
- Reset the relevant app secret using that app's secret management controls.
  Check both Facebook and Instagram app configurations; they may use different
  credentials. Do not assume resetting one resets the other.
- Privately update `FACEBOOK_CLIENT_SECRET` and/or `INSTAGRAM_CLIENT_SECRET` in
  `Backend/.env.social.local`, matching the app used by each integration.
- If account tokens were exposed, revoke their access at Meta and reconnect
  those accounts separately. Resetting a client secret is not a substitute for
  revoking a compromised account token. Keep Meta tester restrictions in place.

## Google: YouTube

- Select the project's OAuth client in Google Auth Platform > Clients.
- Add a new client secret, privately update `YOUTUBE_CLIENT_SECRET` in
  `Backend/.env.social.local`, and restart only the backend to validate login and
  reconnection without publishing. Disable the old secret after validation;
  for an active compromise, disable it promptly even if this causes downtime.
- Revoke compromised Google account grants/tokens and reconnect as needed.
  See Google's [OAuth client rotation instructions](https://support.google.com/cloud/answer/15549257?hl=en).

## X

- Select the correct app in the [X developer console](https://console.x.com/).
- Regenerate the OAuth 2.0 client secret used by this app. Privately update
  `X_CLIENT_SECRET` in `Backend/.env.social.local`. If the console also changes
  the client ID, update `X_CLIENT_ID` to the matching identifier.
- Rotate any exposed OAuth 1.0 API key/secret or account token separately if
  used elsewhere; these are distinct from this application's OAuth 2.0 client
  credentials. Revoke exposed account grants and reconnect as needed.
- Rotation does not resolve the current billing restriction. See
  [X app credential guidance](https://docs.x.com/fundamentals/developer-apps).

## Finish privately

- Update any existing secure process/service configuration with matching values;
  helpers load the social configuration after the main configuration.
- Restart the backend, verify sign-in and permitted account connections, and
  review pending jobs before explicitly restarting workers. Do not send a real
  post or notification as a credential test without approval.
- Verify retired provider secrets no longer work. Record only provider, date and
  completion status, never values. Do not commit private configuration changes.
- The PostgreSQL password previously pasted into chat should be changed privately
  and all local connection settings updated; Git scanning cannot remediate that
  disclosure. No credential was changed by this housekeeping task.
