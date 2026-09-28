from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.team import Team, TeamMember
from app.schemas.team import (
    TeamMemberOut, TeamMemberCreate, TeamMemberUpdate, TeamMemberInvite, TeamOut
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/team", tags=["Team Management & RBAC"])

@router.get("/members", response_model=List[TeamMemberOut])
def get_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve all members
    members = db.query(TeamMember).all()
    if not members:
        # Default team
        team = db.query(Team).first()
        if not team:
            team = Team(name="IntelliPost Growth Team")
            db.add(team)
            db.commit()
            db.refresh(team)
        m = TeamMember(
            team_id=team.id,
            user_id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            role="Admin",
            permissions="view,create,edit,delete,publish,analytics,manage_team",
            status="Active"
        )
        db.add(m)
        db.commit()
        members = [m]
    return members

@router.post("/invite", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    invite_in: TeamMemberInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team = db.query(Team).first()
    if not team:
        team = Team(name="IntelliPost Growth Team")
        db.add(team)
        db.commit()
        db.refresh(team)

    # Check if already invited
    existing = db.query(TeamMember).filter(TeamMember.email == invite_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member with this email is already on the team.")

    new_member = TeamMember(
        team_id=team.id,
        name=invite_in.name,
        email=invite_in.email.lower().strip(),
        role=invite_in.role,
        permissions=invite_in.permissions or "view,create,edit,publish",
        status="Active",
        avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={invite_in.name.replace(' ', '')}"
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.put("/members/{member_id}", response_model=TeamMemberOut)
def update_team_member(
    member_id: int,
    member_update: TeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")

    update_data = member_update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(member, key, val)

    db.commit()
    db.refresh(member)
    return member

@router.delete("/members/{member_id}")
def remove_team_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")
    
    db.delete(member)
    db.commit()
    return {"success": True, "message": "Team member removed successfully"}
