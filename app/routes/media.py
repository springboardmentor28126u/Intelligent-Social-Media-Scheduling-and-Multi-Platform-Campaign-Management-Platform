import os
import shutil
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends
from pathlib import Path
from urllib.parse import quote



from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.post import Post
from app.models.post_media import (
    MediaType,
    PostMedia,
)
from app.models.user import User


router = APIRouter(
    prefix="/media",
    tags=["Media"],
)


UPLOAD_DIRECTORY = "uploads"


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/jpg",
}


ALLOWED_VIDEO_TYPES = {
    "video/mp4",
}


def get_media_type(
    content_type: str,
):

    if content_type in ALLOWED_IMAGE_TYPES:
        return MediaType.IMAGE

    if content_type in ALLOWED_VIDEO_TYPES:
        return MediaType.VIDEO

    return None


@router.post("/posts/{post_id}/upload")
def upload_post_media(
    post_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Check Post Ownership
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Validate File
    # =====================================

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="File type is missing",
        )

    media_type = get_media_type(
        file.content_type
    )

    if not media_type:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Only JPG, PNG and MP4 are allowed."
            ),
        )

    # =====================================
    # Create Upload Directory
    # =====================================

    post_upload_directory = os.path.join(
        UPLOAD_DIRECTORY,
        str(current_user.id),
        str(post_id),
    )

    os.makedirs(
        post_upload_directory,
        exist_ok=True,
    )

    # =====================================
    # Generate Unique Filename
    # =====================================

    original_file_name = file.filename or "media"

    file_extension = os.path.splitext(
        original_file_name
    )[1]

    unique_file_name = (
        f"{uuid.uuid4()}{file_extension}"
    )

    file_path = os.path.join(
        post_upload_directory,
        unique_file_name,
    )

    # =====================================
    # Save File
    # =====================================

    with open(
        file_path,
        "wb",
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer,
        )

    file_size = os.path.getsize(
        file_path
    )

    # =====================================
    # Save Database Record
    # =====================================

    post_media = PostMedia(
        post_id=post.id,
        media_type=media_type,
        file_name=original_file_name,
        file_path=file_path,
        mime_type=file.content_type,
        file_size=file_size,
    )

    db.add(post_media)
    db.commit()
    db.refresh(post_media)

    return {
        "message": "Media uploaded successfully",
        "media": {
            "id": post_media.id,
            "post_id": post_media.post_id,
            "media_type": post_media.media_type.value,
            "file_name": post_media.file_name,
            "file_path": post_media.file_path,
            "mime_type": post_media.mime_type,
            "file_size": post_media.file_size,
        },
    }
@router.delete("/{media_id}")
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    media = db.query(PostMedia).filter(
    PostMedia.id == media_id
    ).first()

    if not media:
        raise HTTPException(
            status_code=404,
            detail="Media not found"
        )

    # Make sure the media belongs to the current user
    post = db.query(Post).filter(
        Post.id == media.post_id,
        Post.user_id == current_user.id
    ).first()

    if not post:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this media"
        )

    # Delete the physical file
    file_path = Path(media.file_path)

    if file_path.exists():
        file_path.unlink()

    # Delete database record
    db.delete(media)
    db.commit()

    return {
        "message": "Media deleted successfully",
        "media_id": media_id
    }
    # =====================================
    # Delete Published LinkedIn Post
    # =====================================

def delete_post(self, linkedin_post_id: str):

        if not self.social_account:
            raise ValueError(
                "LinkedIn social account is required"
            )

        self.check_token_status()

        if not linkedin_post_id:
            raise ValueError(
                "LinkedIn post ID is required"
            )

        # Encode the LinkedIn URN
        encoded_post_id = quote(
            linkedin_post_id,
            safe=""
        )

        headers = self.get_linkedin_headers()

        headers["X-RestLi-Method"] = "DELETE"

        delete_url = (
            f"{self.POSTS_URL}/"
            f"{encoded_post_id}"
        )

        print("================================")
        print("LINKEDIN DELETE POST DEBUG")
        print("Post ID:", linkedin_post_id)
        print("Delete URL:", delete_url)
        print("================================")

        response = httpx.delete(
            delete_url,
            headers=headers,
            timeout=30.0,
        )

        print(
            "LINKEDIN DELETE RESPONSE STATUS:",
            response.status_code
        )

        print(
            "LINKEDIN DELETE RESPONSE:",
            response.text
        )

        # LinkedIn successfully deletes with 204
        if response.status_code == 204:

            return {
                "platform": "linkedin",
                "status": "deleted",
                "linkedin_post_id": linkedin_post_id,
                "message": (
                    "LinkedIn post deleted successfully"
                ),
            }

        # Unauthorized token
        if response.status_code == 401:

            self.social_account.status = (
                "reconnect_required"
            )

            self.social_account.is_active = False

            raise ValueError(
                "LinkedIn access token is invalid "
                "or expired. Please reconnect "
                "your LinkedIn account."
            )

        # Other errors
        raise ValueError(
            "LinkedIn post deletion failed "
            f"({response.status_code}): "
            f"{response.text}"
        )
# =====================================
# Delete Published LinkedIn Post
# =====================================

def delete_post(self, linkedin_post_id: str):
    """
    Delete a published LinkedIn post.
    """

    if not self.social_account:
        raise ValueError(
            "LinkedIn social account is required"
        )

    self.check_token_status()

    if not linkedin_post_id:
        raise ValueError(
            "LinkedIn post ID is required"
        )

    # LinkedIn post URN example:
    # urn:li:ugcPost:7504217393481678849

    encoded_post_id = quote(
        linkedin_post_id,
        safe=""
    )

    delete_url = (
        f"https://api.linkedin.com/rest/posts/"
        f"{encoded_post_id}"
    )

    headers = {
        "Authorization": (
            f"Bearer {self.social_account.access_token}"
        ),
        "LinkedIn-Version": "202609",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    print("=" * 40)
    print("LINKEDIN DELETE POST DEBUG")
    print("Post ID:", linkedin_post_id)
    print("URL:", delete_url)
    print("=" * 40)

    response = requests.delete(
        delete_url,
        headers=headers,
        timeout=30,
    )

    print(
        "LINKEDIN DELETE RESPONSE STATUS:",
        response.status_code
    )

    print(
        "LINKEDIN DELETE RESPONSE:",
        response.text
    )

    if response.status_code not in (
        200,
        204,
    ):
        raise ValueError(
            "LinkedIn post deletion failed: "
            f"{response.status_code} - "
            f"{response.text}"
        )

    return {
        "platform": "linkedin",
        "status": "deleted",
        "linkedin_post_id": linkedin_post_id,
    }