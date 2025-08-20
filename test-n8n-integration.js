#!/usr/bin/env node

/**
 * n8n Integration Test Script
 * Tests the complete flow: Backend -> n8n -> Backend webhook
 */

const fetch = require('node-fetch');

const CONFIG = {
  backendUrl: 'http://localhost:3000',
  n8nWebhookUrl: 'https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat'
};

async function testN8nIntegration() {
  console.log('🧪 Testing n8n AI Agent Integration\n');

  // Step 1: Test n8n webhook directly
  console.log('1. Testing n8n webhook directly...');
  try {
    const n8nResponse = await fetch(CONFIG.n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'test-123',
        userId: 'user-123',
        userMessage: 'Hello, I need help',
        conversationHistory: [],
        participants: []
      })
    });

    const n8nData = await n8nResponse.text();
    console.log(`   Status: ${n8nResponse.status}`);
    console.log(`   Response: ${n8nData}`);
    
    if (n8nResponse.status !== 200) {
      console.log('   ❌ n8n workflow has an error. Check your workflow configuration.');
      console.log('\n🔧 n8n Workflow Debugging Tips:');
      console.log('   - Ensure webhook trigger is active');
      console.log('   - Check if all nodes are properly connected');
      console.log('   - Verify AI service credentials (OpenAI, Claude, etc.)');
      console.log('   - Check workflow execution logs in n8n');
      return;
    } else {
      console.log('   ✅ n8n webhook responding');
    }
  } catch (error) {
    console.log(`   ❌ Failed to reach n8n: ${error.message}`);
    return;
  }

  // Step 2: Test backend webhook endpoint
  console.log('\n2. Testing backend webhook endpoint...');
  try {
    const webhookResponse = await fetch(`${CONFIG.backendUrl}/api/ai-agent/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'test-123',
        message: 'This is a test AI response',
        metadata: {
          intent: 'test',
          confidence: 0.95
        }
      })
    });

    const webhookData = await webhookResponse.json();
    console.log(`   Status: ${webhookResponse.status}`);
    console.log(`   Response:`, webhookData);
    
    if (webhookResponse.status === 200) {
      console.log('   ✅ Backend webhook working');
    } else {
      console.log('   ❌ Backend webhook error');
    }
  } catch (error) {
    console.log(`   ❌ Backend webhook failed: ${error.message}`);
  }

  // Step 3: Test trigger endpoint
  console.log('\n3. Testing AI agent trigger...');
  try {
    const triggerResponse = await fetch(`${CONFIG.backendUrl}/api/ai-agent/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'test-123',
        message: 'Hello, I need help with my account',
        userId: 'user-123',
        userMessage: 'Hello, I need help with my account'
      })
    });

    const triggerData = await triggerResponse.json();
    console.log(`   Status: ${triggerResponse.status}`);
    console.log(`   Response:`, triggerData);
    
    if (triggerResponse.status === 200) {
      console.log('   ✅ AI agent trigger working');
    } else {
      console.log('   ❌ AI agent trigger error');
    }
  } catch (error) {
    console.log(`   ❌ AI agent trigger failed: ${error.message}`);
  }

  console.log('\n📋 n8n Workflow Requirements:');
  console.log('Your n8n workflow should:');
  console.log('1. Have a Webhook trigger node listening at your webhook URL');
  console.log('2. Process the incoming data with your AI service');
  console.log('3. Send response back to: http://localhost:3000/api/ai-agent/webhook');
  console.log('\nExpected response format:');
  console.log(JSON.stringify({
    conversationId: '{{ $json.conversationId }}',
    message: 'AI generated response here',
    metadata: {
      intent: 'detected_intent',
      confidence: 0.95
    }
  }, null, 2));
}

// Run the test
testN8nIntegration().catch(console.error);
