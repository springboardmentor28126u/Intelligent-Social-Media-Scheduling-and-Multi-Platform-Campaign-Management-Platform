"""Provider publishing adapters. Secrets and raw provider errors never enter logs."""
import json
import os
import re
import time
from urllib.parse import urlencode, quote
from urllib.request import Request, build_opener
from urllib.error import HTTPError, URLError

from cryptography.fernet import InvalidToken
from fastapi import HTTPException

from social_oauth import NoRedirect, cipher, provider_request

INSTAGRAM_REFRESH_WINDOW = 10 * 24 * 3600  # refresh when fewer than 10 days remain


class PublishError(Exception):
    def __init__(self, message, retryable=False, uncertain=False, delay=60):
        super().__init__(message)
        self.retryable = retryable
        self.uncertain = uncertain
        self.delay = delay


def request(url, token, data=None, json_body=False, headers=None, publishing=False):
    hdr = {"Authorization": "Bearer " + token, "Accept": "application/json", **(headers or {})}
    if data is not None:
        hdr["Content-Type"] = "application/json" if json_body else "application/x-www-form-urlencoded"
    body = (json.dumps(data).encode() if json_body else urlencode(data).encode()) if data is not None else None
    try:
        with build_opener(NoRedirect()).open(Request(url, data=body, headers=hdr), timeout=20) as response:
            raw = response.read(2_000_000)
            result = json.loads(raw) if raw else {}
            if not isinstance(result, dict) or result.get("error"):
                raise PublishError("Provider returned an unexpected result", uncertain=publishing)
            return result, response.headers
    except HTTPError as exc:
        if exc.code == 429:
            try:
                delay = max(60, min(int(exc.headers.get("Retry-After", "60")), 86400))
            except (ValueError, TypeError):
                delay = 60
            raise PublishError("Provider rate limit; retry scheduled", retryable=True, delay=delay) from None
        if exc.code in (401, 403):
            raise PublishError("Authorization rejected; reconnect and check publishing permissions") from None
        if exc.code >= 500:
            raise PublishError("Provider server error", retryable=not publishing, uncertain=publishing) from None
        raise PublishError("Provider rejected the content or request") from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise PublishError("Provider response unavailable", retryable=not publishing, uncertain=publishing) from None


def access_token(db, credential):
    try:
        token = json.loads(cipher().decrypt(credential.encrypted_token.encode()))
    except (InvalidToken, ValueError, HTTPException):
        raise PublishError("Stored credentials cannot be read; check encryption key or reconnect") from None
    # Instagram long-lived tokens last ~60 days and can be extended while still valid.
    if (getattr(credential, "provider", None) == "instagram" and credential.expires_at is not None
            and time.time() + 60 < credential.expires_at <= time.time() + INSTAGRAM_REFRESH_WINDOW):
        try:
            refreshed = provider_request("https://graph.instagram.com/refresh_access_token?" + urlencode({
                "grant_type": "ig_refresh_token", "access_token": token.get("access_token", "")}))
            if refreshed.get("access_token") and refreshed.get("expires_in"):
                token = {**token, "access_token": refreshed["access_token"], "expires_in": refreshed["expires_in"]}
                credential.expires_at = int(time.time()) + int(refreshed["expires_in"])
                credential.encrypted_token = cipher().encrypt(json.dumps(token).encode()).decode()
                db.commit()
        except (HTTPException, ValueError, TypeError):
            pass  # Keep using the current token until it actually expires.
    if credential.expires_at is not None and credential.expires_at <= time.time() + 60:
        if credential.provider == "x" and token.get("refresh_token"):
            client_id, secret = os.getenv("X_CLIENT_ID"), os.getenv("X_CLIENT_SECRET")
            if not client_id or not secret:
                raise PublishError("Configure X client credentials or reconnect")
            try:
                refreshed = provider_request("https://api.x.com/2/oauth2/token", data={
                    "grant_type": "refresh_token", "refresh_token": token["refresh_token"], "client_id": client_id
                }, basic=client_id + ":" + secret)
                if not refreshed.get("access_token") or not refreshed.get("expires_in"):
                    raise ValueError()
                refreshed.setdefault("refresh_token", token["refresh_token"])
                credential.expires_at = int(time.time()) + int(refreshed["expires_in"])
                credential.encrypted_token = cipher().encrypt(json.dumps(refreshed).encode()).decode()
                db.commit()
                token = refreshed
            except (HTTPException, ValueError, TypeError):
                raise PublishError("Token refresh failed; reconnect the account") from None
        else:
            raise PublishError("Access token expired; reconnect the account")
    if not token.get("access_token"):
        raise PublishError("Access token is missing; reconnect the account")
    return token["access_token"]


def publish(db, job, credential):
    token = access_token(db, credential)
    account = quote(credential.external_id, safe="")
    if job.provider in {"facebook", "instagram"}:
        version = os.getenv("META_GRAPH_VERSION", "")
        if not re.fullmatch(r"v\d+\.\d+", version):
            raise PublishError("Configure META_GRAPH_VERSION before publishing")
    if job.provider == "facebook":
        suffix = "photos" if job.image_url else "feed"
        data = {"url": job.image_url, "caption": job.content} if job.image_url else {"message": job.content}
        result, _ = request(f"https://graph.facebook.com/{version}/{account}/{suffix}", token, data, publishing=True)
        result_id = result.get("post_id") or result.get("id")
    elif job.provider == "instagram":
        if not job.container_id:
            result, _ = request(f"https://graph.instagram.com/{version}/{account}/media", token,
                                {"image_url": job.image_url, "caption": job.content})
            if not result.get("id"):
                raise PublishError("Instagram did not return a media container")
            job.container_id = str(result["id"])
            db.commit()
        container = quote(job.container_id, safe="")
        status, _ = request(f"https://graph.instagram.com/{version}/{container}?fields=status_code", token)
        if status.get("status_code") == "IN_PROGRESS":
            raise PublishError("Instagram image is processing", retryable=True, delay=60)
        if status.get("status_code") != "FINISHED":
            raise PublishError("Instagram media is not ready; review container status", uncertain=status.get("status_code") == "PUBLISHED")
        result, _ = request(f"https://graph.instagram.com/{version}/{account}/media_publish", token,
                            {"creation_id": job.container_id}, publishing=True)
        result_id = result.get("id")
    elif job.provider == "linkedin":
        result, headers = request("https://api.linkedin.com/v2/ugcPosts", token, {
            "author": "urn:li:person:" + credential.external_id, "lifecycleState": "PUBLISHED",
            "specificContent": {"com.linkedin.ugc.ShareContent": {"shareCommentary": {"text": job.content}, "shareMediaCategory": "NONE"}},
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
        }, json_body=True, headers={"X-Restli-Protocol-Version": "2.0.0"}, publishing=True)
        result_id = headers.get("X-RestLi-Id") or result.get("id")
    elif job.provider == "x":
        result, _ = request("https://api.x.com/2/tweets", token, {"text": job.content}, json_body=True, publishing=True)
        result_id = result.get("data", {}).get("id")
    else:
        raise PublishError("Unsupported publishing platform")
    if not result_id:
        raise PublishError("Provider accepted request without a post ID; verify manually", uncertain=True)
    return str(result_id)
