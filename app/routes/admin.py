from fastapi import APIRouter, Depends

from app.models.user import User
from app.dependencies.admin import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    current_admin: User = Depends(get_current_admin)
):
    return {
        "message": "Welcome to Admin Dashboard",
        "admin_id": current_admin.id,
        "name": current_admin.name,
        "system_role": current_admin.system_role
    }