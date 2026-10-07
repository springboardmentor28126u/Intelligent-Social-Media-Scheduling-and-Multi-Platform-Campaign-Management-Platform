"""Database-backed fixed-window login limits shared by all web processes."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from models import LoginBucket


def check_login_limit(db, ip, email):
    now = datetime.now(timezone.utc)
    window = 900
    blocked = False
    # Bound retained storage. No raw email or IP address is retained.
    db.query(LoginBucket).filter(LoginBucket.started_at < now - timedelta(days=1)).delete()
    for value, limit in [('ip:' + ip, 30), ('email:' + email.lower(), 10)]:
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
        raise HTTPException(429, 'Too many sign-in attempts. Try again in 15 minutes.', headers={'Retry-After': str(window)})
