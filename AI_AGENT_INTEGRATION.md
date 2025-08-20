# n8n AI Agent Integration Guide

This document explains how to integrate your n8n AI agent with the Priyo Chat system for intelligent automated responses.

## 🤖 Overview

The AI agent integration allows your n8n workflow to automatically respond to customer messages in real-time, providing intelligent chatbot functionality.

## 🏗️ Architecture

```
Customer Message → Chat Backend → n8n Workflow → AI Response → Chat Backend → Customer
```

1. **Customer sends message** via widget
2. **Backend triggers n8n** workflow with message context
3. **n8n processes** message with AI (OpenAI, Claude, etc.)
4. **n8n sends response** back to backend webhook
5. **Backend delivers** AI response to customer in real-time

## 📋 Setup Instructions

### 1. Environment Configuration

Add to your `.env` file:
```bash
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ai-agent
```

### 2. n8n Workflow Setup

Create a new n8n workflow with these components:

#### Webhook Trigger Node
- **URL**: `http://localhost:5678/webhook/ai-agent`
- **Method**: `POST`
- **Response Mode**: `Respond to Webhook`

#### Expected Input Data
```json
{
  "conversationId": "string",
  "userId": "string", 
  "userMessage": "string",
  "conversationHistory": [
    {
      "content": "string",
      "sender": "string",
      "role": "CUSTOMER|AGENT",
      "timestamp": "ISO date",
      "isAI": boolean
    }
  ],
  "participants": [
    {
      "id": "string",
      "username": "string", 
      "role": "CUSTOMER|AGENT|ADMIN"
    }
  ]
}
```

#### AI Processing Node
Add your AI service node (OpenAI, Claude, etc.):
- Use `userMessage` as the main input
- Include `conversationHistory` for context
- Configure your AI prompt and parameters

#### HTTP Response Node
Send the AI response back to the chat backend:
- **URL**: `http://localhost:3000/api/ai-agent/webhook`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Response Payload
```json
{
  "conversationId": "{{ $json.conversationId }}",
  "message": "{{ $json.ai_response }}",
  "metadata": {
    "intent": "greeting|question|complaint|etc",
    "confidence": 0.95,
    "responseType": "text"
  }
}
```

## 🔗 API Endpoints

### Trigger n8n Workflow
```http
POST /api/ai-agent/trigger
Content-Type: application/json

{
  "conversationId": "string",
  "message": "string", 
  "userId": "string",
  "userMessage": "string"
}
```

### Receive AI Response (Webhook)
```http
POST /api/ai-agent/webhook
Content-Type: application/json

{
  "conversationId": "string",
  "message": "string",
  "userId": "string",
  "metadata": {
    "intent": "string",
    "confidence": number,
    "responseType": "text|quick_reply|card"
  }
}
```

### Health Check
```http
GET /api/ai-agent/health
```

## 🎯 Features

### Automatic Triggering
- AI agent is automatically triggered when customers send messages
- No manual intervention required
- Works with widget and regular chat interfaces

### Context Awareness
- Full conversation history sent to n8n
- Participant information included
- Previous AI responses tracked

### Real-time Delivery
- AI responses delivered via WebSocket
- Instant notification to customers
- Seamless chat experience

### Metadata Support
- Intent detection
- Confidence scores
- Response type classification
- Custom metadata fields

## 🧪 Testing

### 1. Test AI Agent Health
```bash
curl http://localhost:3000/api/ai-agent/health
```

### 2. Test Manual Trigger
```bash
curl -X POST http://localhost:3000/api/ai-agent/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv-123",
    "message": "Hello, I need help",
    "userId": "test-user-123", 
    "userMessage": "Hello, I need help"
  }'
```

### 3. Test Webhook Response
```bash
curl -X POST http://localhost:3000/api/ai-agent/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv-123",
    "message": "Hello! How can I help you today?",
    "metadata": {
      "intent": "greeting",
      "confidence": 0.95
    }
  }'
```

## 🔧 Configuration Options

### Environment Variables
- `N8N_WEBHOOK_URL`: Your n8n webhook endpoint
- `NODE_ENV`: Set to 'production' to disable debug logs

### AI Agent User
The system automatically creates an AI agent user:
- **Email**: `ai-agent@priyo.local`
- **Username**: `AI Assistant`
- **Role**: `AGENT`

### Message Metadata
AI responses can include metadata:
```json
{
  "intent": "greeting|question|complaint|booking|support",
  "confidence": 0.0-1.0,
  "entities": [],
  "responseType": "text|quick_reply|card"
}
```

## 🚀 Advanced Features

### Custom AI Prompts
Configure your n8n workflow with custom prompts:
- Company-specific information
- Product knowledge base
- Tone and personality settings
- Multi-language support

### Intent Classification
Use AI to classify customer intents:
- Route to appropriate agents
- Trigger specific workflows
- Collect analytics data

### Escalation Logic
Implement escalation rules in n8n:
- Complex queries → Human agent
- High-value customers → Priority queue
- Negative sentiment → Manager notification

## 🐛 Troubleshooting

### Common Issues

1. **n8n webhook not triggered**
   - Check `N8N_WEBHOOK_URL` configuration
   - Verify n8n workflow is active
   - Check network connectivity

2. **AI responses not delivered**
   - Verify webhook endpoint is correct
   - Check conversation ID exists
   - Review server logs for errors

3. **WebSocket not updating**
   - Ensure WebSocket connection is active
   - Check browser console for errors
   - Verify conversation participants

### Debug Logs
Enable debug logging by setting:
```bash
NODE_ENV=development
```

## 📊 Monitoring

### Metrics to Track
- AI response time
- Conversation resolution rate
- Customer satisfaction scores
- Escalation frequency

### Logging
All AI interactions are logged:
- Trigger requests
- n8n responses
- Error conditions
- Performance metrics

## 🔒 Security

### Authentication
- AI agent uses system-level authentication
- Webhook endpoints are rate-limited
- Input validation on all endpoints

### Data Privacy
- Conversation data is encrypted
- AI responses are logged securely
- GDPR compliance maintained

## 🎉 Success Metrics

With AI agent integration, expect:
- **Faster response times** (< 3 seconds)
- **24/7 availability** for customer support
- **Reduced agent workload** (30-50% automation)
- **Improved customer satisfaction** through instant responses
- **Scalable support** without additional staff

---

Your n8n AI agent is now fully integrated with the Priyo Chat system! 🚀
