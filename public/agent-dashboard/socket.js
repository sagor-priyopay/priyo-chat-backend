// WebSocket Manager for Real-time Communication
class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
        this.messageQueue = [];
    }

    connect() {
        if (this.socket && this.isConnected) {
            return;
        }

        try {
            // Load Socket.IO from CDN if not already loaded
            if (typeof io === 'undefined') {
                this.loadSocketIO().then(() => this.initializeSocket());
            } else {
                this.initializeSocket();
            }
        } catch (error) {
            console.error('Socket connection error:', error);
            this.scheduleReconnect();
        }
    }

    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initializeSocket() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.warn('No access token found for socket connection');
            return;
        }

        this.socket = io(CONFIG.SOCKET_URL, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling']
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Process queued messages
            this.processMessageQueue();
            
            // Emit custom event
            this.emit('socketConnected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.isConnected = false;
            this.emit('socketDisconnected', { reason });
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                this.scheduleReconnect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.isConnected = false;
            this.scheduleReconnect();
        });

        // Message events
        this.socket.on('message', (data) => {
            console.log('New message received:', data);
            this.emit('newMessage', data);
            this.showNotification(`New message from ${data.senderUsername}`, data.content);
        });

        this.socket.on('messageDelivered', (data) => {
            this.emit('messageDelivered', data);
        });

        this.socket.on('messageRead', (data) => {
            this.emit('messageRead', data);
        });

        // Typing indicators
        this.socket.on('typing', (data) => {
            this.emit('userTyping', data);
        });

        this.socket.on('stopTyping', (data) => {
            this.emit('userStoppedTyping', data);
        });

        // User status events
        this.socket.on('userOnline', (data) => {
            this.emit('userOnline', data);
        });

        this.socket.on('userOffline', (data) => {
            this.emit('userOffline', data);
        });

        // Conversation events
        this.socket.on('conversationUpdated', (data) => {
            this.emit('conversationUpdated', data);
        });

        this.socket.on('conversationClosed', (data) => {
            this.emit('conversationClosed', data);
        });
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }

    // Event handling
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Socket actions
    joinConversation(conversationId) {
        this.sendMessage('joinConversation', { conversationId });
    }

    leaveConversation(conversationId) {
        this.sendMessage('leaveConversation', { conversationId });
    }

    sendTyping(conversationId) {
        this.sendMessage('typing', { conversationId });
    }

    sendStopTyping(conversationId) {
        this.sendMessage('stopTyping', { conversationId });
    }

    sendMessage(event, data) {
        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
        } else {
            // Queue message for when connection is restored
            this.messageQueue.push({ event, data });
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const { event, data } = this.messageQueue.shift();
            this.socket.emit(event, data);
        }
    }

    showNotification(title, body) {
        // Check if notifications are supported and permitted
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: '/agent-dashboard/assets/notification-icon.png',
                    tag: 'priyo-chat'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, {
                            body: body,
                            icon: '/agent-dashboard/assets/notification-icon.png',
                            tag: 'priyo-chat'
                        });
                    }
                });
            }
        }

        // Also show in-app notification
        this.showInAppNotification(title, body);
    }

    showInAppNotification(title, body) {
        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        notification.innerHTML = `
            <div class="notification-header">${title}</div>
            <div class="notification-body">${body}</div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after timeout
        setTimeout(() => {
            notification.remove();
        }, CONFIG.NOTIFICATION_TIMEOUT);

        // Manual close
        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
    }
}

// Create global socket manager instance
const socketManager = new SocketManager();
