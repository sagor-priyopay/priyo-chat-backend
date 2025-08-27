async function debugConversationLoading() {
  const fetch = (await import('node-fetch')).default;
  
  try {
    console.log('🔍 Debugging conversation loading issue...\n');
    
    // Step 1: Login and get token
    console.log('1. Getting auth token...');
    const loginResponse = await fetch('https://priyo-chat-64wg.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'agent@priyo.com',
        password: 'agent123'
      })
    });

    const loginData = await loginResponse.json();
    const accessToken = loginData.tokens.accessToken;
    console.log('✅ Token obtained');
    
    // Step 2: Test conversations API directly
    console.log('\n2. Testing conversations API...');
    const conversationsResponse = await fetch('https://priyo-chat-64wg.onrender.com/api/agent-dashboard/conversations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json();
      console.log('✅ API Response received');
      console.log(`   Conversations count: ${conversationsData.conversations?.length || 0}`);
      
      if (conversationsData.conversations && conversationsData.conversations.length > 0) {
        console.log('\n📋 Sample conversation data:');
        const sample = conversationsData.conversations[0];
        console.log(`   ID: ${sample.id}`);
        console.log(`   Type: ${sample.type || 'undefined'}`);
        console.log(`   Status: ${sample.status || 'undefined'}`);
        console.log(`   Created: ${sample.createdAt || 'undefined'}`);
        console.log(`   Participants: ${sample.participants?.length || 0}`);
        console.log(`   Messages: ${sample.messages?.length || 0}`);
        
        // Check participant structure
        if (sample.participants && sample.participants.length > 0) {
          const participant = sample.participants[0];
          console.log(`   First participant role: ${participant.role || 'undefined'}`);
          console.log(`   First participant user: ${participant.user ? 'exists' : 'missing'}`);
          if (participant.user) {
            console.log(`     User role: ${participant.user.role || 'undefined'}`);
            console.log(`     User name: ${participant.user.username || 'undefined'}`);
          }
        }
        
        // Check message structure
        if (sample.messages && sample.messages.length > 0) {
          const message = sample.messages[sample.messages.length - 1];
          console.log(`   Last message content: ${message.content || 'undefined'}`);
          console.log(`   Last message sender: ${message.senderType || 'undefined'}`);
          console.log(`   Last message date: ${message.createdAt || 'undefined'}`);
        }
      } else {
        console.log('⚠️  No conversations found in API response');
      }
    } else {
      console.log('❌ Conversations API failed:', conversationsResponse.status);
    }
    
    // Step 3: Check current dashboard.js structure
    console.log('\n3. Checking dashboard.js structure...');
    const jsResponse = await fetch('https://priyo-chat-64wg.onrender.com/agent-dashboard/dashboard.js');
    const jsContent = await jsResponse.text();
    
    // Check for key methods and potential issues
    const hasLoadConversations = jsContent.includes('async loadConversations()');
    const hasRenderConversations = jsContent.includes('renderConversations()');
    const hasRecursiveCall = jsContent.includes('this.renderConversations()') && 
                            jsContent.split('this.renderConversations()').length > 2;
    const hasUpdateBadges = jsContent.includes('this.updateBadges()');
    
    console.log(`   Has loadConversations: ${hasLoadConversations}`);
    console.log(`   Has renderConversations: ${hasRenderConversations}`);
    console.log(`   Has recursive call issue: ${hasRecursiveCall}`);
    console.log(`   Has updateBadges: ${hasUpdateBadges}`);
    
    // Step 4: Create test conversation if none exist
    console.log('\n4. Checking database for conversations...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const conversationCount = await prisma.conversation.count();
      console.log(`   Total conversations in DB: ${conversationCount}`);
      
      if (conversationCount === 0) {
        console.log('   Creating test conversation...');
        
        // Get agent user
        const agent = await prisma.user.findFirst({
          where: { email: 'agent@priyo.com' }
        });
        
        if (agent) {
          const testConv = await prisma.conversation.create({
            data: {
              type: 'chat',
              status: 'OPEN',
              priority: 'MEDIUM',
              participants: {
                create: [
                  {
                    userId: agent.id,
                    role: 'AGENT'
                  }
                ]
              },
              messages: {
                create: [
                  {
                    content: 'Hello! This is a test message to verify the dashboard.',
                    senderId: agent.id,
                    senderType: 'AGENT'
                  }
                ]
              }
            }
          });
          console.log(`   ✅ Test conversation created: ${testConv.id}`);
        }
      }
    } catch (dbError) {
      console.log(`   ❌ Database error: ${dbError.message}`);
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugConversationLoading();
