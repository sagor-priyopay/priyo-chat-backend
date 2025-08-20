#!/usr/bin/env node

/**
 * n8n Debug Test - Step by step workflow testing
 */

const fetch = require('node-fetch');

const NGROK_URL = 'https://53085ccdb80d.ngrok-free.app';
const N8N_WEBHOOK = 'https://n8n.srv958024.hstgr.cloud/webhook/e985d15f-b2f6-456d-be15-97e0b1544a40/chat';

console.log('🔧 n8n Workflow Debug Test\n');

// Test 1: Verify ngrok backend is accessible
console.log('1. Testing ngrok backend accessibility...');
fetch(`${NGROK_URL}/health`)
  .then(res => res.json())
  .then(data => {
    console.log('   ✅ Backend accessible:', data.status);
    
    // Test 2: Test webhook endpoint
    console.log('\n2. Testing webhook endpoint...');
    return fetch(`${NGROK_URL}/api/ai-agent/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'test-123',
        message: 'Test AI response',
        metadata: { intent: 'test' }
      })
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('   ✅ Webhook endpoint working:', data.success);
    
    console.log('\n📋 n8n HTTP Request Node Configuration:');
    console.log('   Method: POST');
    console.log('   URL:', `${NGROK_URL}/api/ai-agent/webhook`);
    console.log('   Headers: Content-Type: application/json');
    console.log('   Body (JSON):');
    console.log('   {');
    console.log('     "conversationId": "{{ $(\\'Webhook\\').first().json.conversationId }}",');
    console.log('     "message": "{{ $json.message || $json.choices[0].message.content }}",');
    console.log('     "metadata": {');
    console.log('       "intent": "response",');
    console.log('       "confidence": 0.95');
    console.log('     }');
    console.log('   }');
    
    console.log('\n🚨 Common n8n HTTP Request Errors:');
    console.log('   - Missing Content-Type header');
    console.log('   - Wrong JSON structure in body');
    console.log('   - Incorrect expression syntax {{ }}');
    console.log('   - Missing required fields (conversationId, message)');
    
    console.log('\n✅ Your ngrok URL for n8n HTTP Request node:');
    console.log(`   ${NGROK_URL}/api/ai-agent/webhook`);
  })
  .catch(err => {
    console.log('   ❌ Error:', err.message);
  });
