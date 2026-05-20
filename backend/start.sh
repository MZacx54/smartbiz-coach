#!/bin/bash

echo "--- SmartBiz Coach Container Starting ---"
echo "Check: Working directory is $(pwd)"
echo "Check: STATIC_ROOT exists: $(ls -d staticfiles 2>/dev/null || echo 'No')"

# Step 1: Database Migrations
echo "Checking database connection and running migrations..."
if python manage.py migrate --noinput; then
    echo "Database migrations completed successfully!"
else
    echo "WARNING: Database migrations failed! Continuing server startup..."
fi

# Step 2: Seeding Default Admin
echo "Checking if default superuser needs to be created..."
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbiz_backend.settings')
try:
    django.setup()
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Check if any superuser exists
    if not User.objects.filter(is_superuser=True).exists():
        username = 'admin'
        email = 'admin@smartbizcoach.com.ng'
        password = 'SmartBizAdmin2026!'
        
        # Avoid conflict if 'admin' username or email exists but is not superuser
        User.objects.filter(username=username).delete()
        User.objects.filter(email=email).delete()
        
        User.objects.create_superuser(username, email, password)
        print('SUCCESS: Default superuser admin created successfully!')
    else:
        print('INFO: Superuser already exists.')
except Exception as e:
    print(f'WARNING: Failed to check/create superuser: {e}')
"

# Step 3: Start Server
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
