"""Team memberships and explicit request ownership scopes.

Workspace records belong to a non-login principal. Selecting a workspace never
grants access to a member's personal records or system administrator routes.
"""
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, EmailStr, ConfigDict, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import User, Workspace, Membership, OAuthAttempt, TeamInvitation
from roles import Role


def expired(invitation):
    deadline = invitation.expires_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return deadline <= datetime.now(timezone.utc)


def attach_invitations(db, user):
    """Attach pending invites without activating membership or sending email."""
    for invitation in db.query(TeamInvitation).filter_by(email=user.email.lower(), status="pending").all():
        if expired(invitation):
            continue
        member = db.query(Membership).filter_by(workspace_id=invitation.workspace_id, user_id=user.id).first()
        if member is None:
            db.add(Membership(workspace_id=invitation.workspace_id, user_id=user.id,
                              role=invitation.role, status="invited"))
            from notifications import notify_user
            workspace = db.get(Workspace, invitation.workspace_id)
            notify_user(db, user.id, "team", f"Invitation to {workspace.name}",
                        "Open Teams to accept within seven days of the invitation.", workspace_id=workspace.id)


def can_manage(workspace, member):
    return workspace.owner_id == member.user_id or member.is_admin


def membership(db, workspace_id, actor_id, manage=False):
    workspace = db.get(Workspace, workspace_id)
    member = db.query(Membership).filter_by(workspace_id=workspace_id, user_id=actor_id, status="active").first()
    if workspace is None or member is None:
        raise HTTPException(403, "You do not have access to this workspace")
    if manage and not can_manage(workspace, member):
        raise HTTPException(403, "Only a workspace administrator can manage the team")
    return workspace, member


def scoped_payload(db, payload, workspace_header):
    if not workspace_header:
        return {**payload, "actor_sub": payload["sub"]}
    try:
        workspace_id = int(workspace_header)
    except ValueError:
        raise HTTPException(400, "Invalid workspace") from None
    workspace, member = membership(db, workspace_id, int(payload["sub"]))
    return {**payload, "actor_sub": payload["sub"], "sub": str(workspace.storage_user_id),
            "role": member.role, "workspace_id": workspace.id, "can_manage": can_manage(workspace, member),
            "require_approval": workspace.require_approval}


class WorkspaceInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=100)
    require_approval: bool = True


class InviteInput(BaseModel):
    email: EmailStr
    role: Role = Role.CONTENT_CREATOR


class RoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Role | None = None
    is_admin: bool | None = None

    @model_validator(mode="after")
    def changes_present(self):
        if self.role is None and self.is_admin is None:
            raise ValueError("Supply a role or team-management flag")
        return self


def make_router(verify_token):
    router = APIRouter(prefix="/teams", tags=["Teams"])

    @router.get("")
    def list_teams(payload=Depends(verify_token), db: Session = Depends(get_db)):
        rows = db.query(Workspace, Membership).join(Membership, Membership.workspace_id == Workspace.id).filter(
            Membership.user_id == int(payload["sub"])).all()
        result = []
        user = db.get(User, int(payload["sub"]))
        for w, m in rows:
            invite = db.query(TeamInvitation).filter_by(workspace_id=w.id, email=user.email.lower()).first()
            state = "expired" if m.status == "invited" and invite and expired(invite) else m.status
            result.append({"id": w.id, "name": w.name, "owner_id": w.owner_id, "role": m.role,
                           "status": state, "can_manage": can_manage(w, m), "require_approval": w.require_approval})
        return result

    @router.post("", status_code=201)
    def create(data: WorkspaceInput, payload=Depends(verify_token), db: Session = Depends(get_db)):
        if payload["role"] in {"business_user", "administrator"}:
            raise HTTPException(403, "A read-only user cannot create a workspace")
        actor = int(payload["sub"])
        if db.query(Workspace).filter_by(owner_id=actor).count() >= 20:
            raise HTTPException(409, "Workspace limit reached")
        principal = User(name=data.name, email=f"{secrets.token_hex(24)}@workspace.invalid",
                         password_hash="!workspace-no-login", role="content_creator", is_workspace=True)
        db.add(principal)
        db.flush()
        workspace = Workspace(name=data.name, owner_id=actor, storage_user_id=principal.id, require_approval=data.require_approval)
        db.add(workspace)
        db.flush()
        db.add(Membership(workspace_id=workspace.id, user_id=actor, role=payload["role"], is_admin=True, status="active"))
        db.commit()
        return {"id": workspace.id, "name": workspace.name}

    @router.patch("/{workspace_id}")
    def update(workspace_id: int, data: WorkspaceInput, payload=Depends(verify_token), db: Session = Depends(get_db)):
        workspace, _ = membership(db, workspace_id, int(payload["sub"]), True)
        workspace.name, workspace.require_approval = data.name, data.require_approval
        db.commit()
        return {"message": "Workspace updated"}

    @router.get("/{workspace_id}/members")
    def members(workspace_id: int, payload=Depends(verify_token), db: Session = Depends(get_db)):
        workspace, _ = membership(db, workspace_id, int(payload["sub"]))
        rows = db.query(Membership, User).join(User, User.id == Membership.user_id).filter(Membership.workspace_id == workspace_id).all()
        return [{"user_id": u.id, "name": u.name, "email": u.email, "role": m.role, "status": m.status, "is_admin": m.is_admin, "can_manage": can_manage(workspace, m)} for m, u in rows]

    @router.post("/{workspace_id}/invitations", status_code=201)
    def invite(workspace_id: int, data: InviteInput, payload=Depends(verify_token), db: Session = Depends(get_db)):
        workspace, _ = membership(db, workspace_id, int(payload["sub"]), True)
        user = db.query(User).filter(func.lower(User.email) == str(data.email).lower(), User.is_workspace.is_(False)).first()
        # Serialize invitations within a team, including concurrent duplicate requests.
        db.query(Workspace).filter_by(id=workspace_id).with_for_update().first()
        email = str(data.email).lower()
        existing = db.query(TeamInvitation).filter_by(workspace_id=workspace_id, email=email).first()
        member = db.query(Membership).filter_by(workspace_id=workspace_id, user_id=user.id).first() if user else None
        if (member and member.status == "active") or (existing and existing.status == "pending" and not expired(existing)):
            raise HTTPException(409, "This person is already a member or has an invitation")
        if existing is None:
            existing = TeamInvitation(workspace_id=workspace_id, email=email)
            db.add(existing)
        existing.role, existing.status = data.role.value, "pending"
        existing.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db.flush()
        if member:
            member.role = data.role.value
        if user:
            attach_invitations(db, user)
        db.commit()
        return {"message": "Invitation saved for seven days. It appears after registration; no email is sent."}

    @router.get("/{workspace_id}/invitations")
    def invitations(workspace_id: int, payload=Depends(verify_token), db: Session = Depends(get_db)):
        membership(db, workspace_id, int(payload["sub"]), True)
        return [{"email": i.email, "role": i.role, "status": "expired" if i.status == "pending" and expired(i) else i.status,
                 "expires_at": i.expires_at} for i in db.query(TeamInvitation).filter_by(workspace_id=workspace_id).all()]

    @router.post("/{workspace_id}/accept")
    def accept(workspace_id: int, payload=Depends(verify_token), db: Session = Depends(get_db)):
        member = db.query(Membership).filter_by(workspace_id=workspace_id, user_id=int(payload["sub"]), status="invited").first()
        if member is None:
            raise HTTPException(404, "Invitation not found")
        user = db.get(User, int(payload["sub"]))
        invite = db.query(TeamInvitation).filter_by(workspace_id=workspace_id, email=user.email.lower()).with_for_update().first()
        if invite and (invite.status != "pending" or expired(invite)):
            raise HTTPException(410, "Invitation expired. Ask a team administrator to invite you again.")
        if invite:
            invite.status = "accepted"
        member.status = "active"
        from notifications import notify_scope
        workspace = db.get(Workspace, workspace_id)
        notify_scope(db, workspace.storage_user_id, "team", "Team invitation accepted", "A new member joined the workspace.")
        db.commit()
        return {"message": "You joined the workspace"}

    @router.patch("/{workspace_id}/members/{user_id}")
    def change_role(workspace_id: int, user_id: int, data: RoleInput, payload=Depends(verify_token), db: Session = Depends(get_db)):
        workspace, _ = membership(db, workspace_id, int(payload["sub"]), True)
        if user_id == workspace.owner_id and (int(payload["sub"]) != workspace.owner_id or data.is_admin is False):
            raise HTTPException(409, "The owner keeps team-management rights and chooses their own role")
        member = db.query(Membership).filter_by(workspace_id=workspace_id, user_id=user_id).first()
        if member is None:
            raise HTTPException(404, "Member not found")
        if data.role is not None:
            member.role = data.role.value
        if data.is_admin is not None:
            member.is_admin = data.is_admin
        db.query(OAuthAttempt).filter_by(user_id=workspace.storage_user_id, actor_id=user_id).delete()
        from notifications import notify_user
        notify_user(db, user_id, "team", "Workspace role changed", f"Your role is {member.role.replace('_', ' ')}. Team management: {can_manage(workspace, member)}.", workspace_id=workspace_id)
        db.commit()
        return {"message": "Role updated"}

    @router.delete("/{workspace_id}/members/{user_id}")
    def remove(workspace_id: int, user_id: int, payload=Depends(verify_token), db: Session = Depends(get_db)):
        actor = int(payload["sub"])
        workspace = db.get(Workspace, workspace_id)
        if workspace is None:
            raise HTTPException(404, "Workspace not found")
        if user_id != actor:
            membership(db, workspace_id, actor, True)
        if user_id == workspace.owner_id:
            raise HTTPException(409, "The workspace owner cannot leave or be removed")
        member = db.query(Membership).filter_by(workspace_id=workspace_id, user_id=user_id).first()
        if member is None:
            raise HTTPException(404, "Member not found")
        db.delete(member)
        user = db.get(User, user_id)
        invitation = db.query(TeamInvitation).filter_by(workspace_id=workspace_id, email=user.email.lower()).first()
        if invitation:
            invitation.status = "revoked"
        db.query(OAuthAttempt).filter_by(user_id=workspace.storage_user_id, actor_id=user_id).delete()
        db.commit()
        return {"message": "Membership or invitation removed"}

    return router
