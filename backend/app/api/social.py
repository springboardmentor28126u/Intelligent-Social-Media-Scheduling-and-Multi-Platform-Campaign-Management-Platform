# app/api/social.py
#
# ONE job: LinkedIn connect routes (start + callback) and a list of
# the user's connections (tokens are never returned).

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database_pg import get_db
from app.db import social_pg
from app.models.schemas import UserPublic
from app.services import linkedin

router = APIRouter(tags=["social"])


def _page(message: str) -> HTMLResponse:
    # Temporary plain page; we'll redirect to the frontend later.
    return HTMLResponse(f"<h3>{message}</h3><p>You can close this tab.</p>")


@router.get("/auth/linkedin/start")
async def linkedin_start(current_user: UserPublic = Depends(get_current_user)):
    """Logged-in users only. Returns the LinkedIn URL to open in the browser."""
    state = linkedin.create_state(current_user.id)
    return {"auth_url": linkedin.build_auth_url(state)}


@router.get("/auth/linkedin/callback", response_class=HTMLResponse)
async def linkedin_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """LinkedIn redirects here (no JWT). The signed state tells us who the user is."""
    if error or not code or not state:
        return _page("LinkedIn connection cancelled or failed.")

    user_id = linkedin.verify_state(state)
    if user_id is None:
        return _page("Invalid or expired link. Please start again.")

    try:
        token, expires_at = await linkedin.exchange_code_for_token(code)
        profile = await linkedin.fetch_profile(token)
    except Exception as exc:
        print(f"⚠️ LinkedIn OAuth error: {exc}")
        return _page("Could not complete LinkedIn connection.")

    await social_pg.upsert_connection(
        db,
        user_id=user_id,
        platform="linkedin",
        platform_user_id=profile["sub"],
        display_name=profile.get("name"),
        access_token=token,
        expires_at=expires_at,
    )
    return _page("LinkedIn connected successfully ✅")


@router.get("/social/connections")
async def list_connections(
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Which platforms this user has really connected. No tokens returned."""
    conns = await social_pg.get_connections_by_user(db, current_user.id)
    return [
        {"platform": c.platform, "display_name": c.display_name, "expires_at": c.expires_at}
        for c in conns
    ]