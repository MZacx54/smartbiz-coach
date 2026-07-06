import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbiz_backend.settings')
try:
    django.setup()
    from django.db import connection
    print("Testing database connection...")
    connection.ensure_connection()
    print("Success: Database is connected!")
    
    # Check tables
    from django.contrib.auth import get_user_model
    User = get_user_model()
    print("Database has users table. User count:", User.objects.count())
except Exception as e:
    print("Database connection error:", e)
