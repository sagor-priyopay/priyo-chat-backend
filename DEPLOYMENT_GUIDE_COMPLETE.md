# Complete Deployment Guide - Priyo Chat with Agent Dashboard

## 🚀 Deployment Options

### Option 1: Render (Recommended - Free Tier Available)

1. **Prepare for Deployment**
   ```bash
   # Ensure all dependencies are installed
   npm install
   
   # Build the application
   npm run build
   ```

2. **Database Setup**
   - Create a PostgreSQL database on [Render](https://render.com) or [Supabase](https://supabase.com)
   - Get your database URL

3. **Deploy to Render**
   - Connect your GitHub repository to Render
   - Create a new Web Service
   - Use these settings:
     ```
     Build Command: npm install && npm run build
     Start Command: npm start
     ```

4. **Environment Variables**
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
   NODE_ENV=production
   CORS_ORIGIN=https://your-domain.com
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...
   ADMIN_CREATE_KEY=your-admin-secret-for-creating-agents
   ```

### Option 2: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy**
   ```bash
   railway init
   railway up
   ```

### Option 3: Heroku

1. **Install Heroku CLI and deploy**
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:hobby-dev
   git push heroku main
   ```

## 🗄️ Database Migration

After deployment, run migrations:
```bash
# For Render/Railway/Heroku
npx prisma db push

# Or if you prefer migrations
npx prisma migrate deploy
```

## 🔧 Post-Deployment Setup

### 1. Create Agent Accounts
```bash
curl -X POST https://your-domain.com/api/priyo-auth/agent/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@priyo.com",
    "username": "Agent1",
    "password": "secure-password",
    "adminKey": "your-admin-secret-for-creating-agents"
  }'
```

### 2. Test Agent Dashboard
- Visit: `https://your-domain.com/agent-dashboard/`
- Login with agent credentials

### 3. Test Widget
- Visit: `https://your-domain.com/widget/test.html`
- Test chat functionality

## 📱 Integration with pay.priyo.com

### Customer Authentication
```javascript
// In your pay.priyo.com frontend
async function authenticateCustomer(userToken, userId) {
  const response = await fetch('https://your-chat-domain.com/api/priyo-auth/customer/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priyoPayToken: userToken,
      priyoPayUserId: userId
    })
  });
  
  const data = await response.json();
  if (data.success) {
    // Store tokens for chat widget
    localStorage.setItem('chatToken', data.accessToken);
    localStorage.setItem('chatUser', JSON.stringify(data.user));
  }
}
```

### Widget Integration
```html
<!-- Add to pay.priyo.com pages -->
<script>
  window.priyoChatConfig = {
    apiUrl: 'https://your-chat-domain.com',
    socketUrl: 'https://your-chat-domain.com',
    widgetId: 'priyo-pay-widget',
    // Pass authenticated user data
    userToken: localStorage.getItem('chatToken'),
    userId: JSON.parse(localStorage.getItem('chatUser') || '{}').id
  };
</script>
<script src="https://your-chat-domain.com/widget/embed-integrated.js"></script>
```

---

# 🌐 Multi-Channel Integration Guide

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Facebook      │    │                  │    │                 │
│   Messenger     │───▶│                  │    │                 │
├─────────────────┤    │                  │    │                 │
│   WhatsApp      │───▶│  Channel Router  │───▶│ Agent Dashboard │
│   Business      │    │   & Processor    │    │                 │
├─────────────────┤    │                  │    │                 │
│   Email         │───▶│                  │    │                 │
│   Integration   │    │                  │    │                 │
├─────────────────┤    └──────────────────┘    └─────────────────┘
│   Website       │              │
│   Widget        │──────────────┘
└─────────────────┘
```

## 1. Facebook Messenger Integration

### Setup Facebook App
1. Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Messenger product
3. Generate Page Access Token
4. Set webhook URL: `https://your-domain.com/api/channels/facebook/webhook`

### Implementation
