import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from database import get_db
from config import MEDIA_DIR
import models
import schemas
import auth

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_MEDIA_EXTENSIONS = ALLOWED_VIDEO_EXTENSIONS | ALLOWED_IMAGE_EXTENSIONS
DEFAULT_MAX_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024


def get_max_upload_size(db: Session) -> int:
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "max_upload_size_mb").first()
        if setting and setting.value is not None:
            return int(setting.value) * 1024 * 1024
    except Exception:
        pass
    return DEFAULT_MAX_UPLOAD_SIZE_BYTES


def get_file_url(request: Request, filename: str) -> str:
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL")
    base = PUBLIC_BASE_URL.rstrip("/") if PUBLIC_BASE_URL else str(request.base_url).rstrip("/")
    return f"{base}/media/{filename}"


def sync_disk_media_to_db(db: Session, user_id: int, request: Request):
    """Scan MEDIA_DIR and add any untracked files to the media table."""
    try:
        if not os.path.exists(MEDIA_DIR):
            return
        existing_filenames = {m.filename for m in db.query(models.Media.filename).all()}
        for fname in os.listdir(MEDIA_DIR):
            if fname in existing_filenames or fname.startswith("."):
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALLOWED_MEDIA_EXTENSIONS:
                continue
            file_path = os.path.join(MEDIA_DIR, fname)
            if not os.path.isfile(file_path):
                continue
            size = os.path.getsize(file_path)
            media_type = "image" if ext in ALLOWED_IMAGE_EXTENSIONS else "video"
            url = get_file_url(request, fname)
            media_item = models.Media(
                user_id=user_id,
                filename=fname,
                original_filename=fname,
                file_path=file_path,
                file_url=url,
                media_type=media_type,
                mime_type=f"{media_type}/{ext.lstrip('.')}",
                size_bytes=size,
            )
            db.add(media_item)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error syncing media files: {e}")


@router.post("/upload", response_model=schemas.MediaOut)
async def upload_media_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(list(ALLOWED_MEDIA_EXTENSIONS))}",
        )

    max_size = get_max_upload_size(db)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(MEDIA_DIR, unique_name)

    size = 0
    try:
        with open(save_path, "wb") as out_file:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_size:
                    out_file.close()
                    if os.path.exists(save_path):
                        os.remove(save_path)
                    max_mb = max_size // (1024 * 1024)
                    raise HTTPException(status_code=400, detail=f"File exceeds maximum upload size limit ({max_mb}MB)")
                out_file.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    media_type = "image" if ext in ALLOWED_IMAGE_EXTENSIONS else "video"
    file_url = get_file_url(request, unique_name)

    media_record = models.Media(
        user_id=current_user.id,
        filename=unique_name,
        original_filename=file.filename or unique_name,
        file_path=save_path,
        file_url=file_url,
        media_type=media_type,
        mime_type=file.content_type or f"{media_type}/{ext.lstrip('.')}",
        size_bytes=size,
    )
    db.add(media_record)
    db.commit()
    db.refresh(media_record)
    return media_record


@router.get("", response_model=schemas.MediaListResponse)
def list_media(
    request: Request,
    media_type: Optional[str] = Query(None, description="Filter by 'image' or 'video'"),
    search: Optional[str] = Query(None, description="Search by filename"),
    sort: Optional[str] = Query("newest", description="Sort by 'newest', 'oldest', 'size_desc', 'size_asc', 'name'"),
    all_users: bool = Query(False, description="Admin: view all platform media"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Auto sync any disk files if database is empty
    sync_disk_media_to_db(db, current_user.id, request)

    query = db.query(models.Media)

    is_admin = current_user.role in ["Administrator", "admin"]
    if not (is_admin and all_users):
        query = query.filter(models.Media.user_id == current_user.id)

    if media_type and media_type.lower() in ["image", "video"]:
        query = query.filter(models.Media.media_type == media_type.lower())

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (models.Media.original_filename.ilike(search_pattern)) |
            (models.Media.filename.ilike(search_pattern))
        )

    if sort == "oldest":
        query = query.order_by(asc(models.Media.created_at))
    elif sort == "size_desc":
        query = query.order_by(desc(models.Media.size_bytes))
    elif sort == "size_asc":
        query = query.order_by(asc(models.Media.size_bytes))
    elif sort == "name":
        query = query.order_by(asc(models.Media.original_filename))
    else:
        # Default newest
        query = query.order_by(desc(models.Media.created_at))

    items = query.all()
    total_size = sum(item.size_bytes for item in items)

    return schemas.MediaListResponse(
        items=items,
        total=len(items),
        total_size_bytes=total_size,
    )


@router.get("/{media_id}", response_model=schemas.MediaOut)
def get_media_item(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")

    is_admin = current_user.role in ["Administrator", "admin"]
    if media.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to access this media item")

    return media


@router.delete("/{media_id}")
def delete_media_item(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")

    is_admin = current_user.role in ["Administrator", "admin"]
    if media.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this media item")

    # Delete physical file from disk if it exists
    if media.file_path and os.path.exists(media.file_path):
        try:
            os.remove(media.file_path)
        except Exception as e:
            print(f"Warning: Failed to delete physical file {media.file_path}: {e}")

    db.delete(media)
    db.commit()
    return {"message": "Media item deleted successfully", "id": media_id}
