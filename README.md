# Priyo Chat Backend

A simplified real-time chat application backend built with Node.js, TypeScript, Express, PostgreSQL, and Socket.IO.

## 🚀 Features

- **Authentication**: JWT-based auth with access & refresh tokens
- **Real-time Communication**: WebSocket support via Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **File Uploads**: Local file storage with validation
- **Security**: Helmet, CORS, rate limiting
- **Website Widget**: Embeddable chat widget for websites
- **TypeScript**: Full type safety throughout the application

## 📋 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration (with optional role: ADMIN, AGENT, CUSTOMER)
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `GET /me` - Get current user profile

### Conversations (`/api/conversations`)
- `GET /` - List user's conversations
- `POST /` - Create new conversation
- `GET /:conversationId` - Get conversation details
- `DELETE /:conversationId` - Leave/close conversation (⚠️ **Agent/Admin only**)

### Messages (`/api/messages`)
- `GET /:conversationId` - Get messages for conversation
- `POST /` - Send message
- `POST /read` - Mark messages as read
- `GET /unread/count` - Get unread message count

### File Upload (`/api/upload`)
- `POST /` - Upload file
- `GET /:filename` - Serve uploaded file

## 🔌 WebSocket Events

### Client → Server
- `conversation:join` - Join a conversation room
- `conversation:leave` - Leave a conversation room
- `message:send` - Send a message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `message:read` - Mark message as read

### Server → Client
- `message:new` - New message received
- `message:delivered` - Message delivery confirmation
- `message:read` - Message read confirmation
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:status` - User online/offline status

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **File Upload**: Multer
- **Security**: Helmet, CORS, bcryptjs
- **Containerization**: Docker & Docker Compose

## 📦 Installation & Setup

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 13 or higher
- npm or yarn

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd priyo-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/priyo_chat?schema=public"
   JWT_ACCESS_SECRET="your-super-secret-access-token-key"
   JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   PORT=3000
   NODE_ENV="development"
   CORS_ORIGIN="http://localhost:3000"
   UPLOAD_DIR="uploads"
   MAX_FILE_SIZE=5242880
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run database migrations
   npm run prisma:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

### Docker Setup (Recommended)

1. **Development with Docker**
   ```bash
   # Start only database services
   docker-compose -f docker-compose.dev.yml up -d
   
   # Run migrations
   npm run prisma:migrate
   
   # Start development server
   npm run dev
   ```

2. **Full Production Setup**
   ```bash
   # Build and start all services
   docker-compose up -d
   
   # Run database migrations
   docker-compose exec app npx prisma migrate deploy
   ```

## 📁 Project Structure

```
priyo-chat/
├── src/
│   ├── middleware/          # Authentication & validation middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── routes/              # API route handlers
│   │   ├── auth.ts
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   └── upload.ts
│   ├── services/            # Business logic services
│   │   ├── database.ts
│   │   └── socket.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── validation.ts
│   └── index.ts             # Application entry point
├── prisma/
│   └── schema.prisma        # Database schema
├── uploads/                 # File upload directory
├── docker-compose.yml       # Production Docker setup
├── docker-compose.dev.yml   # Development Docker setup
├── Dockerfile              # Container configuration
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## 🗄️ Database Schema

### Users
- User authentication and profile information
- Online status tracking

### Conversations
- Direct and group conversations
- Participant management

### Messages
- Text, file, and image messages
- Read receipts and delivery status

### Refresh Tokens
- Secure token management for authentication

### Typing Indicators
- Real-time typing status

## 👥 Role-Based Access Control

The system supports three user roles with different permissions:

### User Roles
- **ADMIN**: Full system access, can perform all operations
- **AGENT**: Customer service representatives, can close conversations
- **CUSTOMER**: Regular users, standard chat functionality (default role)

### Role Permissions
| Feature | Customer | Agent | Admin |
|---------|----------|-------|-------|
| Register/Login | ✅ | ✅ | ✅ |
| Send Messages | ✅ | ✅ | ✅ |
| Create Conversations | ✅ | ✅ | ✅ |
| Close Conversations | ❌ | ✅ | ✅ |
| View All Conversations | Own only | Own only | ✅ |

### Role Assignment
- Default role for new users: `CUSTOMER`
- Role can be specified during registration
- Only admins should create agent accounts in production

## 🔐 Security Features

- **JWT Authentication**: Secure access and refresh token system
- **Role-Based Authorization**: Middleware for endpoint protection
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent API abuse
- **CORS Protection**: Configurable cross-origin requests
- **Helmet Security**: HTTP security headers
- **Input Validation**: Joi schema validation
- **File Upload Security**: Type and size restrictions

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
JWT_ACCESS_SECRET=your-production-access-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### Docker Production Deployment

```bash
# Build and deploy
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

## 📊 Health Monitoring

The application includes a health check endpoint:

```bash
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## 🧪 API Testing

### Authentication Flow
```bash
# Register as Customer (default)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"testuser","password":"password123"}'

# Register as Agent
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com","username":"agent1","password":"password123","role":"AGENT"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Close conversation (Agent/Admin only)
curl -X DELETE http://localhost:3000/api/conversations/conv-id \
  -H "Authorization: Bearer your-jwt-token"
```

### WebSocket Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-access-token'
  }
});

// Join conversation
socket.emit('conversation:join', 'conversation-id');

// Send message
socket.emit('message:send', {
  conversationId: 'conversation-id',
  content: 'Hello, World!',
  type: 'TEXT'
});

// Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

## 🔧 Development Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database exists

2. **JWT Token Issues**
   - Verify JWT secrets are set
   - Check token expiration times
   - Ensure proper token format in requests

3. **File Upload Problems**
   - Check uploads directory permissions
   - Verify MAX_FILE_SIZE setting
   - Ensure proper file types

4. **WebSocket Connection Issues**
   - Verify CORS settings
   - Check authentication token
   - Ensure Socket.IO client compatibility

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

---

**Happy Coding! 🎉**
# Trigger Render redeploy
