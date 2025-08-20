import { PrismaClient } from '@prisma/client';

export class DatabaseService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }
    return DatabaseService.instance;
  }

  static async connect(): Promise<void> {
    try {
      const prisma = DatabaseService.getInstance();
      await prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  static async disconnect(): Promise<void> {
    const prisma = DatabaseService.getInstance();
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}
