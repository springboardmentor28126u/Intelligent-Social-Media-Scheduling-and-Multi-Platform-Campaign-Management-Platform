import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.team import Team, TeamMember, TeamInvitation
from app.db.models.user import User
from app.schemas.team import (
    TeamCreate, TeamUpdate, TeamResponse, TeamMemberResponse, TeamInviteRequest
)
from app.core.security import get_current_user, require_permission
from app.services.audit import log_audit_event
from app.services.notifications import create_notification


router = APIRouter(
    prefix="/teams",
    tags=["Team Management"]
)


@router.get("", response_model=List[TeamResponse])
def list_my_teams(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = current_user["user_id"]
    is_admin = current_user["role"] == "administrator"

    if is_admin:
        teams = db.query(Team).all()
    else:
        # User owned or member of
        team_ids = [m.team_id for m in db.query(TeamMember).filter(TeamMember.user_id == uid).all()]
        teams = db.query(Team).filter(
            (Team.owner_id == uid) | (Team.id.in_(team_ids))
        ).all()

    results = []
    for t in teams:
        members_data = []
        for m in t.members:
            if m.user:
                members_data.append(TeamMemberResponse(
                    id=m.id,
                    user_id=m.user_id,
                    user_name=m.user.name,
                    user_email=m.user.email,
                    user_avatar=m.user.avatar_url,
                    role=m.role,
                    can_publish=m.can_publish,
                    can_approve=m.can_approve,
                    created_at=m.created_at
                ))
        
        t_res = TeamResponse(
            id=t.id,
            uuid=t.uuid,
            name=t.name,
            slug=t.slug,
            description=t.description,
            avatar_url=t.avatar_url,
            owner_id=t.owner_id,
            members_count=len(members_data),
            members=members_data,
            created_at=t.created_at
        )
        results.append(t_res)
    return results


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    team_data: TeamCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slug_base = team_data.name.lower().replace(" ", "-")
    slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    team = Team(
        name=team_data.name,
        slug=slug,
        description=team_data.description,
        avatar_url=team_data.avatar_url,
        owner_id=current_user["user_id"]
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    # Add owner as owner member
    owner_member = TeamMember(
        team_id=team.id,
        user_id=current_user["user_id"],
        role="owner",
        can_publish=True,
        can_approve=True
    )
    db.add(owner_member)
    db.commit()

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="team.create",
        module="teams",
        description=f"Created team '{team.name}'"
    )

    return TeamResponse(
        id=team.id,
        uuid=team.uuid,
        name=team.name,
        slug=team.slug,
        description=team.description,
        avatar_url=team.avatar_url,
        owner_id=team.owner_id,
        members_count=1,
        members=[TeamMemberResponse(
            id=owner_member.id,
            user_id=current_user["user_id"],
            user_name=current_user["name"],
            user_email=current_user["email"],
            user_avatar=None,
            role="owner",
            can_publish=True,
            can_approve=True,
            created_at=owner_member.created_at
        )],
        created_at=team.created_at
    )


@router.post("/{team_id}/invite")
def invite_team_member(
    team_id: int,
    invite_data: TeamInviteRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if target user exists in system
    target_user = db.query(User).filter(User.email == invite_data.email.lower()).first()
    if target_user:
        # Check if already a member
        existing_member = db.query(TeamMember).filter(
            TeamMember.team_id == team.id,
            TeamMember.user_id == target_user.id
        ).first()
        if existing_member:
            raise HTTPException(status_code=400, detail="User is already a member of this team")

        # Automatically join user
        member = TeamMember(
            team_id=team.id,
            user_id=target_user.id,
            role=invite_data.role,
            can_publish=True,
            can_approve=(invite_data.role in ["owner", "manager"])
        )
        db.add(member)
        db.commit()

        create_notification(
            db=db,
            user_id=target_user.id,
            title="Team Invitation Added 👥",
            message=f"You have been added to team '{team.name}' as a {invite_data.role.title()}.",
            type="team_invite",
            link="/team"
        )

        return {"message": f"{target_user.name} added to team '{team.name}' as {invite_data.role}"}
    else:
        # Create invitation record
        invitation = TeamInvitation(
            team_id=team.id,
            email=invite_data.email.lower(),
            role=invite_data.role,
            token=uuid.uuid4().hex,
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()

        return {"message": f"Invitation dispatched to {invite_data.email} for team '{team.name}'"}


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    team_id: int,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove the team owner")

    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    db.delete(member)
    db.commit()
    return None
