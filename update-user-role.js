const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createOrUpdateAdmin() {
    try {
        // First, try to find if user exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email: 'sagor.khan@priyo.net'
            }
        });

        if (existingUser) {
            // Update existing user role to ADMIN
            const updatedUser = await prisma.user.update({
                where: {
                    email: 'sagor.khan@priyo.net'
                },
                data: {
                    role: 'ADMIN'
                }
            });

            console.log('✅ User role updated successfully:');
            console.log(`Email: ${updatedUser.email}`);
            console.log(`Role: ${updatedUser.role}`);
            console.log(`Username: ${updatedUser.username}`);
        } else {
            // Create new admin user
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('Priyopay123456', 10);
            
            const newUser = await prisma.user.create({
                data: {
                    email: 'sagor.khan@priyo.net',
                    username: 'sagor.khan',
                    password: hashedPassword,
                    role: 'ADMIN',
                    verified: true
                }
            });

            console.log('✅ Admin user created successfully:');
            console.log(`Email: ${newUser.email}`);
            console.log(`Role: ${newUser.role}`);
            console.log(`Username: ${newUser.username}`);
            console.log(`ID: ${newUser.id}`);
        }

    } catch (error) {
        console.error('❌ Error creating/updating admin user:', error);
        
        // List all users to see what's available
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true
            }
        });
        
        console.log('\nExisting users:');
        users.forEach(user => {
            console.log(`- ${user.email} (${user.role}) - ${user.username || 'No username'}`);
        });
    } finally {
        await prisma.$disconnect();
    }
}

createOrUpdateAdmin();
