"""Shared SQL visibility policy for API content, metrics and recipient delivery.

Request dependencies install a scope and remove it in finally. Service workers
have no request scope; notification delivery explicitly checks each recipient.
Core subqueries keep this policy independent of caller ORM query structure.
"""
from sqlalchemy import select, or_, and_, exists
from models import Campaign, CampaignAssignment, Workspace, Membership, User, Post, PublishingJob, EngagementSnapshot, EngagementWorkflow


def campaign_ids(actor):
    c, a, w, m, u = [model.__table__ for model in (Campaign, CampaignAssignment, Workspace, Membership, User)]
    assigned = exists(select(1).where(a.c.campaign_id == c.c.id, a.c.user_id == actor).correlate(c))
    ownership = or_(c.c.creator_id == actor, assigned)
    member_access = exists(select(1).select_from(w.join(m, m.c.workspace_id == w.c.id)).where(
        w.c.storage_user_id == c.c.user_id, m.c.user_id == actor, m.c.status == 'active',
        or_(c.c.shared_with_team.is_(True), and_(m.c.role != 'business_user',
            or_(w.c.owner_id == actor, m.c.is_admin.is_(True), m.c.role == 'administrator', ownership)))))
    personal_access = exists(select(1).where(u.c.id == actor, u.c.is_workspace.is_(False),
        c.c.user_id == actor, or_(u.c.role != 'business_user', c.c.shared_with_team.is_(True))))
    return select(c.c.id).where(or_(member_access, personal_access))


def post_ids(actor):
    p = Post.__table__
    return select(p.c.id).where(or_(p.c.campaign_id.is_(None), p.c.campaign_id.in_(campaign_ids(actor))))


def job_ids(actor):
    j = PublishingJob.__table__
    return select(j.c.id).where(j.c.post_id.in_(post_ids(actor)))


def scoped_query(db, model, *entities):
    query = db.query(model, *entities)
    scope = db.info.get('content_scope')
    if scope is None:
        return query
    actor = int(scope.get('actor_sub', scope['sub']))
    if model is Campaign:
        return query.filter(Campaign.id.in_(campaign_ids(actor)))
    if model is Post:
        return query.filter(Post.id.in_(post_ids(actor)))
    if model is PublishingJob:
        return query.filter(PublishingJob.id.in_(job_ids(actor)))
    if model in {EngagementSnapshot, EngagementWorkflow}:
        return query.filter(model.job_id.in_(job_ids(actor)))
    raise ValueError('Missing visibility policy')


def can_view_campaign(db, actor, campaign_id):
    return db.execute(select(Campaign.__table__.c.id).where(
        Campaign.__table__.c.id == campaign_id, Campaign.__table__.c.id.in_(campaign_ids(actor)))).first() is not None
