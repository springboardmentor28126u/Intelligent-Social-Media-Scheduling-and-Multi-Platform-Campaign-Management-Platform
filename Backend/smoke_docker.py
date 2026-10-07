"""Disposable Compose database smoke checks; never authorizes a real account."""
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from database import DATABASE_URL, SessionLocal
from models import SocialAccount, SocialCredential, Post, PublishingJob


def main():
    if DATABASE_URL.host != 'postgres':
        raise SystemExit('Smoke test is restricted to the local Compose postgres service')
    token = None
    def call(method, path, body=None, binary=False):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        request = Request('http://frontend:8080/api' + path,
                          data=json.dumps(body).encode() if body is not None else None,
                          headers=headers, method=method)
        with urlopen(request, timeout=15) as response:
            data = response.read()
            return data if binary else json.loads(data)
    with urlopen('http://frontend:8080/a-spa-route', timeout=15) as page:
        assert b'<html' in page.read()
    email = 'smoke-' + uuid.uuid4().hex + '@example.com'
    password = secrets.token_urlsafe(24)
    user = call('POST', '/register', {'name': 'Disposable smoke user', 'email': email, 'password': password})
    token = call('POST', '/login', {'email': email, 'password': password})['access_token']
    post = call('POST', '/posts', {'title': 'Docker smoke', 'content': 'Synthetic content; never publish.'})
    with SessionLocal() as db:
        db.get(Post, post['id']).is_demo = True
        account = SocialAccount(user_id=user['id'], platform='facebook', account_name='SMOKE ONLY', connected=True, is_demo=True)
        db.add(account); db.flush()
        db.add(SocialCredential(user_id=user['id'], account_id=account.id, provider='facebook', external_id=uuid.uuid4().hex, encrypted_token='not-a-real-token'))
        db.commit()
        account_id = account.id
    try:
        jobs = call('POST', f"/posts/{post['id']}/schedule", {'account_ids': [account_id],
                    'scheduled_at': (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()})
        assert jobs and jobs[0]['status'] == 'scheduled'
        assert call('GET', '/reports/export/campaigns?format=pdf', binary=True).startswith(b'%PDF')
        assert call('GET', '/reports/export/campaigns?format=xlsx', binary=True).startswith(b'PK')
    finally:
        with SessionLocal() as db:
            for job in db.query(PublishingJob).filter_by(post_id=post['id']).all():
                job.status = 'cancelled'
            db.commit()
    print('PASS: SPA fallback, register/login, post, schedule, PDF and XLSX. Synthetic records retained; jobs cancelled.')


if __name__ == '__main__':
    main()
