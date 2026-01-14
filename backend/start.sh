#!/bin/bash
set -e

echo "--- SmartBiz Coach Container Starting ---"
echo "Check: Working directory is $(pwd)"
echo "Check: STATIC_ROOT exists: $(ls -d staticfiles 2>/dev/null || echo 'No')"

# Step 1: Database Migrations
echo "Checking database connection and running migrations..."
python manage.py migrate --noinput

# Step 2: Start Server
PORT=${PORT:-8000}
echo "--- Starting Gunicorn ---"
echo "Binding to 0.0.0.0:$PORT"
echo "Timeout is 120s"

# Using 1 worker and 4 threads to reduce memory pressure during debug
exec gunicorn smartbiz_backend.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 1 \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level debug \
    --capture-output \
    --enable-stdio-inheritance
