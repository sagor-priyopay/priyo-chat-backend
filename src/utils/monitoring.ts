import { Request, Response } from 'express';
import { DatabaseService } from '../services/database';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

export class MonitoringService {
  private static startTime = Date.now();

  static async getHealthStatus(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed;

    let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    
    try {
      const prisma = DatabaseService.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }

    const health: HealthCheck = {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.round((usedMemory / totalMemory) * 100)
        },
        cpu: {
          usage: Math.round(process.cpuUsage().user / 1000000) // Convert to seconds
        }
      }
    };

    return health;
  }

  static async healthCheckEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const health = await MonitoringService.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  static getMetrics(): any {
    const memUsage = process.memoryUsage();
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }
}
