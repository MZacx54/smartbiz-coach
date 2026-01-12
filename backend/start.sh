#!/bin/bash
set -e

echo "--- Starting SmartBiz Coach Backend ---"

# Step 1: Database Migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Step 2: Static Files
echo "Collecting static files (including frontend if built)..."
python manage.py collectstatic --noinput --clear || echo "Static collection failed, proceeding..."

# Step 3: Start Server
PORT=${PORT:-8000}
echo "Starting Gunicorn on port $PORT..."
exec gunicorn smartbiz_backend.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --threads 2 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
