import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Initializing database...');
    
    // Push Prisma schema to database
    await execAsync('npx prisma db push --accept-data-loss');
    console.log('✅ Database schema pushed');
    
    // Generate Prisma client
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't throw error to prevent app from crashing
    // The app will handle database errors gracefully
  }
}
