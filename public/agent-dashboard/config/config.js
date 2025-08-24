/**
 * Priyo Chat Agent Dashboard Configuration
 * Production-ready configuration for the agent dashboard
 */

const CONFIG = {
    // Backend API Configuration
    API_BASE_URL: 'https://priyo-chat-64wg.onrender.com',
    SOCKET_URL: 'https://priyo-chat-64wg.onrender.com',
    
    // Authentication Settings
    AUTH: {
        TOKEN_STORAGE_KEY: 'priyo_agent_token',
        REFRESH_TOKEN_KEY: 'priyo_agent_refresh',
        USER_DATA_KEY: 'priyo_agent_user',
        SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
        REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh 5 minutes before expiry
    },
    
    // Dashboard Settings
    DASHBOARD: {
        TICKETS_PER_PAGE: 20,
        MESSAGES_PER_PAGE: 50,
        AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
        TYPING_TIMEOUT: 3000, // 3 seconds
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    },
    
    // Notification Settings
    NOTIFICATIONS: {
        ENABLED: true,
        SOUND_ENABLED: true,
        DESKTOP_ENABLED: true,
        SOUND_FILE: './assets/sounds/notification.mp3',
        SHOW_DURATION: 5000, // 5 seconds
    },
    
    // Performance Settings
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300, // 300ms
        CACHE_TTL: 5 * 60 * 1000, // 5 minutes
        MAX_CACHED_ITEMS: 100,
        LAZY_LOAD_THRESHOLD: 100, // pixels
    },
    
    // UI Settings
    UI: {
        THEME: 'light', // 'light' or 'dark'
        SIDEBAR_COLLAPSED: false,
        SHOW_AVATARS: true,
        COMPACT_MODE: false,
        ANIMATION_DURATION: 300, // milliseconds
    },
    
    // Status Definitions
    TICKET_STATUS: {
        PENDING: { label: 'Pending', color: '#f59e0b', icon: 'clock' },
        IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', icon: 'play' },
        SOLVED: { label: 'Solved', color: '#10b981', icon: 'check' },
        CLOSED: { label: 'Closed', color: '#6b7280', icon: 'x' }
    },
    
    // Priority Levels
    PRIORITY_LEVELS: {
        LOW: { label: 'Low', color: '#10b981', value: 1 },
        MEDIUM: { label: 'Medium', color: '#f59e0b', value: 2 },
        HIGH: { label: 'High', color: '#ef4444', value: 3 },
        URGENT: { label: 'Urgent', color: '#dc2626', value: 4 }
    },
    
    // Error Messages
    ERRORS: {
        NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
        AUTH_FAILED: 'Authentication failed. Please login again.',
        PERMISSION_DENIED: 'You do not have permission to perform this action.',
        SERVER_ERROR: 'Server error occurred. Please try again later.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
        INVALID_FILE_TYPE: 'File type is not supported.',
    },
    
    // Success Messages
    SUCCESS: {
        LOGIN: 'Successfully logged in!',
        LOGOUT: 'Successfully logged out!',
        MESSAGE_SENT: 'Message sent successfully!',
        STATUS_UPDATED: 'Ticket status updated!',
        PROFILE_UPDATED: 'Profile updated successfully!',
        FILE_UPLOADED: 'File uploaded successfully!',
    },
    
    // API Endpoints
    ENDPOINTS: {
        // Authentication
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh',
        ME: '/api/auth/me',
        
        // Conversations/Tickets
        CONVERSATIONS: '/api/conversations',
        CONVERSATION_DETAIL: '/api/conversations/{id}',
        
        // Messages
        MESSAGES: '/api/messages/{conversationId}',
        SEND_MESSAGE: '/api/messages',
        MARK_READ: '/api/messages/read',
        UNREAD_COUNT: '/api/messages/unread/count',
        
        // File Upload
        UPLOAD: '/api/upload',
        
        // Admin endpoints (for admin users)
        USERS: '/api/users',
        ANALYTICS: '/api/analytics',
        ACTIVITY_LOGS: '/api/logs',
    },
    
    // WebSocket Events
    SOCKET_EVENTS: {
        // Incoming events
        MESSAGE_NEW: 'message:new',
        MESSAGE_DELIVERED: 'message:delivered',
        MESSAGE_READ: 'message:read',
        TYPING_START: 'typing:start',
        TYPING_STOP: 'typing:stop',
        USER_STATUS: 'user:status',
        
        // Outgoing events
        JOIN_CONVERSATION: 'conversation:join',
        LEAVE_CONVERSATION: 'conversation:leave',
        SEND_MESSAGE: 'message:send',
        START_TYPING: 'typing:start',
        STOP_TYPING: 'typing:stop',
        READ_MESSAGE: 'message:read',
    },
    
    // Development Settings
    DEBUG: false, // Set to true for development
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    
    // Feature Flags
    FEATURES: {
        DARK_MODE: true,
        EXPORT_REPORTS: true,
        BULK_ACTIONS: true,
        ADVANCED_SEARCH: true,
        EMOJI_PICKER: true,
        FILE_PREVIEW: true,
        VOICE_MESSAGES: false, // Future feature
        VIDEO_CALLS: false, // Future feature
    }
};

// Environment-specific overrides
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_BASE_URL = 'http://localhost:3000';
    CONFIG.SOCKET_URL = 'http://localhost:3000';
    CONFIG.DEBUG = true;
    CONFIG.LOG_LEVEL = 'debug';
}

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Global access
window.CONFIG = CONFIG;
