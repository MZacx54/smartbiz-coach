web: python backend/manage.py migrate --noinput ; gunicorn --chdir backend smartbiz_backend.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers 2 --threads 4 --timeout 120
