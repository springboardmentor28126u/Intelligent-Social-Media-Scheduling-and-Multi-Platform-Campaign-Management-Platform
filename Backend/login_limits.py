"""Database-backed fixed-window login limits shared by all web processes."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from models import LoginBucket


def check_login_limit(db, ip, email):
    _check_limit(db, ip, email, '', 900, 30, 10,
                 'Too many sign-in attempts. Try again in 15 minutes.')


def check_register_limit(db, ip, email):
    _check_limit(db, ip, email, 'register:', 3600, 5, 3,
                 'Too many registration attempts. Try again in an hour.')


def _check_limit(db, ip, email, namespace, window, ip_limit, email_limit, message):
    now = datetime.now(timezone.utc)
    blocked = False
    # Bound retained storage. No raw email or IP address is retained.
    db.query(LoginBucket).filter(LoginBucket.started_at < now - timedelta(days=1)).delete()
    for value, limit in [(namespace + 'ip:' + ip, ip_limit), (namespace + 'email:' + email.lower(), email_limit)]:
        key = hmac.new(os.environ['JWT_SECRET_KEY'].encode(), value.encode(), hashlib.sha256).hexdigest()
        row = db.query(LoginBucket).filter_by(key=key).with_for_update().first()
        if row is None:
            try:
                with db.begin_nested():
                    db.add(LoginBucket(key=key, started_at=now, attempts=0))
                    db.flush()
            except IntegrityError:
                pass
            row = db.query(LoginBucket).filter_by(key=key).with_for_update().one()
        start = row.started_at.replace(tzinfo=timezone.utc) if row.started_at.tzinfo is None else row.started_at
        if (now - start).total_seconds() >= window:
            row.started_at, row.attempts = now, 0
        row.attempts += 1
        blocked |= row.attempts > limit
    db.commit()
    if blocked:
        raise HTTPException(429, message, headers={'Retry-After': str(window)})
