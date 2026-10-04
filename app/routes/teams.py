import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.team import Team
from app.models.team_invitation import TeamInvitation
from app.models.team_member import TeamMember
from app.schemas.team import (
    TeamCreate,
    TeamInvitationCreate,
    TeamInvitationResponse,
    TeamMemberCreate,
    TeamMemberResponse,
    TeamMemberUpdate,
    TeamResponse,
    TeamUpdate,
)

router = APIRouter(prefix="/teams", tags=["Teams"])


def get_team_or_404(
    team_id: int,
    db: Session,
) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team


def require_team_owner(
    team: Team,
    current_user,
) -> None:
    if team.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team owner can perform this action",
        )


def require_team_access(
    team_id: int,
    current_user,
    db: Session,
) -> Team:
    team = get_team_or_404(team_id, db)

    if team.owner_id == current_user.id:
        return team

    member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team",
        )

    return team


# -------------------------------------------------------------------
# Teams
# -------------------------------------------------------------------

@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing_team = (
        db.query(Team)
        .filter(Team.slug == team_data.slug)
        .first()
    )

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team slug already exists",
        )

    team = Team(
        name=team_data.name,
        slug=team_data.slug,
        description=team_data.description,
        avatar_url=team_data.avatar_url,
        owner_id=current_user.id,
    )

    db.add(team)
    db.flush()

    owner_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
        can_publish=True,
        can_approve=True,
    )

    db.add(owner_member)
    db.commit()
    db.refresh(team)

    return team


@router.get(
    "/",
    response_model=list[TeamResponse],
)
def get_teams(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    teams = (
        db.query(Team)
        .outerjoin(
            TeamMember,
            TeamMember.team_id == Team.id,
        )
        .filter(
            (Team.owner_id == current_user.id)
            | (TeamMember.user_id == current_user.id)
        )
        .distinct()
        .order_by(Team.created_at.desc())
        .all()
    )

    return teams


@router.get(
    "/{team_id}",
    response_model=TeamResponse,
)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = require_team_access(
        team_id,
        current_user,
        db,
    )

    return team


@router.put(
    "/{team_id}",
    response_model=TeamResponse,
)
def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    if team_data.slug is not None:
        existing_team = (
            db.query(Team)
            .filter(
                Team.slug == team_data.slug,
                Team.id != team_id,
            )
            .first()
        )

        if existing_team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team slug already exists",
            )

    if team_data.name is not None:
        team.name = team_data.name

    if team_data.slug is not None:
        team.slug = team_data.slug

    if team_data.description is not None:
        team.description = team_data.description

    if team_data.avatar_url is not None:
        team.avatar_url = team_data.avatar_url

    db.commit()
    db.refresh(team)

    return team


@router.delete(
    "/{team_id}",
)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    db.delete(team)
    db.commit()

    return {
        "message": "Team deleted successfully",
    }


# -------------------------------------------------------------------
# Members
# -------------------------------------------------------------------

@router.get(
    "/{team_id}/members",
    response_model=list[TeamMemberResponse],
)
def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_team_access(
        team_id,
        current_user,
        db,
    )

    return (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id)
        .order_by(TeamMember.created_at.asc())
        .all()
    )


@router.post(
    "/{team_id}/members",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_team_member(
    team_id: int,
    member_data: TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    existing_member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == member_data.user_id,
        )
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team",
        )

    member = TeamMember(
        team_id=team_id,
        user_id=member_data.user_id,
        role=member_data.role,
        can_publish=member_data.can_publish,
        can_approve=member_data.can_approve,
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return member


@router.put(
    "/{team_id}/members/{user_id}",
    response_model=TeamMemberResponse,
)
def update_team_member(
    team_id: int,
    user_id: int,
    member_data: TeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    if member_data.role is not None:
        member.role = member_data.role

    if member_data.can_publish is not None:
        member.can_publish = member_data.can_publish

    if member_data.can_approve is not None:
        member.can_approve = member_data.can_approve

    db.commit()
    db.refresh(member)

    return member


@router.delete(
    "/{team_id}/members/{user_id}",
)
def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    if user_id == team.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The team owner cannot be removed",
        )

    member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    db.delete(member)
    db.commit()

    return {
        "message": "Team member removed successfully",
    }


# -------------------------------------------------------------------
# Invitations
# -------------------------------------------------------------------

@router.post(
    "/{team_id}/invitations",
    response_model=TeamInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_team_invitation(
    team_id: int,
    invitation_data: TeamInvitationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    token = secrets.token_urlsafe(32)

    invitation = TeamInvitation(
        team_id=team_id,
        email=invitation_data.email,
        role=invitation_data.role,
        token=token,
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=7),
    )

    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return invitation


@router.get(
    "/{team_id}/invitations",
    response_model=list[TeamInvitationResponse],
)
def get_team_invitations(
    team_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    return (
        db.query(TeamInvitation)
        .filter(TeamInvitation.team_id == team_id)
        .order_by(TeamInvitation.created_at.desc())
        .all()
    )


@router.delete(
    "/{team_id}/invitations/{invitation_id}",
)
def delete_team_invitation(
    team_id: int,
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = get_team_or_404(team_id, db)

    require_team_owner(
        team,
        current_user,
    )

    invitation = (
        db.query(TeamInvitation)
        .filter(
            TeamInvitation.id == invitation_id,
            TeamInvitation.team_id == team_id,
        )
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team invitation not found",
        )

    db.delete(invitation)
    db.commit()

    return {
        "message": "Team invitation deleted successfully",
    }