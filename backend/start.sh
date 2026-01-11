#!/bin/bash
set -e
echo "Starting deployment script..."
echo "Running migrations..."
python manage.py migrate
echo "Collecting static files..."
python manage.py collectstatic --noinput
echo "Starting Gunicorn..."
gunicorn smartbiz_backend.wsgi:application --bind 0.0.0.0:$PORT --log-file -
