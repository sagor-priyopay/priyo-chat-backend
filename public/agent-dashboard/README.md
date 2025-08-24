# Priyo Agent Dashboard

A comprehensive web-based dashboard for managing customer support conversations, agents, and analytics in the Priyo Chat system.

## Features

### 🔐 Authentication & Authorization
- Secure JWT-based authentication
- Role-based access control (Admin/Agent)
- Session management with refresh tokens
- Auto-logout on token expiration

### 💬 Conversation Management
- Real-time conversation list with unread indicators
- Live chat interface with typing indicators
- Message history with pagination
- File attachment support
- Conversation status management (Pending/Active/Resolved)
- Quick actions (Resolve/Close conversations)

### 📊 Analytics & Performance
- Agent performance metrics (response time, resolution rate, customer ratings)
- Real-time system statistics
- Interactive charts and graphs
- Conversation volume trends
- Customer satisfaction analytics

### 👥 Agent Management (Admin Only)
- Create, edit, and delete agent accounts
- Agent status monitoring (Online/Offline)
- Performance tracking per agent
- Role assignment and permissions
- Export agent data to CSV

### 📈 Reports & Insights
- Generate custom reports (PDF/CSV/Excel)
- Date range filtering
- Agent performance reports
- System usage analytics
- Customer satisfaction reports

### ⚙️ System Settings
- Auto-assignment configuration
- Notification preferences
- Response time alerts
- System health monitoring

### 🔔 Real-time Notifications
- Desktop notifications for new messages
- In-app notification system
- Sound alerts (configurable)
- Unread message counters

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js for analytics visualization
- **Real-time**: WebSocket integration with Socket.IO
- **Authentication**: JWT tokens with refresh mechanism
- **Styling**: Custom CSS with responsive design
- **Icons**: Unicode emojis for cross-platform compatibility

## File Structure

```
agent-dashboard/
├── index.html              # Main agent dashboard
├── admin.html              # Admin dashboard
├── login.html              # Login page
├── config.js               # Configuration settings
├── api.js                  # API service layer
├── auth.js                 # Authentication manager
├── socket.js               # WebSocket manager
├── dashboard.js            # Main dashboard logic
├── admin.js                # Admin dashboard logic
├── login.js                # Login page logic
├── styles.css              # Global styles
├── dashboard.css           # Dashboard-specific styles
├── admin.css               # Admin dashboard styles
├── login.css               # Login page styles
├── package.json            # Dependencies
└── README.md               # This file
```

## Installation & Setup

### 1. Prerequisites
- Node.js (v14 or higher)
- Access to Priyo Chat backend API
- Modern web browser

### 2. Configuration
Edit `config.js` to match your backend settings:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-backend-url.com/api',
    SOCKET_URL: 'https://your-backend-url.com',
    // ... other settings
};
```

### 3. Install Dependencies (Optional)
```bash
cd agent-dashboard
npm install
```

### 4. Development Server
```bash
npm run dev
```
Dashboard will be available at `http://localhost:3001`

### 5. Production Deployment
```bash
npm run build
```
Deploy the files to your web server.

## Usage

### For Agents

1. **Login**: Access the dashboard at `/agent-dashboard/login.html`
2. **View Conversations**: See all active customer conversations
3. **Respond to Messages**: Click on a conversation to start responding
4. **Manage Status**: Mark conversations as resolved or closed
5. **View Analytics**: Check your performance metrics
6. **File Sharing**: Attach files to messages when needed

### For Admins

1. **System Overview**: Monitor overall system health and statistics
2. **Manage Agents**: Create, edit, and delete agent accounts
3. **View All Conversations**: Access to all customer interactions
4. **Generate Reports**: Create custom reports for analysis
5. **Configure Settings**: Adjust system-wide preferences
6. **Monitor Performance**: Track agent and system performance

## API Integration

The dashboard integrates with the following backend endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Get current user

### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation details
- `DELETE /api/conversations/:id` - Close conversation

### Messages
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages` - Send message
- `POST /api/messages/read` - Mark as read
- `GET /api/messages/unread/count` - Unread count

### User Management (Admin)
- `POST /api/auth/register` - Create user
- `GET /api/users` - List users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### File Upload
- `POST /api/upload` - Upload file

## WebSocket Events

### Listening Events
- `message` - New message received
- `messageDelivered` - Message delivery confirmation
- `messageRead` - Message read confirmation
- `typing` - User typing indicator
- `stopTyping` - Stop typing indicator
- `userOnline` - User came online
- `userOffline` - User went offline

### Emitting Events
- `joinConversation` - Join conversation room
- `leaveConversation` - Leave conversation room
- `typing` - Send typing indicator
- `stopTyping` - Stop typing indicator

## Security Features

- JWT token authentication
- Automatic token refresh
- Role-based access control
- XSS protection through content escaping
- Secure API communication
- Session timeout handling

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Optimizations

- Lazy loading of conversations
- Message pagination
- Efficient DOM updates
- WebSocket connection pooling
- Image optimization
- CSS/JS minification ready

## Troubleshooting

### Common Issues

1. **Login Issues**
   - Check API_BASE_URL in config.js
   - Verify backend is running
   - Check browser console for errors

2. **WebSocket Connection Issues**
   - Verify SOCKET_URL in config.js
   - Check firewall settings
   - Ensure WebSocket support in browser

3. **Messages Not Loading**
   - Check authentication status
   - Verify API endpoints are accessible
   - Check network connectivity

### Debug Mode
Add `?debug=true` to URL for additional console logging.

## Contributing

1. Follow the existing code style
2. Add comments for complex logic
3. Test on multiple browsers
4. Update documentation for new features

## License

This project is part of the Priyo Chat system. All rights reserved.

## Support

For technical support or questions:
- Check the troubleshooting section
- Review browser console for errors
- Contact your system administrator
