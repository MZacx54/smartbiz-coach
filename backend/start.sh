#!/bin/bash
set -e

echo "========================================="
echo "  SmartBiz Coach - Container Starting"
echo "========================================="
echo "Python version: $(python --version)"
echo "Working directory: $(pwd)"
echo "PORT env: ${PORT:-'not set, defaulting to 8000'}"
echo "DEBUG env: ${DEBUG:-'not set'}"
echo "DATABASE_URL set: $(if [ -n "$DATABASE_URL" ]; then echo 'YES'; else echo 'NO'; fi)"

# Step 1: Run database migrations
echo ""
echo "--- Step 1: Running Database Migrations ---"
python manage.py migrate --noinput 2>&1 || echo "WARNING: Migrations failed, continuing..."
echo "--- Migrations step complete ---"

# Step 2: Collect static files (in case they weren't collected during build)
echo ""
echo "--- Step 2: Collecting Static Files ---"
python manage.py collectstatic --noinput 2>&1 || echo "WARNING: collectstatic failed, continuing..."
echo "--- Static files step complete ---"

# Step 3: Start Gunicorn
PORT=${PORT:-8000}
echo ""
echo "========================================="
echo "  Starting Gunicorn on 0.0.0.0:$PORT"
echo "========================================="

exec gunicorn smartbiz_backend.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 1 \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output \
    --enable-stdio-inheritance
