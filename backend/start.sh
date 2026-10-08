#!/usr/bin/env bash
set -e
alembic upgrade head
celery -A celery_app:celery_app worker --beat --concurrency=1 -s /tmp/celerybeat-schedule --loglevel=info &
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
