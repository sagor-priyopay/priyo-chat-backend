const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAgentUser() {
  try {
    // Check if agent user already exists
    const existingAgent = await prisma.user.findUnique({
      where: { email: 'agent@priyo.com' }
    });

    if (existingAgent) {
      console.log('✅ Agent user already exists:');
      console.log(`   Email: ${existingAgent.email}`);
      console.log(`   Username: ${existingAgent.username}`);
      console.log(`   Role: ${existingAgent.role}`);
      console.log(`   ID: ${existingAgent.id}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('agent123', 10);

    // Create agent user
    const agent = await prisma.user.create({
      data: {
        email: 'agent@priyo.com',
        username: 'Agent Support',
        password: hashedPassword,
        role: 'AGENT',
        verified: true,
        isOnline: false
      }
    });

    console.log('✅ Agent user created successfully:');
    console.log(`   Email: ${agent.email}`);
    console.log(`   Username: ${agent.username}`);
    console.log(`   Role: ${agent.role}`);
    console.log(`   ID: ${agent.id}`);

    // Also create an admin user for testing
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@priyo.com' }
    });

    if (!existingAdmin) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.create({
        data: {
          email: 'admin@priyo.com',
          username: 'Admin User',
          password: adminPassword,
          role: 'ADMIN',
          verified: true,
          isOnline: false
        }
      });

      console.log('✅ Admin user created successfully:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
    }

  } catch (error) {
    console.error('❌ Error creating agent user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAgentUser();
