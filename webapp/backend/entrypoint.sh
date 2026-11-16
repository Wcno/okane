#!/bin/sh
# Apply migrations before serving, so a request never meets an old schema.
set -e

python manage.py migrate --noinput
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --access-logfile -
