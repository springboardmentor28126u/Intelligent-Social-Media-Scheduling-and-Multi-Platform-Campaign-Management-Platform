from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.db.models.audit import AuditLog


def log_audit_event(
    db: Session,
    action: str,
    module: str,
    description: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status: str = "success",
    payload: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Records an audit event in the database for compliance and tracking."""
    log_entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        module=module,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        status=status,
        payload=payload
    )
    db.add(log_entry)
    try:
        db.commit()
        db.refresh(log_entry)
    except Exception:
        db.rollback()
    return log_entry
