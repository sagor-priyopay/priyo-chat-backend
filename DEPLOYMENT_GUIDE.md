# Free Hosting Deployment Guide

## 🚀 Recommended Free Hosting Options

### 1. **Railway** (Recommended)
- **Backend**: Full Node.js support with PostgreSQL
- **Free Tier**: 500 hours/month, $5 credit monthly
- **WebSocket**: Full support
- **Database**: Free PostgreSQL included

### 2. **Render**
- **Backend**: Node.js support with PostgreSQL
- **Free Tier**: 750 hours/month (sleeps after 15min inactivity)
- **Database**: Free PostgreSQL (90 days)

### 3. **Vercel + PlanetScale**
- **Frontend**: Static files and serverless functions
- **Database**: PlanetScale MySQL (free tier)
- **Limitation**: WebSocket requires upgrade

## 🎯 Railway Deployment (Best Option)

### Step 1: Prepare for Deployment

1. **Create production environment file**:
```bash
cp .env.example .env.production
```

2. **Update environment variables**:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@host:port/database
JWT_ACCESS_SECRET=your-super-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
CORS_ORIGIN=https://your-domain.railway.app
N8N_WEBHOOK_URL=https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat
```

### Step 2: Create Railway Project

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Connect GitHub**: Link your GitHub account
3. **Deploy from repo**: Select your priyo-chat repository
4. **Add PostgreSQL**: Click "Add Service" → "Database" → "PostgreSQL"

### Step 3: Configure Environment Variables

In Railway dashboard, go to your service → Variables tab:

```
NODE_ENV=production
JWT_ACCESS_SECRET=generate-a-strong-secret-key
JWT_REFRESH_SECRET=generate-another-strong-secret-key
CORS_ORIGIN=https://your-app-name.railway.app
N8N_WEBHOOK_URL=https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat
```

Railway will automatically set `DATABASE_URL` from PostgreSQL service.

### Step 4: Deploy

Railway automatically deploys on git push. Your app will be available at:
`https://your-app-name.railway.app`

## 🔧 Alternative: Render Deployment

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Connect your GitHub account

### Step 2: Create Web Service
1. **New** → **Web Service**
2. **Connect repository**: Select priyo-chat
3. **Settings**:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 3: Add PostgreSQL Database
1. **New** → **PostgreSQL**
2. Copy the database URL

### Step 4: Environment Variables
Add in Render dashboard:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
CORS_ORIGIN=https://your-app.onrender.com
N8N_WEBHOOK_URL=https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat
```

## 📦 GitHub Setup

### Step 1: Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Priyo Chat with n8n AI integration"
```

### Step 2: Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Create new repository: `priyo-chat`
3. **Don't** initialize with README (we already have files)

### Step 3: Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/priyo-chat.git
git branch -M main
git push -u origin main
```

## 🔄 Update n8n Webhook URL

After deployment, update your n8n HTTP Request node URL from:
```
https://53085ccdb80d.ngrok-free.app/api/ai-agent/webhook
```

To your production URL:
```
https://your-app-name.railway.app/api/ai-agent/webhook
```

## ✅ Post-Deployment Checklist

- [ ] App loads at production URL
- [ ] Database connection working
- [ ] Widget authentication working
- [ ] WebSocket connection established
- [ ] n8n webhook updated to production URL
- [ ] AI responses flowing through chat
- [ ] Widget test page accessible

## 🎯 Quick Start Commands

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Test production endpoints
curl https://your-app.railway.app/health
curl https://your-app.railway.app/api/ai-agent/health

# 3. Test widget
# Visit: https://your-app.railway.app/widget/test.html
```

## 💡 Pro Tips

1. **Railway** is recommended for full-stack apps with WebSocket
2. **Environment secrets** - Use strong, unique keys for JWT secrets
3. **Database migrations** - Prisma will auto-migrate on deploy
4. **Monitoring** - Check Railway/Render logs for issues
5. **Custom domain** - Both platforms support custom domains (free)

Your chat system will be live and accessible worldwide! 🌍
