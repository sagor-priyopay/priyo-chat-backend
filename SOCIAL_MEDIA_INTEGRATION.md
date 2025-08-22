# Social Media & Multi-Channel Integration Guide

## 🌐 Supported Channels

Your chat system now supports integration with:
- ✅ **Facebook Messenger**
- ✅ **WhatsApp Business API**
- ✅ **Email**
- ✅ **Telegram**
- ✅ **Website Widget** (existing)

## 🚀 Quick Setup Guide

### 1. Facebook Messenger Integration

**Step 1: Create Facebook App**
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create new app → Business → Continue
3. Add "Messenger" product

**Step 2: Configure Webhook**
```bash
# Set environment variables
FB_VERIFY_TOKEN=your-secure-verify-token
FB_PAGE_ACCESS_TOKEN=your-page-access-token

# Webhook URL: https://your-domain.com/api/channels/facebook/webhook
```

**Step 3: Test Integration**
```bash
curl -X POST "https://your-domain.com/api/channels/facebook/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": {"id": "USER_ID"},
        "message": {"text": "Hello from Facebook!"}
      }]
    }]
  }'
```

### 2. WhatsApp Business API Integration

**Step 1: Setup WhatsApp Business Account**
1. Create [Meta Business Account](https://business.facebook.com)
2. Add WhatsApp Business API
3. Get Phone Number ID and Access Token

**Step 2: Configure Environment**
```bash
WA_VERIFY_TOKEN=your-whatsapp-verify-token
WA_ACCESS_TOKEN=your-whatsapp-access-token
WA_PHONE_NUMBER_ID=your-phone-number-id
```

**Step 3: Set Webhook**
- Webhook URL: `https://your-domain.com/api/channels/whatsapp/webhook`
- Verify token: Use your `WA_VERIFY_TOKEN`

### 3. Email Integration

**Option A: Using Webhooks (Recommended)**
```bash
# For services like SendGrid, Mailgun
curl -X POST "https://your-domain.com/api/channels/email/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "customer@example.com",
    "subject": "Support Request",
    "text": "I need help with my account",
    "messageId": "unique-email-id"
  }'
```

**Option B: IMAP Integration** (Advanced)
- Monitor specific support email inbox
- Parse incoming emails automatically
- Convert to chat conversations

### 4. Telegram Bot Integration

**Step 1: Create Telegram Bot**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create new bot with `/newbot`
3. Get bot token

**Step 2: Configure**
```bash
TELEGRAM_BOT_TOKEN=your-bot-token

# Set webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://your-domain.com/api/channels/telegram/webhook"
```

## 🔧 Environment Variables

Add these to your deployment environment:

```env
# Facebook Messenger
FB_VERIFY_TOKEN=your-secure-verify-token
FB_PAGE_ACCESS_TOKEN=your-page-access-token

# WhatsApp Business
WA_VERIFY_TOKEN=your-whatsapp-verify-token
WA_ACCESS_TOKEN=your-whatsapp-access-token
WA_PHONE_NUMBER_ID=your-phone-number-id

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Email (if using SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📱 How It Works

### Message Flow
```
Customer Message → Channel Webhook → Your Server → Agent Dashboard
Agent Reply → Your Server → Channel API → Customer
```

### User Management
- Each channel creates unique users: `facebook_USER_ID@channel.priyo.com`
- Conversations are automatically created per channel user
- All messages appear in the same agent dashboard
- Agents can reply from one interface to all channels

### Message Routing
1. **Incoming**: Webhook receives message → Creates/finds user → Creates conversation → Notifies agents
2. **Outgoing**: Agent sends reply → System routes to correct channel → Delivers via channel API

## 🎯 Agent Dashboard Features

Agents will see:
- **Channel Indicators**: Messages tagged with source (Facebook, WhatsApp, etc.)
- **Unified Conversations**: All channels in one interface
- **User Context**: Channel-specific user information
- **Reply Routing**: Automatic routing of replies to correct channel

## 🔄 Testing Multi-Channel Setup

### Test Facebook Messenger
```bash
# Send test message via Facebook webhook
curl -X POST "https://your-domain.com/api/channels/facebook/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "PAGE_ID",
      "messaging": [{
        "sender": {"id": "test_user_123"},
        "message": {"text": "Test message from Facebook"}
      }]
    }]
  }'
```

### Test WhatsApp
```bash
# Send test WhatsApp message
curl -X POST "https://your-domain.com/api/channels/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "msg_123",
            "text": {"body": "Test WhatsApp message"}
          }]
        }
      }]
    }]
  }'
```

### Test Email
```bash
curl -X POST "https://your-domain.com/api/channels/email/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@customer.com",
    "subject": "Support Request",
    "text": "I need help with my account"
  }'
```

## 🚀 Advanced Features

### Auto-Assignment Rules
- Route Facebook messages to specific agents
- Prioritize WhatsApp messages
- Set business hours per channel

### Analytics & Reporting
- Track response times per channel
- Monitor conversation volume
- Channel performance metrics

### Custom Integrations
- Add more channels using the same pattern
- Instagram DMs, Twitter DMs, etc.
- Custom webhook endpoints for any platform

## 📊 Monitoring & Logs

Check logs for channel integration:
```bash
# View channel-specific logs
grep "facebook" /var/log/your-app.log
grep "whatsapp" /var/log/your-app.log
grep "email" /var/log/your-app.log
```

## 🔒 Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Rate Limiting**: Implement per-channel rate limits
3. **Data Privacy**: Handle customer data according to platform policies
4. **Access Tokens**: Rotate tokens regularly
5. **HTTPS Only**: All webhooks must use HTTPS

## 🎉 Go Live Checklist

- [ ] Environment variables configured
- [ ] Webhooks verified and active
- [ ] Database schema updated (`npx prisma db push`)
- [ ] Agent accounts created
- [ ] Test messages sent from each channel
- [ ] Agent dashboard tested with multi-channel messages
- [ ] Production deployment completed
- [ ] Monitoring and alerts configured

Your multi-channel chat system is now ready to handle customers from Facebook Messenger, WhatsApp, Email, Telegram, and your website widget - all in one unified agent dashboard! 🚀
