const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/priyo_chat'
    }
  }
});

async function createAdmin() {
  try {
    console.log('🔄 Creating admin user...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'sagor.khan@priyo.net' }
    });

    if (existingUser) {
      console.log('⚠️  User already exists with email: sagor.khan@priyo.net');
      console.log('Current role:', existingUser.role);
      
      // Update to admin if not already
      if (existingUser.role !== 'ADMIN') {
        const updatedUser = await prisma.user.update({
          where: { email: 'sagor.khan@priyo.net' },
          data: { 
            role: 'ADMIN',
            password: await bcrypt.hash('Priyopay123456', 12)
          }
        });
        console.log('✅ Updated user to ADMIN role');
        console.log('Email:', updatedUser.email);
        console.log('Username:', updatedUser.username);
        console.log('Role:', updatedUser.role);
      } else {
        console.log('✅ User is already an ADMIN');
      }
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Priyopay123456', 12);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: 'sagor.khan@priyo.net',
        username: 'sagor.khan',
        password: hashedPassword,
        role: 'ADMIN',
        isOnline: false,
        verified: true
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('ID:', user.id);
    console.log('\n🔐 Login credentials:');
    console.log('Email: sagor.khan@priyo.net');
    console.log('Password: Priyopay123456');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Database connection failed. Make sure PostgreSQL is running.');
      console.log('Or set up a production database URL in .env file.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
