import os
import json
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

