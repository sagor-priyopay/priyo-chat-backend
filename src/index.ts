import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import logger from './utils/logger';
import { requestId, securityHeaders, sanitizeInput, auditLog } from './middleware/security';

import { DatabaseService } from './services/database';
import { SocketService } from './services/socket';
import { initializeDatabase } from './utils/database-init';

// Import routes
import authRoutes from './routes/auth';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import uploadRoutes from './routes/upload';
import widgetRoutes from './routes/widget';
import aiAgentRoutes from './routes/ai-agent';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize services
let socketService: SocketService;

async function initializeApp() {
  try {
    await startServer();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  try {
    // Initialize database and run migrations
    await initializeDatabase();
    
    // Initialize database connection
    const prisma = DatabaseService.getInstance();
    console.log('✅ Database connected successfully');

    // Connect to database
    await DatabaseService.connect();

    // Initialize Socket.IO
    socketService = new SocketService(server);

    // Security middleware
    app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://cdnjs.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
          fontSrc: ["'self'", "https:", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
    }));
    
    const envOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
    const allowedOrigins = new Set([
      ...envOrigins,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default port
      'https://pay.priyo.com',
      'https://agent.pay.priyo.com',
      'https://api.pay.priyo.com'
    ]);
    
    // Log allowed origins for debugging
    console.log('Allowed CORS origins:', Array.from(allowedOrigins));
    
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow localhost for development
        if (process.env.NODE_ENV !== 'production' && 
            (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:'))) {
          return callback(null, true);
        }
        
        if (allowedOrigins.has(origin) || allowedOrigins.has('*')) {
          callback(null, true);
        } else {
          console.warn('CORS blocked request from origin:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
      exposedHeaders: ['Content-Range', 'X-Total-Count', 'X-Access-Token', 'X-Refresh-Token'],
      maxAge: 86400 // 24 hours
    }));
    
    // Handle preflight requests
    app.options('*', cors());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    // Set trust proxy for production
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }
    
    app.use(limiter);

    // Security middleware
    app.use(requestId);
    app.use(securityHeaders);
    app.use(sanitizeInput);
    app.use(auditLog);

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files from uploads directory
    const uploadsDir = process.env.UPLOAD_DIR || 'uploads';
    app.use('/uploads', express.static(path.join(process.cwd(), uploadsDir)));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        name: 'Priyo Chat Backend API',
        version: '1.0.0',
        status: 'Running',
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          conversations: '/api/conversations',
          messages: '/api/messages',
          upload: '/api/upload',
          widget: '/api/widget',
          aiAgent: '/api/ai-agent'
        },
        widget: '/widget/test.html',
        agentDashboard: '/agent-dashboard/login.html',
        timestamp: new Date().toISOString()
      });
    });

    // Health check endpoints
    const { MonitoringService } = await import('./utils/monitoring');
    app.get('/health', MonitoringService.healthCheckEndpoint);
    app.get('/api/health', MonitoringService.healthCheckEndpoint);
    
    // Metrics endpoint for monitoring
    app.get('/metrics', (req, res) => {
      res.json(MonitoringService.getMetrics());
    });

    // Serve widget static files
    app.use('/widget', express.static(path.join(__dirname, '../public/widget')));
    
    // Serve agent dashboard static files
    app.use('/agent-dashboard', express.static(path.join(__dirname, '../public/agent-dashboard')));
    

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/conversations', conversationRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/widget', widgetRoutes);
    app.use('/api/ai-agent', aiAgentRoutes);
    app.use('/api/priyo-auth', require('./routes/priyo-auth').default);
    app.use('/api/channels', require('./routes/channels').default);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Global error handler
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Log error details for monitoring
      console.error('Global error handler:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'File too large',
          maxSize: process.env.MAX_FILE_SIZE || '5MB'
        });
      }
      
      if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }

      if (error.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      // Rate limit error
      if (error.status === 429) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: error.retryAfter
        });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.headers['x-request-id'] || 'unknown',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server ready`);
    });

    // Cleanup typing indicators every 5 minutes
    setInterval(() => {
      socketService.cleanupTypingIndicators();
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    DatabaseService.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    DatabaseService.disconnect();
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize the application
initializeApp();
