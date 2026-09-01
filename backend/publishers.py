import os
import json
import tempfile
import httpx
from datetime import datetime, timedelta, timezone

LINKEDIN_POST_URL = "https://api.linkedin.com/rest/posts"
LINKEDIN_API_VERSION = "202607"


def publish_linkedin(access_token: str, person_urn: str, content: str):
    """
    Publishes a text post to LinkedIn on behalf of the connected member.
    Returns (success: bool, external_post_id_or_error: str)
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_API_VERSION,
    }
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

    response = httpx.post(LINKEDIN_POST_URL, headers=headers, json=payload)

    if response.status_code == 201:
        post_id = response.headers.get("x-restli-id", "unknown")
        return True, post_id
    else:
        return False, f"LinkedIn API error {response.status_code}: {response.text}"


YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET")
DOWNLOAD_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPilotBot/1.0"}


def refresh_youtube_token(db, social_account):
    """
    Refreshes an expired/near-expired YouTube access token using the stored refresh_token.
    Updates the SocialAccount row in place and commits. Returns the fresh access_token.
    """
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
    """Returns a valid access token, refreshing first if it's expired or about to expire."""
    now = datetime.now(timezone.utc)
    if social_account.token_expires_at is None or social_account.token_expires_at <= now + timedelta(minutes=2):
        return refresh_youtube_token(db, social_account)
    return social_account.access_token


def publish_youtube(db, social_account, video_url: str, title: str, description: str):
    """
    Downloads a video from video_url, then uploads it to YouTube as the connected channel.
    Returns (success: bool, external_post_id_or_error: str)
    """
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

    metadata = {
        "snippet": {
            "title": title or "Untitled",
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
