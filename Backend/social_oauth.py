"""Backend-only social authorization. No publishing occurs in these routes."""
import base64
import hashlib
import json
import os
import re
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request as URLRequest, build_opener, HTTPRedirectHandler
from urllib.error import URLError

from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from html import escape

from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import OAuthAttempt, SocialAccount, SocialCredential, User
from roles import permissions_for

load_dotenv(Path(__file__).with_name(".env.social.local"), override=False)

PROVIDERS = {
    "facebook": ("Facebook", "https://www.facebook.com/{version}/dialog/oauth", "https://graph.facebook.com/{version}/oauth/access_token", "pages_show_list,pages_read_engagement,pages_manage_posts"),
    "instagram": ("Instagram", "https://www.instagram.com/oauth/authorize", "https://api.instagram.com/oauth/access_token", "instagram_business_basic,instagram_business_content_publish"),
    "linkedin": ("LinkedIn", "https://www.linkedin.com/oauth/v2/authorization", "https://www.linkedin.com/oauth/v2/accessToken", "openid profile w_member_social"),
    "x": ("X", "https://x.com/i/oauth2/authorize", "https://api.x.com/2/oauth2/token", "tweet.read users.read tweet.write media.write offline.access"),
    "youtube": ("YouTube", "https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token",
                "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"),
}
# Providers whose authorization uses PKCE (S256) in addition to the client secret.
PKCE_PROVIDERS = {"x", "youtube"}


def scopes_for(provider):
    """Base scopes plus optional extras, e.g. LINKEDIN_EXTRA_SCOPES=r_member_postAnalytics."""
    base = PROVIDERS[provider][3]
    extra = os.getenv(provider.upper() + "_EXTRA_SCOPES", "").replace(",", " ").split()
    separator = "," if provider in {"facebook", "instagram"} else " "
    return separator.join(dict.fromkeys(base.split(separator) + extra))


def cipher():
    try:
        return Fernet(os.environ["SOCIAL_TOKEN_KEY"].encode())
    except (KeyError, ValueError):
        raise HTTPException(503, "Configure a valid SOCIAL_TOKEN_KEY before connecting accounts")


def settings(provider):
    if provider not in PROVIDERS:
        raise HTTPException(404, "Unsupported provider")
    prefix = provider.upper()
    required = [prefix + "_CLIENT_ID", prefix + "_CLIENT_SECRET", prefix + "_REDIRECT_URI"]
    if provider in {"facebook", "instagram"}:
        required.append("META_GRAPH_VERSION")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise HTTPException(503, "Missing settings: " + ", ".join(missing))
    redirect = os.environ[prefix + "_REDIRECT_URI"]
    parsed = urlparse(redirect)
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}):
        raise HTTPException(503, "Redirect URI must use HTTPS or local HTTP")
    if parsed.path != f"/oauth/{provider}/callback" or parsed.query or parsed.fragment or parsed.username:
        raise HTTPException(503, "Redirect URI must point to the provider callback route")
    version = os.getenv("META_GRAPH_VERSION", "")
    if provider in {"facebook", "instagram"} and not re.fullmatch(r"v\d+\.\d+", version):
        raise HTTPException(503, "META_GRAPH_VERSION must have the form vNN.0")
    cipher()
    return os.environ[prefix + "_CLIENT_ID"], os.environ[prefix + "_CLIENT_SECRET"], redirect, version


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def provider_request(url, data=None, token=None, basic=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if basic:
        headers["Authorization"] = "Basic " + base64.b64encode(basic.encode()).decode()
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    request = URLRequest(url, data=urlencode(data).encode() if data is not None else None, headers=headers)
    try:
        with build_opener(NoRedirect()).open(request, timeout=15) as response:
            result = json.loads(response.read(2_000_000))
        if not isinstance(result, dict) or "error" in result:
            raise ValueError()
        return result
    except (URLError, ValueError, TimeoutError, OSError):
        # Provider errors can contain tokens and must never be returned to callers.
        raise HTTPException(502, "Provider request failed; reconnect and check app permissions") from None


def exchange(provider, code, verifier):
    client_id, secret, redirect, version = settings(provider)
    endpoint = PROVIDERS[provider][2].format(version=version)
    data = dict(client_id=client_id, client_secret=secret, code=code, redirect_uri=redirect, grant_type="authorization_code")
    basic = None
    if provider == "x":
        data.pop("client_secret")
        data["code_verifier"] = verifier
        basic = client_id + ":" + secret
    if provider == "youtube":
        data["code_verifier"] = verifier
    token = provider_request(endpoint, data=data, basic=basic)
    access = token.get("access_token")
    if not isinstance(access, str) or not access:
        raise HTTPException(502, "Provider did not return an access token")
    if provider == "instagram":
        # Instagram business login initially returns a short-lived token. Exchange
        # it immediately so scheduled posts continue working beyond the login day.
        token = provider_request("https://graph.instagram.com/access_token?" + urlencode({
            "grant_type": "ig_exchange_token", "client_secret": secret, "access_token": access,
        }))
        access = token.get("access_token")
        if not isinstance(access, str) or not access:
            raise HTTPException(502, "Provider did not return a long-lived access token")
    if provider == "facebook":
        # Convert the short-lived login token before retrieving Page tokens so
        # the resulting Page connection remains usable for scheduled posts.
        token = provider_request(f"https://graph.facebook.com/{version}/oauth/access_token?" + urlencode({
            "grant_type": "fb_exchange_token", "client_id": client_id,
            "client_secret": secret, "fb_exchange_token": access,
        }))
        access = token.get("access_token")
        if not isinstance(access, str) or not access:
            raise HTTPException(502, "Provider did not return a long-lived access token")
        accounts = []
        cursor = None
        for _ in range(100):
            params = {"fields": "id,name,access_token", "limit": 100}
            if cursor:
                params["after"] = cursor
            result = provider_request(f"https://graph.facebook.com/{version}/me/accounts?" + urlencode(params), token=access)
            for page in result.get("data", []):
                accounts.append((page.get("id"), page.get("name"), {"access_token": page.get("access_token")}))
            if not result.get("paging", {}).get("next"):
                return accounts
            cursor = result.get("paging", {}).get("cursors", {}).get("after")
            if not cursor:
                break
        raise HTTPException(502, "Could not retrieve all authorized Pages")
    if provider == "instagram":
        profile = provider_request(f"https://graph.instagram.com/{version}/me?fields=user_id,username", token=access)
        return [(profile.get("user_id"), profile.get("username"), token)]
    if provider == "linkedin":
        profile = provider_request("https://api.linkedin.com/v2/userinfo", token=access)
        return [(profile.get("sub"), profile.get("name"), token)]
    if provider == "youtube":
        if not token.get("refresh_token"):
            raise HTTPException(502, "Google did not return a refresh token; remove the app from your Google account permissions and connect again")
        channels = provider_request("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", token=access)
        items = channels.get("items") or []
        if not items:
            raise HTTPException(400, "This Google account has no YouTube channel; create one first")
        return [(item.get("id"), item.get("snippet", {}).get("title"), token) for item in items]
    profile = provider_request("https://api.x.com/2/users/me", token=access).get("data", {})
    return [(profile.get("id"), profile.get("username"), token)]


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def provider_authorization_url(provider, state, verifier):
    client_id, _, redirect, version = settings(provider)
    params = dict(client_id=client_id, redirect_uri=redirect, response_type="code", state=state,
                  scope=scopes_for(provider))
    if provider == "youtube":
        # Offline access + consent guarantees a refresh token for scheduled uploads.
        params.update(access_type="offline", prompt="consent", include_granted_scopes="true")
    if provider in PKCE_PROVIDERS:
        params.update(code_challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode(),
                      code_challenge_method="S256")
    return PROVIDERS[provider][1].format(version=version) + "?" + urlencode(params)


def make_router(require_permission):
    router = APIRouter(prefix="/oauth", tags=["Social authorization"])

    @router.get("/providers")
    def providers(payload=Depends(require_permission("accounts:read"))):
        result = []
        for provider in PROVIDERS:
            try:
                settings(provider)
                reason = None
            except HTTPException as error:
                reason = error.detail
            result.append({"provider": provider, "configured": reason is None, "setup_required": reason})
        return result

    @router.post("/{provider}/authorize")
    def authorize(provider: str, response: Response, payload=Depends(require_permission("accounts:write")), db: Session = Depends(get_db)):
        _, _, redirect, _ = settings(provider)
        state, browser, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(32), secrets.token_urlsafe(64)
        now = int(time.time())
        db.execute(delete(OAuthAttempt).where(OAuthAttempt.expires_at < now))
        db.add(OAuthAttempt(state_hash=digest(state), user_id=int(payload["sub"]), provider=provider,
                            browser_hash=digest(browser), encrypted_verifier=cipher().encrypt(verifier.encode()).decode(), expires_at=now + 600))
        db.commit()
        response.headers["Cache-Control"] = "no-store"
        callback = urlparse(redirect)
        start_url = f"{callback.scheme}://{callback.netloc}/oauth/{provider}/start?" + urlencode({"state": state, "browser": browser})
        return {"authorization_url": start_url}

    @router.get("/{provider}/start")
    def start(provider: str, state: str, browser: str, db: Session = Depends(get_db)):
        if provider not in PROVIDERS:
            raise HTTPException(404, "Unsupported provider")
        attempt = db.query(OAuthAttempt).filter(
            OAuthAttempt.state_hash == digest(state), OAuthAttempt.provider == provider,
            OAuthAttempt.browser_hash == digest(browser), OAuthAttempt.expires_at >= int(time.time())
        ).one_or_none()
        if attempt is None:
            raise HTTPException(400, "Authorization expired or already used")
        verifier = cipher().decrypt(attempt.encrypted_verifier.encode()).decode()
        redirect = settings(provider)[2]
        response = RedirectResponse(provider_authorization_url(provider, state, verifier), status_code=302)
        response.set_cookie("oauth_" + provider, browser, httponly=True, secure=redirect.startswith("https:"),
                            samesite="lax", max_age=600, path="/oauth/" + provider)
        response.headers.update({"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})
        return response

    @router.get("/{provider}/callback")
    def callback(provider: str, state: str, request: Request, response: Response, code: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
        """Browsers get a readable page; API clients keep the JSON contract."""
        wants_html = "text/html" in request.headers.get("accept", "")
        try:
            result = complete_callback(provider, state, request, response, code, error, db)
        except HTTPException as failure:
            if not wants_html:
                raise
            return result_page(provider, False, str(failure.detail), failure.status_code)
        if not wants_html:
            return result
        names = ", ".join(a["account_name"] for a in result["accounts"])
        page = result_page(provider, True, f"Connected: {names}")
        page.delete_cookie("oauth_" + provider, path="/oauth/" + provider)
        return page

    return router


def result_page(provider, ok, message, status=200):
    title = f"{PROVIDERS.get(provider, (provider.title(),))[0]} {'connected' if ok else 'connection failed'}"
    body = (f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>{escape(title)}</title>"
            "<body style=\"font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;background:#f8fafc;color:#0f172a\">"
            "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px 32px;max-width:420px;text-align:center\">"
            f"<div style=\"font-size:40px\">{'&#10003;' if ok else '&#9888;'}</div><h2 style=\"margin:.4em 0\">{escape(title)}</h2>"
            f"<p style=\"color:#475569\">{escape(message)}</p><p style=\"color:#64748b;font-size:14px\">"
            f"{'You can close this tab and return to SocialPilot. Your accounts refresh automatically.' if ok else 'Close this tab and try Connect again from SocialPilot.'}"
            "</p></div>" + ("<script>setTimeout(function(){window.close()},2500)</script>" if ok else "") + "</body>")
    return HTMLResponse(body, status_code=status, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


def complete_callback(provider, state, request, response, code, error, db):
    """Validate state, exchange the code and store encrypted credentials."""
    browser = request.cookies.get("oauth_" + provider, "")
    attempt = db.execute(delete(OAuthAttempt).where(
        OAuthAttempt.state_hash == digest(state), OAuthAttempt.provider == provider,
        OAuthAttempt.browser_hash == digest(browser), OAuthAttempt.expires_at >= int(time.time())
    ).returning(OAuthAttempt.user_id, OAuthAttempt.encrypted_verifier)).mappings().one_or_none()
    db.commit()
    if attempt is None:
        raise HTTPException(400, "Authorization expired, already used, or opened in a different browser")
    response.delete_cookie("oauth_" + provider, path="/oauth/" + provider)
    response.headers.update({"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})
    user = db.get(User, attempt["user_id"])
    if user is None or "accounts:write" not in permissions_for(user.role):
        raise HTTPException(403, "Account connection permission is required")
    if error or not code:
        raise HTTPException(400, "Authorization was not granted; start again")
    verifier = cipher().decrypt(attempt["encrypted_verifier"].encode()).decode()
    profiles = exchange(provider, code, verifier)
    if not profiles:
        raise HTTPException(400, "No eligible accounts were authorized")
    results = []
    try:
        for external_id, name, token in profiles:
            if not external_id or not name or not token.get("access_token"):
                raise HTTPException(502, "Provider returned incomplete account details")
            credential = db.query(SocialCredential).filter_by(user_id=user.id, provider=provider, external_id=str(external_id)).first()
            if credential:
                account = db.get(SocialAccount, credential.account_id)
            else:
                account = SocialAccount(user_id=user.id, platform=PROVIDERS[provider][0], account_name=str(name)[:100], connected=True)
                db.add(account)
                db.flush()
                credential = SocialCredential(account_id=account.id, user_id=user.id, provider=provider, external_id=str(external_id))
                db.add(credential)
            account.account_name, account.connected = str(name)[:100], True
            credential.encrypted_token = cipher().encrypt(json.dumps(token).encode()).decode()
            lifetime = token.get("expires_in")
            credential.expires_at = int(time.time()) + int(lifetime) if lifetime is not None else None
            results.append({"id": account.id, "platform": account.platform, "account_name": account.account_name, "connected": True})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Connection changed concurrently; start authorization again") from None
    except (ValueError, TypeError):
        db.rollback()
        raise HTTPException(502, "Provider returned invalid account details") from None
    return {"accounts": results}
