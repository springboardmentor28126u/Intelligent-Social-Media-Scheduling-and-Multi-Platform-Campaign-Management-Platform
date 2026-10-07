"""Create an idempotent, non-publishing team demo. Password is supplied privately."""
import os
from datetime import datetime, timezone
from pwdlib import PasswordHash
from models import User, Workspace, Membership, Post, ApprovalEvent, Campaign, CampaignAssignment


def seed(db, password):
    if len(password) < 12:
        raise ValueError("DEMO_PASSWORD must contain at least 12 characters")
    identities = [('admin', 'administrator'), ('creator', 'content_creator'), ('manager', 'marketing_manager')]
    users = []
    for name, role in identities:
        email = f'demo-{name}@example.com'
        user = db.query(User).filter_by(email=email).first()
        if not user:
            user = User(name=f'Demo {name.title()}', email=email, role=role,
                        password_hash=PasswordHash.recommended().hash(password))
            db.add(user); db.flush()
        users.append(user)
    existing = db.query(Workspace).filter_by(owner_id=users[0].id, name='SocialPilot Demo Team').first()
    if existing:
        return existing
    principal = User(name='Demo team storage', email='workspace@demo.socialpilot.invalid',
                     password_hash='!no-login', role='content_creator', is_workspace=True)
    db.add(principal); db.flush()
    team = Workspace(name='SocialPilot Demo Team', owner_id=users[0].id, storage_user_id=principal.id, require_approval=True)
    db.add(team); db.flush()
    for user, (_, role) in zip(users, identities):
        db.add(Membership(workspace_id=team.id, user_id=user.id, role=role, is_admin=role == 'administrator', status='active'))
    campaign = Campaign(user_id=principal.id, creator_id=users[2].id, name='Team demo campaign',
                        start_date=datetime.now(timezone.utc).date(), end_date=datetime.now(timezone.utc).date(), is_demo=True)
    db.add(campaign); db.flush()
    db.add(CampaignAssignment(campaign_id=campaign.id, user_id=users[1].id))
    for state in ('draft', 'pending', 'awaiting_creator', 'approved', 'rejected'):
        post = Post(user_id=principal.id, creator_id=users[2].id, creator_role="marketing_manager", campaign_id=campaign.id, title=f'Demo {state} post',
                    content='Demo campaign: welcome to SocialPilot!', status='draft', approval_status=state,
                    revision=1, is_demo=True)
        db.add(post); db.flush()
        actions = [] if state == 'draft' else [('submit', users[2].id)]
        if state in ('awaiting_creator', 'approved', 'rejected'):
            actions.append(('manager_approve', users[2].id))
        if state in ('approved', 'rejected'):
            actions.append(('creator_approve' if state == 'approved' else 'creator_reject', users[1].id))
        for action, actor in actions:
            db.add(ApprovalEvent(post_id=post.id, actor_id=actor, revision=1, action=action,
                                 comment='Demo review: ready to publish.' if action.endswith('approve') else 'Demo review: please revise the copy.',
                                 created_at=datetime.now(timezone.utc)))
    db.commit()
    return team


if __name__ == '__main__':
    if os.getenv('APP_ENV') == 'production':
        raise SystemExit('Demo seed is disabled in production')
    from database import SessionLocal
    with SessionLocal() as db:
        seed(db, os.environ.get('DEMO_PASSWORD', ''))
    print('Demo team is ready. Existing demo passwords were not changed. No accounts connected or posts scheduled.')
