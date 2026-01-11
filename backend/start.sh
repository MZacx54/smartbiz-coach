#!/bin/bash
set -e
echo "Starting deployment script..."
echo "Running migrations..."
python manage.py migrate
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Warning: collectstatic failed, continuing anyway..."
echo "Starting Gunicorn..."
PORT=${PORT:-8000}
gunicorn smartbiz_backend.wsgi:application --bind 0.0.0.0:$PORT --log-file -
