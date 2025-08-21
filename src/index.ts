import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { DatabaseService } from './services/database';
import { SocketService } from './services/socket';

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
    // Connect to database
    await DatabaseService.connect();

    // Initialize Socket.IO
    socketService = new SocketService(server);

    // Middleware
    app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    app.use(cors({
      origin: [
        process.env.CORS_ORIGIN || "http://localhost:3000",
        "http://127.0.0.1:44693",
        "http://localhost:44693"
      ],
      credentials: true,
    }));

    // Rate limiting (disabled for development)
    // const limiter = rateLimit({
    //   windowMs: 15 * 60 * 1000, // 15 minutes
    //   max: 100, // limit each IP to 100 requests per windowMs
    //   message: 'Too many requests from this IP, please try again later.',
    //   trustProxy: false,
    // });
    // app.use(limiter);

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
        timestamp: new Date().toISOString()
      });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Serve widget static files
    app.use('/widget', express.static(path.join(__dirname, '../public/widget')));

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/conversations', conversationRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/widget', widgetRoutes);
    app.use('/api/ai-agent', aiAgentRoutes);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Global error handler
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler:', error);
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large' });
      }
      
      if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }

      res.status(500).json({ 
        error: 'Internal server error',
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
