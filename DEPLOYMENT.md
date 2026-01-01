# SmartBiz Coach - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- [ ] Google Gemini API key
- [ ] GitHub repository (for automatic deployments)
- [ ] Custom domain (optional)
- [ ] Payment gateway accounts (Paystack/Flutterwave)

---

## Option 1: Deploy to Vercel (Frontend) + Railway (Backend)

### Frontend (Vercel)

**Step 1: Prepare Repository**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

**Step 2: Deploy on Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Deploy!

**Step 3: Environment Variables** (Optional)
- No frontend environment variables needed (API is backend)

---

### Backend (Railway)

**Step 1: Create Railway Project**
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `backend` directory as root

**Step 2: Add Environment Variables**
In Railway dashboard, add:
```
DEBUG=False
SECRET_KEY=<generate-strong-key-here>
ALLOWED_HOSTS=your-railway-domain.up.railway.app
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
GEMINI_API_KEY=<your-gemini-key>
DATABASE_URL=<automatically-provided-by-railway>
```

**Step 3: Configure Build**
Railway should detect Django automatically, but verify:
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn smartbiz_backend.wsgi`

**Step 4: Add PostgreSQL Database**
1. In Railway project, click "New"
2. Select "PostgreSQL"
3. Railway auto-configures `DATABASE_URL`

**Step 5: Run Migrations**
In Railway terminal:
```bash
python manage.py migrate
python manage.py createsuperuser
```

---

## Option 2: Deploy to Railway (Full Stack)

**Step 1: Create Railway Project** (same as above)

**Step 2: Add Services**
1. Add Django backend service
2. Add PostgreSQL database
3. Add Redis (optional, for caching)

**Step 3: Static Files**
Configure WhiteNoise in `settings.py`:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this
    ...
]

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

Build frontend and serve via Django:
```bash
cd ../  # Go to frontend directory
npm run build
cp -r dist/* backend/staticfiles/
```

---

## Option 3: Traditional VPS (DigitalOcean/AWS)

### Server Setup

**1. Provision Ubuntu Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3-pip python3-venv nginx postgresql postgresql-contrib
sudo apt install nodejs npm
```

**2. Clone Repository**
```bash
cd /var/www
git clone https://github.com/your-username/smartbiz-coach.git
cd smartbiz-coach
```

**3. Backend Setup**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Add your keys
```

**4. Frontend Setup**
```bash
cd ../
npm install
npm run build
```

**5. PostgreSQL Database**
```bash
sudo -u postgres psql
CREATE DATABASE smartbiz;
CREATE USER smartbizuser WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE smartbiz TO smartbizuser;
\q
```

**6. Django Migrations**
```bash
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

**7. Gunicorn Systemd Service**
Create `/etc/systemd/system/smartbiz.service`:
```ini
[Unit]
Description=SmartBiz Coach
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/smartbiz-coach/backend
Environment="PATH=/var/www/smartbiz-coach/backend/venv/bin"
ExecStart=/var/www/smartbiz-coach/backend/venv/bin/gunicorn \
          --workers 3 \
          --bind unix:/run/smartbiz.sock \
          smartbiz_backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl start smartbiz
sudo systemctl enable smartbiz
```

**8. Nginx Configuration**
Create `/etc/nginx/sites-available/smartbiz`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        alias /var/www/smartbiz-coach/backend/staticfiles/;
    }
    
    location /media/ {
        alias /var/www/smartbiz-coach/backend/media/;
    }
    
    location /api/ {
        proxy_pass http://unix:/run/smartbiz.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        root /var/www/smartbiz-coach/dist;
        try_files $uri /index.html;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/smartbiz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**9. SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Post-Deployment Checklist

- [ ] Test signup flow
- [ ] Test brand generation
- [ ] Test content creation
- [ ] Verify CORS settings
- [ ] Check SSL certificate
- [ ] Monitor error logs
- [ ] Set up backups
- [ ] Configure monitoring (Sentry)
- [ ] Test payment integration

---

## Environment Variables Reference

### Backend (.env)
```bash
DEBUG=False
SECRET_KEY=<50-char-random-string>
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
GEMINI_API_KEY=<your-gemini-key>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Generate SECRET_KEY
```python
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

---

## Monitoring & Maintenance

### Check Logs (Railway)
- View in Railway dashboard
- Real-time logs available

### Check Logs (VPS)
```bash
# Django logs
sudo journalctl -u smartbiz -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Backup (PostgreSQL)
```bash
pg_dump smartbiz > backup_$(date +%Y%m%d).sql
```

### Auto Backup Script
Create `/var/backups/smartbiz_backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/smartbiz"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump smartbiz | gzip > $BACKUP_DIR/db_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Schedule with cron:
```bash
0 2 * * * /var/backups/smartbiz_backup.sh
```

---

## Troubleshooting

**Issue: 502 Bad Gateway**
- Check if Gunicorn is running: `sudo systemctl status smartbiz`
- Check socket file exists: `ls -la /run/smartbiz.sock`

**Issue: Static files not loading**
- Run `python manage.py collectstatic`
- Check Nginx static file path

**Issue: CORS errors**
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- Ensure no trailing slashes

**Issue: Database connection failed**
- Check `DATABASE_URL` format
- Verify PostgreSQL is running

---

## Performance Optimization

1. **Enable Compression** (Nginx)
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
```

2. **Enable Caching**
```nginx
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

3. **Use CDN** (Cloudflare)
- Point DNS to Cloudflare
- Enable auto-minification
- Enable Brotli compression

---

## Support

For deployment issues:
- Check Django logs
- Review Nginx/Gunicorn configs
- Verify environment variables
- Test API endpoints manually

Good luck with your deployment! 🚀
