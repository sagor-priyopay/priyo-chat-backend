# n8n Workflow Setup Guide

## 🚨 Current Issue
Your n8n webhook is returning: `HTTP 500 - {"message":"Error in workflow"}`

## 🔧 Step-by-Step Fix

### 1. Check Webhook Trigger Node
- **URL**: `https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat`
- **Method**: `POST`
- **Response Mode**: `Respond to Webhook` or `Last Node`

### 2. Expected Input Data Structure
Your webhook receives this JSON:
```json
{
  "conversationId": "string",
  "userId": "string", 
  "userMessage": "string",
  "conversationHistory": [
    {
      "content": "message text",
      "sender": "username",
      "role": "CUSTOMER|AGENT",
      "timestamp": "2025-08-20T07:54:40.000Z",
      "isAI": false
    }
  ],
  "participants": [
    {
      "id": "user_id",
      "username": "User Name",
      "role": "CUSTOMER|AGENT|ADMIN"
    }
  ]
}
```

### 3. Minimal Working Workflow

#### Node 1: Webhook Trigger
- **Settings**: 
  - HTTP Method: `POST`
  - Path: `/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat`
  - Response Mode: `Respond to Webhook`

#### Node 2: Set Variables (Optional)
Extract the user message:
```javascript
// In a Set node
return [
  {
    json: {
      userMessage: $json.userMessage,
      conversationId: $json.conversationId,
      userId: $json.userId
    }
  }
];
```

#### Node 3: AI Processing
**Option A: OpenAI Node**
- Model: `gpt-3.5-turbo` or `gpt-4`
- Message: `{{ $json.userMessage }}`

**Option B: HTTP Request to AI Service**
```json
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "headers": {
    "Authorization": "Bearer YOUR_OPENAI_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user", 
        "content": "{{ $json.userMessage }}"
      }
    ]
  }
}
```

#### Node 4: HTTP Request (Send Response Back)
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/ai-agent/webhook`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "conversationId": "{{ $('Webhook').first().json.conversationId }}",
  "message": "{{ $json.choices[0].message.content }}",
  "metadata": {
    "intent": "response",
    "confidence": 0.95
  }
}
```

### 4. Common Issues & Fixes

#### Issue: "Error in workflow"
**Causes:**
- Missing required fields in webhook data
- AI service API key not configured
- Node connection errors
- Invalid JSON in HTTP requests

**Debug Steps:**
1. Check n8n execution logs
2. Test each node individually
3. Verify API credentials
4. Check node connections

#### Issue: No response received
**Causes:**
- HTTP Request node not sending to correct URL
- Wrong response format
- Network connectivity issues

**Fix:**
- Verify backend URL: `http://localhost:3000/api/ai-agent/webhook`
- Check response format matches expected structure

### 5. Test Your Workflow

#### Test Data for Webhook:
```json
{
  "conversationId": "test-123",
  "userId": "user-123",
  "userMessage": "Hello, I need help",
  "conversationHistory": [],
  "participants": []
}
```

#### Expected Response to Backend:
```json
{
  "conversationId": "test-123",
  "message": "Hello! How can I help you today?",
  "metadata": {
    "intent": "greeting",
    "confidence": 0.95
  }
}
```

### 6. Debugging Commands

Test your webhook directly:
```bash
curl -X POST https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test","userId":"user","userMessage":"Hello","conversationHistory":[],"participants":[]}'
```

Test backend webhook:
```bash
curl -X POST http://localhost:3000/api/ai-agent/webhook \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test","message":"AI response","metadata":{"intent":"test"}}'
```

## ✅ Success Checklist
- [ ] Webhook trigger active and receiving data
- [ ] AI service configured with valid credentials
- [ ] HTTP Request node sending to correct backend URL
- [ ] Response format matches expected structure
- [ ] All nodes properly connected
- [ ] Workflow execution completes without errors

Once fixed, your chat system will automatically get AI responses! 🚀
