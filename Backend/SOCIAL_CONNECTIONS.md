# Social connections: backend setup

Connect accounts from the Social Accounts page. The old POST /accounts endpoint creates an unverified
record with connected=false. Only OAuth callbacks create verified connections.
Previously saved placeholder accounts are not migrated or silently verified.

## Configure once

Install requirements and run `python -m alembic upgrade head` from Backend.
Merge `.env.social.example` settings into your existing `.env` without replacing
database or JWT settings. Generate SOCIAL_TOKEN_KEY locally using the command in
the example. Keep it backed up and private: changing it makes existing tokens
unreadable. The application never generates or prints platform credentials.

## Connect in this order

1. Facebook: create/configure a Meta app with Facebook Login and Page permissions
   pages_show_list, pages_read_engagement, pages_manage_posts. This connects authorized
   Facebook Pages, not personal timelines. Set the app's supported META_GRAPH_VERSION.
2. Instagram: use Instagram API with Instagram Login for a professional account;
   configure instagram_business_basic and instagram_business_content_publish.
3. LinkedIn: enable Sign In with LinkedIn using OpenID Connect and Share on LinkedIn;
   request openid, profile, w_member_social. This connects the member profile.
4. X: configure an OAuth 2.0 confidential Web App, with tweet.read, users.read,
   tweet.write, offline.access. Authorization uses PKCE S256.

Register each exact callback URI in its developer portal. If the provider requires
HTTPS, use your own HTTPS backend address and matching redirect setting. Do not
assume local HTTP will be accepted by every platform. App access/permissions and
reviews must be enabled in the provider portal; this code cannot grant them.

## Test without frontend changes

Open backend /docs on the same host/scheme as the configured callback (localhost
and 127.0.0.1 are different hosts). Login and use Authorize with the returned JWT.
GET /oauth/providers lists missing settings by name without revealing values.
POST /oauth/{provider}/authorize returns an authorization_url and sets an HttpOnly
browser cookie. Open the URL in that same browser within ten minutes, sign in and
approve. In a browser the callback shows a confirmation page that closes itself; API clients
receive account summaries as JSON (never tokens). Instagram tokens are refreshed automatically
when fewer than 10 days remain. GET /accounts
lists the connected accounts. A reconnect updates the existing authorized account.

State is random, hashed in the database, browser-bound, expiring and single-use.
Tokens/PKCE verifiers are encrypted with Fernet. Expiry timestamps are stored when
provided. Disconnect removes local encrypted credentials; revoke app permissions
in the provider portal as well if you want to revoke the external grant.

## Current limits

Live authorization requires your credentials and approval. Automated tests mock
provider responses and cannot prove real platform access. No publishing, refresh
worker, expiry UI or remote token revocation is implemented here. Instagram uses
the initial token exchange; long-lived exchange/refresh is still needed before
long-running scheduled publishing. Requested scopes are not proof that a provider
granted every publishing permission. Validate granted permissions when implementing
the publisher. Use uvicorn --no-access-log when testing OAuth to avoid callback
authorization codes appearing in access logs; avoid logging callback queries at proxies.

## Official references

- https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api
- https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
