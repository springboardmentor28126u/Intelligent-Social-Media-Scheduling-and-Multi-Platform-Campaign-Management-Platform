import os

MEDIA_DIR = os.getenv("MEDIA_DIR") or os.path.join(os.path.dirname(__file__), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)
