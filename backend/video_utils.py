import os
import tempfile
import cv2
import httpx

DOWNLOAD_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPilotBot/1.0"}
MAX_SHORT_DURATION_SECONDS = 180  # YouTube's current Shorts cutoff (3 minutes)


def _resolve_to_local_path(url, media_dir):
    """
    If the URL points at our own /media/ static files, resolve it to the local
    file path directly (avoids re-downloading a file we already have on disk).
    Otherwise, download it to a temp file.
    """
    if "/media/" in url:
        filename = url.split("/media/")[-1].split("?")[0]
        local_path = os.path.join(media_dir, filename)
        if os.path.isfile(local_path):
            return local_path, False  # False = not a temp file, don't delete after use

    with httpx.stream("GET", url, timeout=120, follow_redirects=True, headers=DOWNLOAD_HEADERS) as resp:
        if resp.status_code != 200:
            raise Exception(f"Failed to download video for validation: {resp.status_code}")
        suffix = os.path.splitext(url.split("?")[0])[1] or ".mp4"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        for chunk in resp.iter_bytes(chunk_size=1024 * 1024):
            tmp.write(chunk)
        tmp.close()
        return tmp.name, True  # True = temp file, caller should delete after use


def get_video_info(url, media_dir):
    """
    Returns (duration_seconds, width, height) for a video at the given URL.
    """
    local_path, is_temp = _resolve_to_local_path(url, media_dir)
    try:
        cap = cv2.VideoCapture(local_path)
        if not cap.isOpened():
            raise Exception("Could not open video file for inspection")

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        duration = (frame_count / fps) if fps and fps > 0 else 0
        return duration, width, height
    finally:
        if is_temp:
            os.remove(local_path)


def validate_youtube_short(url, media_dir):
    """
    Checks whether a video qualifies as a YouTube Short.
    Returns (is_eligible: bool, reason: str)
    """
    try:
        duration, width, height = get_video_info(url, media_dir)
    except Exception as e:
        return False, f"Could not inspect video: {e}"

    if duration <= 0 or width <= 0 or height <= 0:
        return False, "Could not determine video duration or dimensions"

    if duration > MAX_SHORT_DURATION_SECONDS:
        return False, f"Video is {duration:.0f}s long ? Shorts must be {MAX_SHORT_DURATION_SECONDS}s or shorter"

    if width > height:
        return False, f"Video is horizontal ({width}x{height}) ? Shorts must be vertical or square"

    return True, f"Eligible: {duration:.0f}s, {width}x{height}"
