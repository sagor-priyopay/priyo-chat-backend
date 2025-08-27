const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function debugPassword() {
  try {
    // Get the agent user
    const user = await prisma.user.findUnique({
      where: { email: 'agent@priyo.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password hash: ${user.password}`);

    // Test password comparison
    const testPassword = 'agent123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    console.log(`\n🔐 Password test:`);
    console.log(`   Test password: ${testPassword}`);
    console.log(`   Hash matches: ${isValid}`);

    if (!isValid) {
      console.log('\n🔧 Updating password...');
      const newHash = await bcrypt.hash(testPassword, 10);
      
      await prisma.user.update({
        where: { email: 'agent@priyo.com' },
        data: { password: newHash }
      });
      
      console.log('✅ Password updated successfully');
      
      // Test again
      const retestValid = await bcrypt.compare(testPassword, newHash);
      console.log(`   New hash matches: ${retestValid}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPassword();
