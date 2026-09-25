"""Provider publishing adapters. Secrets and raw provider errors never enter logs."""
import ipaddress
import json
import os
import re
import shutil
import socket
import tempfile
import time
import uuid
from urllib.parse import urlencode, quote, urljoin, urlparse
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


def provider_reason(exc):
    """Short, token-free reason from a provider error body (e.g. X 'CreditsDepleted', duplicate post)."""
    try:
        data = json.loads(exc.read(20_000) or b"{}")
    except Exception:
        return ""
    if not isinstance(data, dict):
        return ""
    parts = []
    for key in ("title", "detail", "message", "error_description"):
        value = data.get(key)
        if isinstance(value, str) and value not in parts:
            parts.append(value)
    errors = data.get("errors")
    if not parts and isinstance(errors, list) and errors and isinstance(errors[0], dict):
        parts.append(str(errors[0].get("message") or errors[0].get("title") or ""))
    text = re.sub(r"[A-Za-z0-9_\-\.]{32,}", "[redacted]", " – ".join(p for p in parts if p))
    return text[:200]


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
            reason = provider_reason(exc)
            raise PublishError("Authorization rejected; reconnect and check publishing permissions" + (f" ({reason})" if reason else "")) from None
        if exc.code >= 500:
            raise PublishError("Provider server error", retryable=not publishing, uncertain=publishing) from None
        reason = provider_reason(exc)
        if exc.code == 402:
            raise PublishError("Provider requires payment or API credits" + (f": {reason}" if reason else "")) from None
        raise PublishError(f"Provider rejected the content or request (HTTP {exc.code})" + (f": {reason}" if reason else "")) from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise PublishError("Provider response unavailable", retryable=not publishing, uncertain=publishing) from None


REFRESH_ENDPOINTS = {
    "x": "https://api.x.com/2/oauth2/token",
    "youtube": "https://oauth2.googleapis.com/token",
    "linkedin": "https://www.linkedin.com/oauth/v2/accessToken",
}


def refresh_token(db, credential, provider, token):
    """Exchange a refresh token (X, YouTube/Google, LinkedIn partner apps) and persist it."""
    prefix = provider.upper()
    client_id, secret = os.getenv(prefix + "_CLIENT_ID"), os.getenv(prefix + "_CLIENT_SECRET")
    if not client_id or not secret:
        raise PublishError(f"Configure {prefix}_CLIENT_ID/{prefix}_CLIENT_SECRET or reconnect")
    data = {"grant_type": "refresh_token", "refresh_token": token["refresh_token"], "client_id": client_id}
    basic = None
    if provider == "x":
        basic = client_id + ":" + secret
    else:
        data["client_secret"] = secret
    try:
        refreshed = provider_request(REFRESH_ENDPOINTS[provider], data=data, basic=basic)
        if not refreshed.get("access_token") or not refreshed.get("expires_in"):
            raise ValueError()
        refreshed.setdefault("refresh_token", token["refresh_token"])  # Google keeps the old one
        credential.expires_at = int(time.time()) + int(refreshed["expires_in"])
        credential.encrypted_token = cipher().encrypt(json.dumps(refreshed).encode()).decode()
        db.commit()
        return refreshed
    except (HTTPException, ValueError, TypeError):
        raise PublishError("Token refresh failed; reconnect the account") from None


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
        provider = getattr(credential, "provider", None)
        if provider in REFRESH_ENDPOINTS and token.get("refresh_token"):
            token = refresh_token(db, credential, provider, token)
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
        result_id = publish_linkedin(job, credential, token)
    elif job.provider == "x":
        payload = {"text": job.content}
        if job.image_url:
            payload["media"] = {"media_ids": [upload_x_image(job.image_url, token)]}
        result, _ = request("https://api.x.com/2/tweets", token, payload, json_body=True, publishing=True)
        result_id = result.get("data", {}).get("id")
    elif job.provider == "youtube":
        result_id = publish_youtube(db, job, token)
    else:
        raise PublishError("Unsupported publishing platform")
    if not result_id:
        raise PublishError("Provider accepted request without a post ID; verify manually", uncertain=True)
    return str(result_id)


# ---------------------------------------------------------------------------
# Media helpers (LinkedIn images, X images, YouTube videos)
# ---------------------------------------------------------------------------
IMAGE_LIMIT = 5 * 1024 * 1024          # X's image limit; LinkedIn accepts larger but 5 MB is plenty
VIDEO_LIMIT = int(os.getenv("YOUTUBE_MAX_MB", "1024")) * 1024 * 1024


def _public_host(url):
    """Reject non-HTTPS and any host that resolves to a private/loopback address (SSRF guard)."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise PublishError("Media URL must be a public HTTPS URL")
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(parsed.hostname, parsed.port or 443)}
    except (socket.gaierror, UnicodeError):
        raise PublishError("Media URL host cannot be resolved", retryable=True) from None
    if not addresses or any(not ipaddress.ip_address(a.split("%")[0]).is_global for a in addresses):
        raise PublishError("Media URL must point to a public host")


def fetch_media(url, limit, kind):
    """Download public media to a temporary file. Returns (path, size, content_type); caller deletes path."""
    for _ in range(4):  # follow up to 3 redirects, re-checking every hop
        _public_host(url)
        try:
            response = build_opener(NoRedirect()).open(Request(url, headers={"User-Agent": "SocialPilot/1.0"}), timeout=30)
        except HTTPError as exc:
            if exc.code in (301, 302, 303, 307, 308) and exc.headers.get("Location"):
                url = urljoin(url, exc.headers["Location"])
                continue
            raise PublishError(f"Could not download the {kind} (HTTP {exc.code}); check the URL is public") from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise PublishError(f"Could not download the {kind}; retry scheduled", retryable=True) from None
        with response:
            content_type = (response.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if not content_type.startswith(kind + "/"):
                raise PublishError(f"The URL did not return a{'n' if kind == 'image' else ''} {kind} (got {content_type or 'unknown'})")
            handle = tempfile.NamedTemporaryFile(delete=False, suffix="." + kind)
            size = 0
            try:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > limit:
                        raise PublishError(f"The {kind} is larger than {limit // (1024 * 1024)} MB")
                    handle.write(chunk)
            except PublishError:
                handle.close(); os.unlink(handle.name)
                raise
            except (OSError, TimeoutError):
                handle.close(); os.unlink(handle.name)
                raise PublishError(f"Downloading the {kind} was interrupted; retry scheduled", retryable=True) from None
            handle.close()
            if not size:
                os.unlink(handle.name)
                raise PublishError(f"The {kind} URL returned an empty file")
            return handle.name, size, content_type
    raise PublishError("Too many redirects while downloading media")


def send(url, token, body, content_type, method="POST", headers=None, publishing=False, timeout=60):
    """Low-level upload: raw bytes or an open file as the request body."""
    hdr = {"Content-Type": content_type, **(headers or {})}
    if token:
        hdr["Authorization"] = "Bearer " + token
    if hasattr(body, "read"):
        hdr["Content-Length"] = str(os.fstat(body.fileno()).st_size)
    try:
        with build_opener(NoRedirect()).open(Request(url, data=body, headers=hdr, method=method), timeout=timeout) as response:
            raw = response.read(2_000_000)
            try:
                result = json.loads(raw) if raw else {}
            except ValueError:
                result = {}
            return (result if isinstance(result, dict) else {}), response.headers
    except HTTPError as exc:
        if exc.code == 429:
            raise PublishError("Provider rate limit; retry scheduled", retryable=True, delay=300) from None
        if exc.code in (401, 403):
            raise PublishError("Authorization rejected; reconnect and check upload permissions") from None
        if exc.code >= 500:
            raise PublishError("Provider server error during upload", retryable=not publishing, uncertain=publishing) from None
        reason = provider_reason(exc)
        if exc.code == 402:
            raise PublishError("Provider requires payment or API credits" + (f": {reason}" if reason else "")) from None
        raise PublishError(f"Provider rejected the media upload (HTTP {exc.code})" + (f": {reason}" if reason else "")) from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise PublishError("Upload interrupted", retryable=not publishing, uncertain=publishing) from None


def multipart(fields, file_field, filename, file_bytes, file_type):
    boundary = "----socialpilot" + uuid.uuid4().hex
    lines = []
    for name, value in fields.items():
        lines += [f"--{boundary}", f'Content-Disposition: form-data; name="{name}"', "", str(value)]
    head = ("\r\n".join(lines + [f"--{boundary}", f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"',
                                  f"Content-Type: {file_type}", "", ""])).encode()
    return head + file_bytes + f"\r\n--{boundary}--\r\n".encode(), "multipart/form-data; boundary=" + boundary


def upload_x_image(image_url, token):
    path, _, content_type = fetch_media(image_url, IMAGE_LIMIT, "image")
    try:
        with open(path, "rb") as handle:
            body, ctype = multipart({"media_category": "tweet_image"}, "media", "image", handle.read(), content_type)
    finally:
        os.unlink(path)
    result, _ = send("https://api.x.com/2/media/upload", token, body, ctype)
    media_id = (result.get("data") or {}).get("id") or result.get("media_id_string")
    if not media_id:
        raise PublishError("X did not return a media ID")
    return str(media_id)


def linkedin_headers():
    version = os.getenv("LINKEDIN_VERSION", "202607")
    if not re.fullmatch(r"\d{6}", version):
        raise PublishError("LINKEDIN_VERSION must look like YYYYMM")
    return {"LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0"}


def publish_linkedin(job, credential, token):
    author = "urn:li:person:" + credential.external_id
    body = {
        "author": author, "commentary": job.content, "visibility": "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
        "lifecycleState": "PUBLISHED", "isReshareDisabledByAuthor": False,
    }
    if job.image_url:
        init, _ = request("https://api.linkedin.com/rest/images?action=initializeUpload", token,
                          {"initializeUploadRequest": {"owner": author}}, json_body=True, headers=linkedin_headers())
        value = init.get("value") or {}
        if not value.get("uploadUrl") or not value.get("image"):
            raise PublishError("LinkedIn did not return an image upload URL")
        path, _, content_type = fetch_media(job.image_url, IMAGE_LIMIT * 4, "image")
        try:
            with open(path, "rb") as handle:
                send(value["uploadUrl"], token, handle, content_type, method="PUT")
        finally:
            os.unlink(path)
        body["content"] = {"media": {"id": value["image"]}}
    result, headers = request("https://api.linkedin.com/rest/posts", token, body, json_body=True,
                              headers=linkedin_headers(), publishing=True)
    return headers.get("x-restli-id") or headers.get("X-RestLi-Id") or result.get("id")


def publish_youtube(db, job, token):
    """Resumable upload: create an upload session, then stream the video file."""
    from models import Post
    post = db.get(Post, job.post_id) if db is not None and job.post_id else None
    title = (post.title if post else "") or job.content[:100] or "Untitled"
    privacy = os.getenv("YOUTUBE_PRIVACY_STATUS", "public")
    if privacy not in {"public", "unlisted", "private"}:
        privacy = "public"
    path, size, content_type = fetch_media(job.video_url, VIDEO_LIMIT, "video")
    try:
        metadata = {
            "snippet": {"title": title[:100], "description": job.content[:5000],
                        "categoryId": os.getenv("YOUTUBE_CATEGORY_ID", "22")},
            "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
        }
        _, headers = send("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                          token, json.dumps(metadata).encode(), "application/json; charset=UTF-8",
                          headers={"X-Upload-Content-Length": str(size), "X-Upload-Content-Type": content_type})
        session = headers.get("Location")
        if not session or not session.startswith("https://www.googleapis.com/"):
            raise PublishError("YouTube did not start an upload session")
        with open(path, "rb") as handle:
            result, _ = send(session, token, handle, content_type, method="PUT", publishing=True, timeout=1800)
    finally:
        os.unlink(path)
    return result.get("id")
