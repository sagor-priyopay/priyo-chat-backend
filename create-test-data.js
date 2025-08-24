const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🔄 Creating test data...');

    // Create test customer (check if exists first)
    let customer = await prisma.user.findUnique({
      where: { email: 'customer@test.com' }
    });
    
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          email: 'customer@test.com',
          username: 'TestCustomer2',
          password: '$2b$12$dummy.hash.for.test.purposes.only',
          role: 'CUSTOMER',
          isOnline: true
        }
      });
    }

    // Create test agent (check if exists first)
    let agent = await prisma.user.findUnique({
      where: { email: 'agent@test.com' }
    });
    
    if (!agent) {
      agent = await prisma.user.create({
        data: {
          email: 'agent@test.com',
          username: 'TestAgent2',
          password: '$2b$12$dummy.hash.for.test.purposes.only',
          role: 'AGENT',
          isOnline: true
        }
      });
    }

    // Create test conversation
    const conversation = await prisma.conversation.create({
      data: {
        name: 'Customer Support Chat',
        type: 'DIRECT'
      }
    });

    // Add participants
    await prisma.conversationUser.createMany({
      data: [
        {
          conversationId: conversation.id,
          userId: customer.id,
          joinedAt: new Date()
        },
        {
          conversationId: conversation.id,
          userId: agent.id,
          joinedAt: new Date()
        }
      ]
    });

    // Create test messages
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: customer.id,
          content: 'Hello, I need help with my account',
          type: 'TEXT'
        },
        {
          conversationId: conversation.id,
          senderId: agent.id,
          content: 'Hi! I\'d be happy to help you with your account. What specific issue are you experiencing?',
          type: 'TEXT'
        },
        {
          conversationId: conversation.id,
          senderId: customer.id,
          content: 'I can\'t access my payment history',
          type: 'TEXT'
        }
      ]
    });

    console.log('✅ Test data created successfully!');
    console.log(`Customer: ${customer.email}`);
    console.log(`Agent: ${agent.email}`);
    console.log(`Conversation: ${conversation.id}`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
