# Priyo Chat Widget Integration Guide

This guide explains how to integrate the Priyo Chatbot Widget with your backend API and WebSocket system.

## 🚀 Quick Start

### 1. Basic Integration

Add this single line to your HTML page:

```html
<script src="http://localhost:3000/widget/embed-integrated.js"></script>
```

That's it! The widget will automatically load with full backend integration.

### 2. Custom Configuration

For custom configuration, set the config before loading the script:

```html
<script>
window.PRIYO_WIDGET_CONFIG = {
  apiBaseUrl: 'https://your-api.com/api',
  socketUrl: 'https://your-api.com',
  cssUrl: 'https://your-cdn.com/widget/styles.css',
  scriptUrl: 'https://your-cdn.com/widget/priyo-widget-integrated.js'
};
</script>
<script src="https://your-cdn.com/widget/embed-integrated.js"></script>
```

## 📋 Features

### ✅ Backend Integration Features
- **Real-time messaging** via WebSocket
- **User authentication** with JWT tokens
- **Conversation persistence** across sessions
- **Agent notifications** for new messages
- **Typing indicators** between users and agents
- **Role-based access control** (Customer, Agent, Admin)
- **Message history** loading
- **Auto-reconnection** on network issues

### ✅ Widget Features
- **Responsive design** for all screen sizes
- **Accessibility support** (ARIA labels, keyboard navigation)
- **Sound notifications** for new messages
- **Desktop notifications** when widget is closed
- **Help center integration**
- **Modern UI** with smooth animations

## 🔧 API Endpoints

The widget uses these backend endpoints:

### Authentication
```
POST /api/widget/auth
```
Authenticates widget users and returns JWT token.

### Conversation Management
```
POST /api/widget/conversation
GET /api/widget/conversation/:id/messages
```
Creates/retrieves conversations and messages.

### Messaging
```
POST /api/widget/message
```
Sends messages through the widget.

## 🔌 WebSocket Events

### Widget → Server
- `conversation:join` - Join a conversation room
- `conversation:leave` - Leave a conversation room  
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

### Server → Widget
- `message:new` - New message received
- `typing:start` - Someone started typing
- `typing:stop` - Someone stopped typing
- `user:status` - User online/offline status

## 🎛️ JavaScript API

The widget exposes a global `PriyoWidget` object:

```javascript
// Open widget programmatically
PriyoWidget.open();

// Close widget
PriyoWidget.close();

// Set visitor information
PriyoWidget.setVisitorInfo('user@example.com', 'John Doe');

// Configure widget
PriyoWidget.configure({
  apiBaseUrl: 'https://your-api.com/api'
});

// Listen for widget ready event
window.addEventListener('priyoWidgetReady', (event) => {
  console.log('Widget ready:', event.detail.widget);
});
```

## 🔐 Security

### JWT Authentication
- Widget users get 24-hour JWT tokens
- Tokens include `isWidget: true` flag for identification
- Visitor IDs are persistent across sessions

### CORS Configuration
Update your backend CORS settings to allow widget domains:

```typescript
// In your Express app
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-website.com',
    // Add your domains here
  ],
  credentials: true
}));
```

## 📱 Responsive Design

The widget automatically adapts to different screen sizes:

- **Desktop**: 380px × 500px floating widget
- **Tablet**: Full-width with margins
- **Mobile**: Full-screen overlay

## ♿ Accessibility

The widget includes comprehensive accessibility features:

- **ARIA labels** for all interactive elements
- **Keyboard navigation** support
- **Screen reader** compatibility
- **High contrast** mode support
- **Reduced motion** respect

## 🎨 Customization

### CSS Variables
Override these CSS variables to customize the appearance:

```css
:root {
  --priyo-primary-color: #E60023;
  --priyo-secondary-color: #FF4458;
  --priyo-text-color: #333;
  --priyo-background-color: #fff;
  --priyo-border-radius: 16px;
}
```

### Custom Styling
The widget uses these main CSS classes:

- `.priyo-chat-widget-container` - Main container
- `.chat-bubble` - Floating chat button
- `.chat-widget` - Widget panel
- `.message.user` - User messages
- `.message.bot` - Bot/agent messages

## 🚀 Deployment

### 1. Static File Serving
Ensure your backend serves the widget files:

```typescript
// In your Express app
app.use('/widget', express.static(path.join(__dirname, '../public/widget')));
```

### 2. Environment Variables
Set these environment variables:

```bash
CORS_ORIGIN=https://your-website.com
JWT_ACCESS_SECRET=your-jwt-secret
```

### 3. Database Migration
Run Prisma migrations to add widget support:

```bash
npx prisma migrate dev
```

## 🧪 Testing

### Local Testing
1. Start your backend server:
```bash
npm run dev
```

2. Create a test HTML file:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Widget Test</title>
</head>
<body>
    <h1>Test Page</h1>
    <script src="http://localhost:3000/widget/embed-integrated.js"></script>
</body>
</html>
```

3. Open the HTML file in your browser

### Production Testing
1. Update the script URL to your production domain
2. Test on different devices and browsers
3. Verify WebSocket connections work
4. Test message delivery and notifications

## 🐛 Troubleshooting

### Common Issues

**Widget doesn't load:**
- Check console for CORS errors
- Verify script URLs are accessible
- Ensure backend is running

**Messages not sending:**
- Check network tab for API errors
- Verify JWT token is valid
- Check WebSocket connection status

**WebSocket connection fails:**
- Verify Socket.IO server is running
- Check firewall/proxy settings
- Ensure CORS allows WebSocket upgrades

### Debug Mode
Enable debug logging:

```javascript
localStorage.setItem('priyo_widget_debug', 'true');
```

## 📊 Analytics

Track widget usage with custom events:

```javascript
window.addEventListener('priyoWidgetReady', () => {
  // Track widget load
  gtag('event', 'widget_loaded');
});

// Track when users open the widget
PriyoWidget.onOpen = () => {
  gtag('event', 'widget_opened');
};
```

## 🔄 Updates

To update the widget:

1. Update the widget files in `/public/widget/`
2. Clear browser cache or use versioned URLs
3. Test thoroughly before deploying

## 📞 Support

For integration support:
- Check the console for error messages
- Review the network tab for failed requests
- Verify your backend API endpoints are working
- Test WebSocket connectivity

## 📄 File Structure

```
public/widget/
├── embed-integrated.js     # Main embed script
├── priyo-widget-integrated.js  # Widget functionality
└── styles.css             # Widget styles

src/routes/
└── widget.ts              # Backend API routes

src/services/
└── socket.ts              # WebSocket integration
```

This integration provides a complete real-time chat solution with your existing Priyo Chat backend!
