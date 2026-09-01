import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.core.config import settings
from app.core.security import get_current_user


router = APIRouter(
    prefix="/media",
    tags=["Media Storage"]
)


@router.post("/upload")
async def upload_media_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Allowed content types
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"]
    content_type = file.content_type or "image/jpeg"
    
    if content_type not in allowed_types:
        # Accept anyways if filename extension is common image/video
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov"]:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {content_type}")

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(target_path)
    file_url = f"/uploads/{unique_filename}"

    return {
        "file_name": file.filename,
        "file_url": file_url,
        "file_type": content_type,
        "file_size": file_size,
        "thumbnail_url": file_url
    }
