async function debugDashboard() {
  const fetch = (await import('node-fetch')).default;
  
  try {
    console.log('🔍 Testing dashboard functionality...');
    
    // Step 1: Login first
    console.log('\n1. Logging in...');
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
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData.error);
      return;
    }
    
    console.log('✅ Login successful');
    const accessToken = loginData.tokens.accessToken;
    
    // Step 2: Test conversations endpoint
    console.log('\n2. Testing conversations endpoint...');
    const conversationsResponse = await fetch('https://priyo-chat-64wg.onrender.com/api/agent-dashboard/conversations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${conversationsResponse.status}`);
    
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json();
      console.log('✅ Conversations endpoint working');
      console.log(`   Conversations found: ${conversationsData.conversations?.length || 0}`);
      console.log(`   Stats: ${JSON.stringify(conversationsData.stats || {})}`);
    } else {
      const errorData = await conversationsResponse.text();
      console.log('❌ Conversations endpoint failed');
      console.log('   Response:', errorData.substring(0, 200));
    }
    
    // Step 3: Test Socket.IO connection
    console.log('\n3. Testing Socket.IO connection...');
    const io = require('socket.io-client');
    const socket = io('https://priyo-chat-64wg.onrender.com', {
      auth: {
        token: accessToken
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      socket.disconnect();
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket.IO connection failed:', error.message);
    });

    // Wait for socket connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Check if there are any conversations to display
    console.log('\n4. Checking for test conversations...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const conversationCount = await prisma.conversation.count();
      const messageCount = await prisma.message.count();
      
      console.log(`   Total conversations in DB: ${conversationCount}`);
      console.log(`   Total messages in DB: ${messageCount}`);
      
      if (conversationCount === 0) {
        console.log('⚠️  No conversations found - dashboard will appear empty');
        console.log('   Creating a test conversation...');
        
        // Create a test conversation
        const testConversation = await prisma.conversation.create({
          data: {
            type: 'chat',
            status: 'OPEN',
            priority: 'MEDIUM',
            participants: {
              create: [
                {
                  userId: loginData.user.id,
                  role: 'AGENT'
                }
              ]
            },
            messages: {
              create: [
                {
                  content: 'Hello! This is a test message to verify the dashboard is working.',
                  senderId: loginData.user.id,
                  senderType: 'AGENT'
                }
              ]
            }
          },
          include: {
            participants: true,
            messages: true
          }
        });
        
        console.log('✅ Test conversation created:', testConversation.id);
      }
    } catch (dbError) {
      console.log('❌ Database check failed:', dbError.message);
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugDashboard();
