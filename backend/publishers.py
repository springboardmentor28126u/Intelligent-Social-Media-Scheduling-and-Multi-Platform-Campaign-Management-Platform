import os
import json
import time
import tempfile
import httpx
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

LINKEDIN_POST_URL = "https://api.linkedin.com/rest/posts"
LINKEDIN_VIDEOS_URL = "https://api.linkedin.com/rest/videos"
LINKEDIN_IMAGES_URL = "https://api.linkedin.com/rest/images"
LINKEDIN_API_VERSION = "202607"
LINKEDIN_SOCIAL_ACTIONS_URL = "https://api.linkedin.com/rest/socialActions"
DOWNLOAD_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPilotBot/1.0"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"}


def _linkedin_headers(access_token):
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_API_VERSION,
    }
def get_linkedin_post_stats(access_token: str, post_urn: str):
    """
    Fetches likes/comments for a LinkedIn post via the socialActions API.
    post_urn is the external_post_id stored on PostPlatform (e.g. "urn:li:share:123...").
    Returns (success: bool, stats_dict_or_error)
    """
    encoded_urn = quote(post_urn, safe="")
    response = httpx.get(
        f"{LINKEDIN_SOCIAL_ACTIONS_URL}/{encoded_urn}",
        headers=_linkedin_headers(access_token),
    )
    if response.status_code != 200:
        return False, f"LinkedIn API error {response.status_code}: {response.text}"

    data = response.json()
    return True, {
        "likes": data.get("likesSummary", {}).get("totalLikes", 0),
        "comments": data.get("commentsSummary", {}).get("totalFirstLevelComments", 0),
    }


def _download_to_temp(url, suffix):
    with httpx.stream("GET", url, timeout=120, follow_redirects=True, headers=DOWNLOAD_HEADERS) as resp:
        if resp.status_code != 200:
            return None, f"Failed to download media from URL: {resp.status_code}"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        for chunk in resp.iter_bytes(chunk_size=1024 * 1024):
            tmp.write(chunk)
        tmp.close()
        return tmp.name, None


def _upload_linkedin_image(access_token, person_urn, image_url):
    ext = os.path.splitext(image_url.split("?")[0])[1].lower() or ".jpg"
    image_path, error = _download_to_temp(image_url, ext)
    if error:
        return None, error

    init_resp = httpx.post(
        f"{LINKEDIN_IMAGES_URL}?action=initializeUpload",
        headers=_linkedin_headers(access_token),
        json={"initializeUploadRequest": {"owner": f"urn:li:person:{person_urn}"}},
    )
    if init_resp.status_code != 200:
        os.remove(image_path)
        return None, f"LinkedIn image init error {init_resp.status_code}: {init_resp.text}"

    init_data = init_resp.json()["value"]
    image_urn = init_data["image"]
    upload_url = init_data["uploadUrl"]

    with open(image_path, "rb") as f:
        put_resp = httpx.put(upload_url, content=f.read(), timeout=120)

    os.remove(image_path)

    if put_resp.status_code not in (200, 201):
        return None, f"LinkedIn image upload failed {put_resp.status_code}: {put_resp.text}"

    return image_urn, None


def _upload_linkedin_video(access_token, person_urn, video_url):
    video_path, error = _download_to_temp(video_url, ".mp4")
    if error:
        return None, error

    file_size = os.path.getsize(video_path)

    init_resp = httpx.post(
        f"{LINKEDIN_VIDEOS_URL}?action=initializeUpload",
        headers=_linkedin_headers(access_token),
        json={
            "initializeUploadRequest": {
                "owner": f"urn:li:person:{person_urn}",
                "fileSizeBytes": file_size,
                "uploadCaptions": False,
                "uploadThumbnail": False,
            }
        },
    )
    if init_resp.status_code != 200:
        os.remove(video_path)
        return None, f"LinkedIn video init error {init_resp.status_code}: {init_resp.text}"

    init_data = init_resp.json()["value"]
    video_urn = init_data["video"]
    upload_instructions = init_data["uploadInstructions"]

    uploaded_part_ids = []
    with open(video_path, "rb") as f:
        for instruction in upload_instructions:
            first_byte = instruction["firstByte"]
            last_byte = instruction["lastByte"]
            upload_url = instruction["uploadUrl"]
            f.seek(first_byte)
            chunk_data = f.read(last_byte - first_byte + 1)
            put_resp = httpx.put(upload_url, content=chunk_data, timeout=120)
            if put_resp.status_code not in (200, 201):
                os.remove(video_path)
                return None, f"LinkedIn video chunk upload failed {put_resp.status_code}: {put_resp.text}"
            etag = put_resp.headers.get("ETag") or put_resp.headers.get("etag")
            uploaded_part_ids.append(etag)

    os.remove(video_path)

    finalize_resp = httpx.post(
        f"{LINKEDIN_VIDEOS_URL}?action=finalizeUpload",
        headers=_linkedin_headers(access_token),
        json={
            "finalizeUploadRequest": {
                "video": video_urn,
                "uploadToken": "",
                "uploadedPartIds": uploaded_part_ids,
            }
        },
    )
    if finalize_resp.status_code != 200:
        return None, f"LinkedIn video finalize error {finalize_resp.status_code}: {finalize_resp.text}"

    return video_urn, None


def publish_linkedin(access_token: str, person_urn: str, content: str, video_url: str = None):
    """
    Publishes a post to LinkedIn. If video_url points to an image file, uploads as an image;
    if it points to a video file, uploads as a video. Detected by file extension.
    Returns (success: bool, external_post_id_or_error: str)
    """
    payload = {
        "author": f"urn:li:person:{person_urn}",
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }

    if video_url:
        ext = os.path.splitext(video_url.split("?")[0])[1].lower()
        if ext in IMAGE_EXTENSIONS:
            asset_urn, error = _upload_linkedin_image(access_token, person_urn, video_url)
        else:
            asset_urn, error = _upload_linkedin_video(access_token, person_urn, video_url)

        if error:
            return False, error
        payload["content"] = {
            "media": {
                "id": asset_urn,
                "title": "Media",
            }
        }

    response = httpx.post(LINKEDIN_POST_URL, headers=_linkedin_headers(access_token), json=payload)

    if response.status_code == 201:
        post_id = response.headers.get("x-restli-id", "unknown")
        return True, post_id
    else:
        return False, f"LinkedIn API error {response.status_code}: {response.text}"


YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET")
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

def refresh_youtube_token(db, social_account):
    response = httpx.post(
        YOUTUBE_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": social_account.refresh_token,
            "client_id": YOUTUBE_CLIENT_ID,
            "client_secret": YOUTUBE_CLIENT_SECRET,
        },
    )
    data = response.json()
    new_access_token = data.get("access_token")
    if not new_access_token:
        raise Exception(f"Failed to refresh YouTube token: {response.text}")

    expires_in = data.get("expires_in", 3600)
    social_account.access_token = new_access_token
    social_account.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    db.commit()
    return new_access_token


def get_valid_youtube_token(db, social_account):
    now = datetime.now(timezone.utc)
    if social_account.token_expires_at is None or social_account.token_expires_at <= now + timedelta(minutes=2):
        return refresh_youtube_token(db, social_account)
    return social_account.access_token

def get_youtube_video_stats(db, social_account, video_id: str):
    """
    Fetches view/like/comment counts for a YouTube video.
    Returns (success: bool, stats_dict_or_error)
    """
    access_token = get_valid_youtube_token(db, social_account)

    response = httpx.get(
        YOUTUBE_VIDEOS_URL,
        params={"part": "statistics", "id": video_id},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if response.status_code != 200:
        return False, f"YouTube API error {response.status_code}: {response.text}"

    items = response.json().get("items", [])
    if not items:
        return False, "Video not found or stats unavailable"

    stats = items[0]["statistics"]
    return True, {
        "views": int(stats.get("viewCount", 0)),
        "likes": int(stats.get("likeCount", 0)),
        "comments": int(stats.get("commentCount", 0)),
    }

def publish_youtube(db, social_account, video_url: str, title: str, description: str, is_short: bool = False):
    access_token = get_valid_youtube_token(db, social_account)

    try:
        with httpx.stream("GET", video_url, timeout=120, follow_redirects=True, headers=DOWNLOAD_HEADERS) as video_response:
            if video_response.status_code != 200:
                return False, f"Failed to download video from URL: {video_response.status_code}"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            for chunk in video_response.iter_bytes(chunk_size=1024 * 1024):
                tmp.write(chunk)
            tmp.close()
            video_path = tmp.name
    except Exception as e:
        return False, f"Video download error: {e}"

    final_title = title or "Untitled"
    if is_short and "#Shorts" not in final_title:
        final_title = final_title + " #Shorts"

    metadata = {
        "snippet": {
            "title": final_title,
            "description": description or "",
            "categoryId": "22",
        },
        "status": {
            "privacyStatus": "public",
        },
    }

    try:
        with open(video_path, "rb") as video_file:
            files = {
                "data": (None, json.dumps(metadata), "application/json; charset=UTF-8"),
                "file": ("video.mp4", video_file, "video/mp4"),
            }
            response = httpx.post(
                YOUTUBE_UPLOAD_URL,
                params={"uploadType": "multipart", "part": "snippet,status"},
                headers={"Authorization": f"Bearer {access_token}"},
                files=files,
                timeout=300,
            )
    finally:
        os.remove(video_path)

    if response.status_code == 200:
        video_id = response.json().get("id", "unknown")
        return True, video_id
    else:
        return False, f"YouTube API error {response.status_code}: {response.text}"


# ---------------------------------------------------------------------------
# Instagram
# ---------------------------------------------------------------------------
# NOTE: this module is called from synchronous Celery tasks, same as the
# YouTube functions above, so these are plain sync httpx calls — deliberately
# NOT the async `refresh_instagram_token` in instagram_auth.py, which exists
# only for the OAuth callback route. Same pattern as get_valid_youtube_token
# vs. the token exchange that happens in the OAuth callback.

INSTAGRAM_GRAPH_URL = "https://graph.instagram.com/v22.0"
INSTAGRAM_REFRESH_URL = "https://graph.instagram.com/refresh_access_token"
INSTAGRAM_POLL_INTERVAL_SECONDS = 10
INSTAGRAM_POLL_MAX_ATTEMPTS = 30  # ~5 minutes


def refresh_instagram_token(db, social_account):
    """
    Refreshes an Instagram long-lived token if it's within 7 days of expiring.
    Instagram tokens must be refreshed *before* they expire — an already-expired
    token cannot be refreshed and requires the user to reconnect via OAuth.
    """
    now = datetime.now(timezone.utc)
    if social_account.token_expires_at and social_account.token_expires_at > now + timedelta(days=7):
        return social_account.access_token

    response = httpx.get(
        INSTAGRAM_REFRESH_URL,
        params={
            "grant_type": "ig_refresh_token",
            "access_token": social_account.access_token,
        },
    )
    if response.status_code != 200:
        raise Exception(f"Failed to refresh Instagram token: {response.text}")

    data = response.json()
    social_account.access_token = data["access_token"]
    social_account.token_expires_at = now + timedelta(seconds=data["expires_in"])
    db.commit()
    return social_account.access_token


def get_valid_instagram_token(db, social_account):
    return refresh_instagram_token(db, social_account)


def publish_instagram(db, social_account, content: str, media_url: str = None, is_reel: bool = False):
    """
    Publishes a post to Instagram via the two-step container flow: create a
    media container (pointing at a public image/video URL), poll until it's
    processed, then publish it.
    Returns (success: bool, external_post_id_or_error: str)
    """
    if not media_url:
        return False, "Instagram posts require an image or video URL"

    access_token = get_valid_instagram_token(db, social_account)
    ig_user_id = social_account.platform_user_id

    ext = os.path.splitext(media_url.split("?")[0])[1].lower()
    is_video = ext in VIDEO_EXTENSIONS or is_reel

    container_params = {
        "access_token": access_token,
        "caption": content or "",
    }
    if is_video:
        container_params["media_type"] = "REELS" if is_reel else "VIDEO"
        container_params["video_url"] = media_url
    else:
        container_params["image_url"] = media_url

    create_resp = httpx.post(
        f"{INSTAGRAM_GRAPH_URL}/{ig_user_id}/media",
        params=container_params,
        timeout=60,
    )
    if create_resp.status_code != 200:
        return False, f"Instagram container error {create_resp.status_code}: {create_resp.text}"

    creation_id = create_resp.json()["id"]

    if is_video:
        for _ in range(INSTAGRAM_POLL_MAX_ATTEMPTS):
            status_resp = httpx.get(
                f"{INSTAGRAM_GRAPH_URL}/{creation_id}",
                params={"fields": "status_code", "access_token": access_token},
                timeout=30,
            )
            if status_resp.status_code != 200:
                return False, f"Instagram status check error {status_resp.status_code}: {status_resp.text}"

            status_code = status_resp.json().get("status_code")
            if status_code == "FINISHED":
                break
            elif status_code == "ERROR":
                return False, "Instagram media processing failed"
            time.sleep(INSTAGRAM_POLL_INTERVAL_SECONDS)
        else:
            return False, "Instagram media processing timed out"

    publish_resp = httpx.post(
        f"{INSTAGRAM_GRAPH_URL}/{ig_user_id}/media_publish",
        params={"creation_id": creation_id, "access_token": access_token},
        timeout=60,
    )
    if publish_resp.status_code != 200:
        return False, f"Instagram publish error {publish_resp.status_code}: {publish_resp.text}"

    media_id = publish_resp.json().get("id", "unknown")
    return True, media_id


def get_instagram_post_insights(db, social_account, ig_media_id: str):
    """
    Fetches reach/likes/comments/shares/saved for an Instagram post.
    Returns (success: bool, stats_dict_or_error)
    """
    access_token = get_valid_instagram_token(db, social_account)

    response = httpx.get(
        f"{INSTAGRAM_GRAPH_URL}/{ig_media_id}/insights",
        params={
            "metric": "reach,likes,comments,shares,saved",
            "access_token": access_token,
        },
    )
    if response.status_code != 200:
        return False, f"Instagram API error {response.status_code}: {response.text}"

    data = response.json().get("data", [])
    stats = {item["name"]: item["values"][0]["value"] for item in data}
    return True, {
        "reach": stats.get("reach", 0),
        "likes": stats.get("likes", 0),
        "comments": stats.get("comments", 0),
        "shares": stats.get("shares", 0),
        "saved": stats.get("saved", 0),
    }


# ---------------------------------------------------------------------------
# Facebook (Pages)
# ---------------------------------------------------------------------------
# Page access tokens derived from a long-lived user token (see
# facebook_auth.py) don't expire on their own, so unlike YouTube/Instagram
# there's no refresh step needed before calling these.

FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v22.0"


def publish_facebook(access_token: str, page_id: str, content: str, media_url: str = None):
    """
    Publishes a post to a Facebook Page. Facebook's Page endpoints accept a
    plain media URL directly (unlike LinkedIn/Instagram, no upload step is
    needed) — image URLs go through /photos, video URLs through /videos,
    text-only posts through /feed.
    Returns (success: bool, external_post_id_or_error: str)
    """
    if media_url:
        ext = os.path.splitext(media_url.split("?")[0])[1].lower()
        if ext in VIDEO_EXTENSIONS:
            endpoint = f"{FACEBOOK_GRAPH_URL}/{page_id}/videos"
            payload = {"file_url": media_url, "description": content or "", "access_token": access_token}
        else:
            endpoint = f"{FACEBOOK_GRAPH_URL}/{page_id}/photos"
            payload = {"url": media_url, "caption": content or "", "access_token": access_token}
    else:
        endpoint = f"{FACEBOOK_GRAPH_URL}/{page_id}/feed"
        payload = {"message": content or "", "access_token": access_token}

    response = httpx.post(endpoint, data=payload, timeout=120)

    if response.status_code != 200:
        return False, f"Facebook API error {response.status_code}: {response.text}"

    result = response.json()
    # /photos and /videos return {"id": ..., "post_id": ...}; /feed returns {"id": ...}
    post_id = result.get("post_id") or result.get("id", "unknown")
    return True, post_id


def get_facebook_post_stats(access_token: str, post_id: str):
    """
    Fetches likes/comments/shares for a Facebook Page post.
    Returns (success: bool, stats_dict_or_error)
    """
    response = httpx.get(
        f"{FACEBOOK_GRAPH_URL}/{post_id}",
        params={
            "fields": "likes.summary(true),comments.summary(true),shares",
            "access_token": access_token,
        },
    )
    if response.status_code != 200:
        return False, f"Facebook API error {response.status_code}: {response.text}"

    data = response.json()
    return True, {
        "likes": data.get("likes", {}).get("summary", {}).get("total_count", 0),
        "comments": data.get("comments", {}).get("summary", {}).get("total_count", 0),
        "shares": data.get("shares", {}).get("count", 0),
    }


# ---------------------------------------------------------------------------
# X (Twitter)
# ---------------------------------------------------------------------------
# Free tier only supports OAuth login + basic profile read — no posting or
# tweet-level analytics without a paid tier. This refresh helper exists so
# the "connected" status stays accurate (X access tokens expire in ~2 hours)
# and so upgrading to paid later only requires adding publish/stats
# functions, not rebuilding the auth plumbing.

X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
X_CLIENT_ID = os.getenv("X_CLIENT_ID")
X_CLIENT_SECRET = os.getenv("X_CLIENT_SECRET")


def refresh_x_token(db, social_account):
    response = httpx.post(
        X_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": social_account.refresh_token,
            "client_id": X_CLIENT_ID,
        },
        auth=(X_CLIENT_ID, X_CLIENT_SECRET),
    )
    if response.status_code != 200:
        raise Exception(f"Failed to refresh X token: {response.text}")

    data = response.json()
    social_account.access_token = data["access_token"]
    # X rotates refresh tokens on use — the old one becomes invalid.
    if data.get("refresh_token"):
        social_account.refresh_token = data["refresh_token"]
    social_account.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 7200))
    db.commit()
    return social_account.access_token


def get_valid_x_token(db, social_account):
    now = datetime.now(timezone.utc)
    if social_account.token_expires_at is None or social_account.token_expires_at <= now + timedelta(minutes=2):
        return refresh_x_token(db, social_account)
    return social_account.access_token