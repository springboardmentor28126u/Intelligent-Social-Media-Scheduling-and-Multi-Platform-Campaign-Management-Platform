"""Persistent inbox and opt-in SMTP / Web Push outbox.

Network delivery runs only in notification_worker.py, never inside API requests.
"""
import hashlib
import json
import os
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, and_, select
from visibility import campaign_ids, post_ids, can_view_campaign
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import (Notification, NotificationPreference, NotificationDelivery, PushSubscription,
                    Workspace, Membership, User, PublishingJob, Post, Campaign, SocialCredential)


def notify_user(db, user_id, category, title, body="", workspace_id=None, post_id=None, key=None, campaign_id=None):
    if campaign_id is None and post_id is not None:
        campaign_id = db.execute(select(Post.__table__.c.campaign_id).where(Post.__table__.c.id == post_id)).scalar()
    if campaign_id is not None and not can_view_campaign(db, user_id, campaign_id):
        return
    key = key or secrets.token_hex(20)
    if db.query(Notification).filter_by(user_id=user_id, event_key=key).first():
        return
    # A savepoint makes periodic scans safe against concurrent API events/workers.
    from sqlalchemy.exc import IntegrityError
    try:
        with db.begin_nested():
            item = Notification(user_id=user_id, workspace_id=workspace_id, event_key=key, category=category,
                                title=title[:250], body=body, post_id=post_id, campaign_id=campaign_id)
            db.add(item)
            db.flush()
            pref = db.get(NotificationPreference, user_id)
            if pref and pref.email:
                db.add(NotificationDelivery(notification_id=item.id, channel="email", target_id=0))
            if pref and pref.push:
                for subscription in db.query(PushSubscription).filter_by(user_id=user_id).all():
                    db.add(NotificationDelivery(notification_id=item.id, channel="push", target_id=subscription.id))
    except IntegrityError:
        return


def notify_scope(db, owner_id, category, title, body="", post_id=None, key=None, reviewers=False, roles=None, campaign_id=None):
    workspace = db.query(Workspace).filter_by(storage_user_id=owner_id).first()
    if workspace:
        query = db.query(Membership).filter_by(workspace_id=workspace.id, status="active")
        if reviewers:
            query = query.filter(Membership.role.in_(["content_creator", "marketing_manager"]))
        if roles:
            query = query.filter(Membership.role.in_(roles))
        users = [m.user_id for m in query.all()]
    else:
        users = [owner_id]
    for user_id in users:
        notify_user(db, user_id, category, title, body, workspace.id if workspace else None, post_id, key, campaign_id)


def visible_query(db, actor):
    accessible = db.query(Membership.workspace_id).filter_by(user_id=actor)
    return db.query(Notification).filter(Notification.user_id == actor, or_(
        Notification.workspace_id.is_(None), Notification.workspace_id.in_(accessible)),
        or_(Notification.campaign_id.is_(None), Notification.campaign_id.in_(campaign_ids(actor))),
        or_(Notification.post_id.is_(None), Notification.post_id.in_(post_ids(actor))),
        # Unscoped old campaign alerts fail closed if the campaign no longer exists.
        or_(Notification.category != "campaign", Notification.campaign_id.is_not(None)))


def scan_events(db):
    now = datetime.now(timezone.utc)
    jobs = db.query(PublishingJob).join(Post).filter(Post.is_demo.is_(False),
        PublishingJob.status.in_(["scheduled", "retry"]), PublishingJob.scheduled_at > now,
        PublishingJob.scheduled_at <= now + timedelta(hours=24)).all()
    for job in jobs:
        notify_scope(db, job.user_id, "reminder", "Scheduled post coming up",
                     f"{job.provider}: {job.scheduled_at.isoformat()}", job.post_id,
                     f"reminder:{job.id}:{job.scheduled_at.isoformat()}")
    for campaign in db.query(Campaign).filter_by(status="active", is_demo=False).all():
        from campaigns import rollup
        summary = rollup(db, campaign.user_id, [campaign])[campaign.id]
        for alert in summary["alerts"]:
            fingerprint = hashlib.sha256(alert["message"].encode()).hexdigest()[:20]
            notify_scope(db, campaign.user_id, "campaign", f"Campaign alert: {campaign.name}",
                         alert["message"], campaign_id=campaign.id, key=f"campaign:{campaign.id}:{now.date()}:{fingerprint}")
    for credential in db.query(SocialCredential).filter(SocialCredential.expires_at.is_not(None),
            SocialCredential.expires_at < int((now + timedelta(days=3)).timestamp())).all():
        notify_scope(db, credential.user_id, "account", f"Check your {credential.provider} connection",
                     "The saved authorization is expiring or expired. Refresh or reconnect the account if needed.",
                     key=f"token-expiry:{credential.id}:{credential.expires_at}")
    db.commit()


def email_ready():
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def push_ready():
    return all(os.getenv(k) for k in ("VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY", "VAPID_SUBJECT"))


def send_email(user, item):
    if not email_ready():
        raise RuntimeError("Email delivery is not configured")
    message = EmailMessage()
    message["From"], message["To"] = os.environ["SMTP_FROM"], user.email
    message["Subject"] = "SocialPilot: " + item.title.replace("\n", " ").replace("\r", " ")
    message["Message-ID"] = f"<socialpilot-{item.id}@{os.environ['SMTP_FROM'].split('@')[-1]}>"
    message.set_content(item.body + "\n\nOpen SocialPilot to view this update.")
    port = int(os.getenv("SMTP_PORT", "587"))
    implicit = os.getenv("SMTP_SSL", "false").lower() == "true"
    cls = smtplib.SMTP_SSL if implicit else smtplib.SMTP
    with cls(os.environ["SMTP_HOST"], port, timeout=15, **({"context": ssl.create_default_context()} if implicit else {})) as smtp:
        if not implicit:
            smtp.starttls(context=ssl.create_default_context())
        if os.getenv("SMTP_USER"):
            smtp.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASSWORD", ""))
        smtp.send_message(message)


def validate_endpoint(endpoint):
    parsed = urlparse(endpoint)
    host = (parsed.hostname or "").lower()
    allowed = host in {"fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"} or host.endswith(".notify.windows.com")
    if parsed.scheme != "https" or not allowed or parsed.username or parsed.password or parsed.port not in (None, 443) or parsed.fragment:
        raise HTTPException(422, "Unsupported browser push endpoint")


def send_push(subscription, item):
    if not push_ready():
        raise RuntimeError("Push delivery is not configured")
    validate_endpoint(subscription.endpoint)
    from pywebpush import webpush
    webpush(subscription_info={"endpoint": subscription.endpoint, "keys": json.loads(subscription.keys_json)},
            data=json.dumps({"title": "SocialPilot update", "body": "Open your notification inbox to view the update.", "id": item.id}),
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"], vapid_claims={"sub": os.environ["VAPID_SUBJECT"]}, timeout=15)


def deliver_batch(session_factory=SessionLocal, email_sender=send_email, push_sender=send_push, limit=50):
    count = 0
    for _ in range(limit):
        with session_factory() as db:
            delivery = db.query(NotificationDelivery).filter(NotificationDelivery.status.in_(["pending", "retry"]),
                NotificationDelivery.next_attempt <= datetime.now(timezone.utc)).order_by(NotificationDelivery.id).with_for_update(skip_locked=True).first()
            if delivery is None:
                break
            item = db.get(Notification, delivery.notification_id)
            pref = db.get(NotificationPreference, item.user_id)
            # Recheck preferences and membership immediately before external delivery.
            permitted = visible_query(db, item.user_id).filter(Notification.id == item.id).first() is not None
            subscription = db.get(PushSubscription, delivery.target_id) if delivery.channel == "push" else None
            if not permitted or pref is None or not getattr(pref, delivery.channel) or (delivery.channel == "push" and (subscription is None or subscription.user_id != item.user_id)):
                delivery.status = "cancelled"
                db.commit()
                continue
            if not (email_ready() if delivery.channel == "email" else push_ready()):
                delivery.error = "Delivery provider is not configured"
                delivery.next_attempt = datetime.now(timezone.utc) + timedelta(minutes=10)
                db.commit()
                continue
            delivery.attempts += 1
            delivery.status = "sending"
            # A crashed/ambiguous send is left for manual review, not auto-resent.
            db.commit()
            try:
                if delivery.channel == "email":
                    email_sender(db.get(User, item.user_id), item)
                else:
                    push_sender(subscription, item)
                delivery.status, delivery.error = "sent", None
            except Exception as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                if delivery.channel == "push" and status_code in (404, 410):
                    db.delete(subscription)
                    delivery.status, delivery.error = "failed", "Browser subscription expired; enable push again"
                else:
                    # Do not repeat a send whose acknowledgement may have been lost.
                    delivery.status, delivery.error = "failed", "Delivery failed; check notification provider settings"
            db.commit()
            count += 1
    return count


class Preferences(BaseModel):
    email: bool = False
    push: bool = False


class SubscriptionInput(BaseModel):
    endpoint: str = Field(max_length=4096)
    keys: dict[str, str]


def make_router(verify_token):
    router = APIRouter(prefix="/notifications", tags=["Notifications"])

    @router.get("")
    def inbox(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), unread: bool = False,
              payload=Depends(verify_token), db: Session = Depends(get_db)):
        query = visible_query(db, int(payload["sub"]))
        if unread:
            query = query.filter(Notification.read.is_(False))
        return [{"id": n.id, "workspace_id": n.workspace_id, "category": n.category, "title": n.title,
                 "body": n.body, "post_id": n.post_id, "read": n.read,
                 "created_at": n.created_at.replace(tzinfo=timezone.utc) if n.created_at.tzinfo is None else n.created_at}
                for n in query.order_by(Notification.id.desc()).offset(offset).limit(limit).all()]

    @router.post("/read-all")
    def read_all(payload=Depends(verify_token), db: Session = Depends(get_db)):
        visible_query(db, int(payload["sub"])).update({"read": True}, synchronize_session=False)
        db.commit()
        return {"message": "All notifications marked read"}

    @router.post("/{notification_id}/read")
    def mark_read(notification_id: int, payload=Depends(verify_token), db: Session = Depends(get_db)):
        item = visible_query(db, int(payload["sub"])).filter(Notification.id == notification_id).first()
        if item is None:
            raise HTTPException(404, "Notification not found")
        item.read = True
        db.commit()
        return {"message": "Notification marked read"}

    @router.get("/preferences")
    def preferences(payload=Depends(verify_token), db: Session = Depends(get_db)):
        pref = db.get(NotificationPreference, int(payload["sub"]))
        return {"email": bool(pref and pref.email), "push": bool(pref and pref.push),
                "email_configured": email_ready(), "push_configured": push_ready(),
                "vapid_public_key": os.getenv("VAPID_PUBLIC_KEY", "") if push_ready() else ""}

    @router.put("/preferences")
    def save_preferences(data: Preferences, payload=Depends(verify_token), db: Session = Depends(get_db)):
        actor = int(payload["sub"])
        pref = db.get(NotificationPreference, actor)
        if pref is None:
            pref = NotificationPreference(user_id=actor)
            db.add(pref)
        pref.email, pref.push = data.email, data.push
        db.commit()
        return preferences(payload, db)

    @router.post("/subscriptions", status_code=201)
    def subscribe(data: SubscriptionInput, payload=Depends(verify_token), db: Session = Depends(get_db)):
        validate_endpoint(data.endpoint)
        import base64
        try:
            decode = lambda value: base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
            if set(data.keys) != {"p256dh", "auth"} or len(decode(data.keys["p256dh"])) != 65 or len(decode(data.keys["auth"])) != 16:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(422, "Invalid browser push keys") from None
        actor = int(payload["sub"])
        digest = hashlib.sha256(data.endpoint.encode()).hexdigest()
        subscription = db.query(PushSubscription).filter_by(endpoint_hash=digest).first()
        if subscription and subscription.user_id != actor:
            raise HTTPException(409, "This browser is registered to another account; disable its subscription first")
        if subscription is None:
            if db.query(PushSubscription).filter_by(user_id=actor).count() >= 10:
                raise HTTPException(409, "Browser subscription limit reached")
            subscription = PushSubscription(user_id=actor, endpoint=data.endpoint, endpoint_hash=digest)
            db.add(subscription)
        subscription.keys_json = json.dumps(data.keys)
        db.commit()
        return {"id": subscription.id}

    @router.delete("/subscriptions")
    def unsubscribe(payload=Depends(verify_token), db: Session = Depends(get_db)):
        db.query(PushSubscription).filter_by(user_id=int(payload["sub"])).delete()
        db.commit()
        return {"message": "Browser subscriptions removed"}

    @router.get("/deliveries")
    def deliveries(payload=Depends(verify_token), db: Session = Depends(get_db)):
        ids = visible_query(db, int(payload["sub"])).with_entities(Notification.id)
        rows = db.query(NotificationDelivery).filter(NotificationDelivery.notification_id.in_(ids)).order_by(NotificationDelivery.id.desc()).limit(50).all()
        return [{"id": d.id, "channel": d.channel, "status": d.status, "error": d.error} for d in rows]

    return router
