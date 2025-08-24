# Priyo Chat Agent Dashboard

A production-ready web-based Agent Dashboard for managing customer support tickets and conversations in real-time.

## Features

### 🔐 Authentication & Security
- Role-based access control (Admin vs Agent)
- Secure JWT-based authentication
- Session management with automatic refresh
- CSRF protection and input sanitization

### 🎫 Ticket Management
- Real-time ticket list with status filters
- Conversation history with full context
- Direct reply functionality
- Status management (Pending, In-Progress, Solved)
- Ticket assignment and reassignment

### 📊 Performance Analytics
- **Agent Dashboard**: Personal metrics (response time, resolution time, solved issues)
- **Admin Dashboard**: Team overview and performance comparisons
- Exportable reports (CSV/PDF)
- Real-time statistics updates

### 🔔 Notifications & Alerts
- Real-time new message notifications
- Desktop notifications for urgent tickets
- Sound alerts for incoming messages
- Overdue ticket warnings

### 📝 Activity Logging
- Complete audit trail of all actions
- Login/logout tracking
- Message reply logging
- Status change history

## Architecture

### Frontend Structure
```
public/agent-dashboard/
├── index.html              # Login page
├── dashboard/
│   ├── agent.html          # Agent dashboard
│   ├── admin.html          # Admin dashboard
│   └── ticket.html         # Ticket detail view
├── assets/
│   ├── css/
│   │   ├── main.css        # Core styles
│   │   ├── dashboard.css   # Dashboard-specific styles
│   │   └── components.css  # Reusable components
│   ├── js/
│   │   ├── auth.js         # Authentication logic
│   │   ├── api.js          # Backend API integration
│   │   ├── dashboard.js    # Dashboard functionality
│   │   ├── tickets.js      # Ticket management
│   │   ├── notifications.js # Real-time notifications
│   │   └── utils.js        # Utility functions
│   └── images/             # Static assets
└── config/
    └── config.js           # Configuration settings
```

### Backend Integration
- **Authentication**: `/api/auth/*`
- **Conversations**: `/api/conversations/*`
- **Messages**: `/api/messages/*`
- **File Upload**: `/api/upload/*`
- **WebSocket**: Real-time updates via Socket.IO

## User Roles & Permissions

### Agent Role
- ✅ View assigned tickets
- ✅ Reply to customer messages
- ✅ Update ticket status
- ✅ View personal performance metrics
- ❌ Create/delete other agents
- ❌ View all tickets
- ❌ Access admin features

### Admin Role
- ✅ All Agent permissions
- ✅ Create, edit, delete agent accounts
- ✅ View all tickets and conversations
- ✅ Assign/reassign tickets
- ✅ Access team performance analytics
- ✅ Export reports
- ✅ View activity logs

## Quick Start

1. **Access the Dashboard**
   ```
   https://your-backend-url.com/agent-dashboard/
   ```

2. **Login Credentials**
   - Use existing AGENT or ADMIN accounts from the backend
   - Default admin: Create via backend registration with role: "ADMIN"

3. **Development Setup**
   ```bash
   cd public/agent-dashboard
   npm install
   npm run dev
   ```

## Configuration

Edit `config/config.js` to match your backend deployment:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-backend-url.com',
    SOCKET_URL: 'https://your-backend-url.com',
    // ... other settings
};
```

## Security Features

- JWT token validation with automatic refresh
- Role-based route protection
- XSS prevention through input sanitization
- CSRF token validation
- Secure session management
- Activity logging and audit trails

## Performance Optimizations

- Lazy loading of ticket data
- Pagination for large datasets
- WebSocket connection pooling
- Local caching with cache invalidation
- Debounced search and filters
- Optimized DOM updates

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### Common Issues

1. **Login Failed**
   - Verify backend is running
   - Check API_BASE_URL in config
   - Ensure user has AGENT or ADMIN role

2. **Real-time Updates Not Working**
   - Check WebSocket connection
   - Verify SOCKET_URL configuration
   - Check browser console for errors

3. **Performance Issues**
   - Clear browser cache
   - Check network connection
   - Verify backend performance

## Support

For technical support, please check:
1. Browser console for JavaScript errors
2. Network tab for API call failures
3. Backend logs for server-side issues

## License

MIT License - See LICENSE file for details
