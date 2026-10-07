#!/bin/sh
set -eu
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  python -m alembic upgrade head
fi
exec gunicorn main:app --worker-class uvicorn_worker.UvicornWorker --workers "${WEB_CONCURRENCY:-2}" --bind "0.0.0.0:${PORT:-8000}" --error-logfile -
