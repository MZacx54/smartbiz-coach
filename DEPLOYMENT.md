# SmartBiz Coach - Deployment Guide

This guide details how to deploy the SmartBiz Coach platform using **Vercel (Frontend)**, **Render (Backend)**, **Supabase (PostgreSQL Database)**, and **GitHub (Version Control & CI/CD)**.

---

## 🛠️ Infrastructure Overview

```mermaid
graph TD
    User([User's Browser]) -->|UI / Static Asset requests| Vercel[Vercel Frontend]
    User -->|API / Data requests| Render[Render Web Service]
    Render -->|PostgreSQL connection| Supabase[Supabase Database]
    GitHub[GitHub Repo] -->|Auto-deploy on Push| Vercel
    GitHub -->|Auto-deploy on Push| Render
```

---

## 📁 Prerequisites

Before deploying, ensure you have:
1. A **GitHub** account and your code pushed to a repository.
2. A **Supabase** account (Free tier is perfect).
3. A **Render** account (Free or Starter tier web service).
4. A **Vercel** account (Free Hobby tier).
5. A **Google Gemini API Key** (for business plans and brand helper generation).
6. A **Termii API Key** (optional, for SMS broadcasting functionality).

---

## 🚀 Step 1: Database Setup (Supabase)

1. Sign in to [Supabase](https://supabase.com/).
2. Create a **New Project**.
3. Name your project (e.g. `smartbiz-db`) and set a strong database password.
4. Once the database is provisioned:
   - Go to **Project Settings** → **Database**.
   - Copy the **Connection String** under **URI** (looks like `postgres://postgres.xxxx:[PASSWORD]@xxxx.supabase.co:5432/postgres`).
   - Replace `[PASSWORD]` with your actual database password.
   - Keep this connection string safe — you will need it for Render.

---

## 🚀 Step 2: Backend Deployment (Render)

Render uses the `render.yaml` file in the root of the repository to deploy automatically.

### Option A: One-Click Web Service Setup (Recommended)
1. Sign in to [Render](https://render.com/).
2. Click **New** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will read the `render.yaml` file and prompt you to fill in variables:
   - **DATABASE_URL**: Paste your **Supabase Connection URI** here.
   - **GEMINI_API_KEY**: Paste your Google Gemini API key.
   - **TERMII_API_KEY**: Paste your Termii API key (or leave empty if you aren't using SMS).
5. Click **Approve**. Render will automatically provision the service, install dependencies, run migrations, and spin up the backend!

### Option B: Manual Web Service Setup
1. Click **New** → **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `smartbiz-backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput && python backend/manage.py migrate`
   - **Start Command**: `gunicorn --chdir backend smartbiz_backend.wsgi`
4. Go to the **Environment** tab and add the following variables:
   - `DEBUG` = `False`
   - `DATABASE_URL` = `(Your Supabase Connection URI)`
   - `GEMINI_API_KEY` = `(Your Gemini Key)`
   - `TERMII_API_KEY` = `(Your Termii Key)`
   - `ALLOWED_HOSTS` = `*`
   - `CORS_ALLOWED_ORIGINS` = `*` (or your Vercel URL once created)
   - `SECRET_KEY` = `(Create a long random string of characters)`
5. Click **Deploy Web Service**.

---

## 🚀 Step 3: Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Configure the Vite setup:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In the **Environment Variables** section, add:
   - `VITE_API_URL` = `(Your Render backend URL, e.g., https://smartbiz-backend.onrender.com/api/)`
   - *Note: Ensure it ends with `/api/` and matches your Render URL.*
6. Click **Deploy**. Vercel will build the frontend and provide a public `.vercel.app` URL.

---

## 🔄 Step 4: Configure CORS (Security)

Once your frontend is live on Vercel, secure your backend by restricting API requests to only come from your frontend:
1. Go to your **Render** dashboard → **Environment**.
2. Update `CORS_ALLOWED_ORIGINS` to your Vercel production URL (e.g. `https://smartbiz-coach.vercel.app`).
3. Save changes. Render will automatically redeploy.

---

## 🛡️ Administrative Tasks (Creating an Admin Account)

To make yourself an admin so you bypass all contact and batch limits:
1. Register a normal account on the frontend using your email: **`meshachzax@gmail.com`**.
2. Because this email is hardcoded as the owner/admin, the system automatically gives this account:
   - Unlimited contact uploads.
   - Unlimited campaigns.
   - 500 contacts per daily WhatsApp batch queue.
   - Free automated SMS (no credits deducted).

---

## 📈 Pricing & Monetization Model (Fixed)

The backend now accurately reflects the credit allocation visible on the landing page:

| Package | Cost | Credits Credited | Cost/Credit | User SMS Cost (2 credits) | Termii Cost | Your Net Margin |
|---|---|---|---|---|---|---|
| **Starter** | ₦300 | **30 Credits** | ₦10.00 | ₦20.00 | ~₦4.00 | **₦16.00 (400%)** |
| **Grower** | ₦1,000 | **120 Credits** | ₦8.33 | ₦16.67 | ~₦4.00 | **₦12.67 (317%)** |
| **Pro** | ₦3,000 | **400 Credits** | ₦7.50 | ₦15.00 | ~₦4.00 | **₦11.00 (275%)** |

Free plan accounts are limited to:
- Maximum **500 contacts** (uploads are cut off past 500).
- Maximum **20 WhatsApp batch limit** per day.
- Automated SMS tab is **locked** with an upgrade screen prompting them to top up credits.
