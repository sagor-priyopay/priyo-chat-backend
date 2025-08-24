// Configuration for Agent Dashboard
const CONFIG = {
    // Backend API Configuration
    API_BASE_URL: 'https://priyo-chat-64wg.onrender.com/api',
    SOCKET_URL: 'https://priyo-chat-64wg.onrender.com',
    
    // Local development (uncomment for local testing)
    // API_BASE_URL: 'http://localhost:3000/api',
    // SOCKET_URL: 'http://localhost:3000',
    
    // Dashboard Configuration
    DASHBOARD_TITLE: 'Priyo Agent Dashboard',
    REFRESH_INTERVAL: 30000, // 30 seconds
    NOTIFICATION_TIMEOUT: 5000, // 5 seconds
    
    // Pagination
    MESSAGES_PER_PAGE: 50,
    CONVERSATIONS_PER_PAGE: 20,
    
    // Performance Metrics
    METRICS_REFRESH_INTERVAL: 60000, // 1 minute
    
    // Role-based features
    ROLES: {
        ADMIN: 'ADMIN',
        AGENT: 'AGENT',
        CUSTOMER: 'CUSTOMER'
    },
    
    // Message types
    MESSAGE_TYPES: {
        TEXT: 'TEXT',
        FILE: 'FILE',
        IMAGE: 'IMAGE'
    },
    
    // Conversation statuses
    CONVERSATION_STATUS: {
        PENDING: 'PENDING',
        IN_PROGRESS: 'IN_PROGRESS',
        RESOLVED: 'RESOLVED',
        CLOSED: 'CLOSED'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
