# Free Deployment Guide

## 🚀 Render.com Deployment (Recommended)

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Ensure `.env` is in `.gitignore`
3. Create `render.yaml` (already exists)

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

### Step 3: Deploy Database
1. Create new PostgreSQL database
2. Copy the connection string
3. Note: Free database expires after 90 days

### Step 4: Deploy Web Service
1. Create new Web Service
2. Connect your GitHub repo
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables:

```
NODE_ENV=production
DATABASE_URL=<your-postgres-url>
JWT_ACCESS_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-different-secret>
CORS_ORIGIN=https://your-app-name.onrender.com
PORT=3000
```

### Step 5: Configure Environment
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚂 Railway.app Deployment

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Get $5 free credit monthly

### Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Railway auto-detects Node.js

### Step 3: Add PostgreSQL
1. Click "Add Plugin"
2. Select PostgreSQL
3. Database URL is auto-generated

### Step 4: Set Environment Variables
```
NODE_ENV=production
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
CORS_ORIGIN=https://your-app.up.railway.app
```

### Step 5: Custom Domain (Optional)
1. Go to Settings > Domains
2. Add your custom domain
3. Update CORS_ORIGIN accordingly

---

## ✈️ Fly.io Deployment

### Step 1: Install Fly CLI
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login
```

### Step 2: Initialize Fly App
```bash
# In your project directory
flyctl launch

# Follow the prompts
# Choose app name
# Select region
# Don't deploy yet
```

### Step 3: Add PostgreSQL
```bash
flyctl postgres create
flyctl postgres attach <postgres-app-name>
```

### Step 4: Set Environment Variables
```bash
flyctl secrets set NODE_ENV=production
flyctl secrets set JWT_ACCESS_SECRET=<your-secret>
flyctl secrets set JWT_REFRESH_SECRET=<your-secret>
flyctl secrets set CORS_ORIGIN=https://your-app.fly.dev
```

### Step 5: Deploy
```bash
flyctl deploy
```

---

## 🔧 Configuration for Free Hosting

### Update package.json
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "prisma generate && tsc",
    "postinstall": "npm run build"
  }
}
```

### Create Procfile (for some platforms)
```
web: npm start
```

### Environment Variables Template
```bash
# Required for all platforms
NODE_ENV=production
DATABASE_URL=<provided-by-platform>
JWT_ACCESS_SECRET=<generate-32-char-secret>
JWT_REFRESH_SECRET=<generate-32-char-secret>
CORS_ORIGIN=https://your-domain.com
PORT=3000

# Optional
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5242880
```

---

## 💡 Platform Comparison

| Platform | Database | Sleep Mode | Custom Domain | WebSocket | Best For |
|----------|----------|------------|---------------|-----------|----------|
| **Render** | ✅ Free 90 days | ❌ 15min sleep | ✅ Free | ✅ Yes | Quick start |
| **Railway** | ✅ Included | ✅ No sleep | ✅ Free | ✅ Yes | Production |
| **Fly.io** | ✅ Free tier | ✅ No sleep | ✅ Free | ✅ Yes | Global apps |
| **Vercel** | ❌ External only | N/A | ✅ Free | ❌ Limited | Static/API |

---

## 🚨 Important Notes

### Database Considerations
- **Render**: Free PostgreSQL for 90 days, then $7/month
- **Railway**: Included in $5 credit
- **Fly.io**: Free PostgreSQL with limits

### Sleep Mode
- **Render**: Sleeps after 15 minutes (cold starts)
- **Railway/Fly**: No sleep on paid tiers
- Use **cron jobs** or **uptime monitors** to prevent sleep

### WebSocket Support
- All platforms support WebSocket
- Ensure sticky sessions for scaling
- Test real-time features after deployment

---

## 🔄 Quick Deploy Commands

### For Render (using render.yaml)
```bash
# Just push to GitHub, Render auto-deploys
git push origin main
```

### For Railway
```bash
# Connect and deploy
railway login
railway link
railway up
```

### For Fly.io
```bash
# Deploy
flyctl deploy
```

---

## 📊 Cost Breakdown

### Free Tier Limits
- **Render**: 750 hours/month, sleeps after 15min
- **Railway**: $5 credit (~1 month usage)
- **Fly.io**: 3 shared VMs, 160GB bandwidth

### When You'll Need to Pay
- **High traffic** (>100k requests/month)
- **Always-on** requirements
- **Multiple environments** (staging/prod)
- **Database persistence** beyond free limits

---

## 🎯 Recommendation

**For your chat backend, I recommend Railway.app:**
1. ✅ No sleep mode (always responsive)
2. ✅ WebSocket support
3. ✅ PostgreSQL included
4. ✅ $5 monthly credit is generous
5. ✅ Easy GitHub integration
6. ✅ Great for real-time apps

**Render.com as backup** if you don't mind cold starts for a completely free option.
