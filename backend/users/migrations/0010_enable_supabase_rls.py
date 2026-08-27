from django.db import migrations

def enable_rls_on_postgres(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("""
            DO $do$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
                END LOOP;
            END $do$;

            DO $do$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
                    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
                    REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
                END IF;
            END $do$;
            """)

def reverse_rls(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_agenthirerequest_amount_paid_and_more'),
    ]

    operations = [
        migrations.RunPython(enable_rls_on_postgres, reverse_rls),
    ]
