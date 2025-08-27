class PriyoChatDashboard {
    constructor() {
        this.socket = null;
        this.currentConversation = null;
        this.conversations = [];
        this.currentUser = null;
        this.currentView = 'inbox';
        this.currentFilter = 'all';
        this.agentStatus = 'online';
        this.baseURL = 'https://priyo-chat-64wg.onrender.com';
        
        this.init();
    }

    async init() {
        await this.loadUserInfo();
        this.setupEventListeners();
        this.connectSocket();
        this.loadConversations();
    }

    async loadUserInfo() {
        try {
            const token = localStorage.getItem('priyo_auth_token');
            if (!token) {
                this.redirectToLogin();
                return;
            }

            const response = await fetch(`${this.baseURL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const user = data.user || data; // Handle both response formats
                if (user.role === 'AGENT' || user.role === 'ADMIN') {
                    this.currentUser = {
                        id: user.id,
                        name: user.username,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar
                    };
                    this.updateUserUI();
                } else {
                    console.error('Access denied: Not an agent or admin');
                    this.redirectToLogin();
                }
            } else {
                console.error('Authentication failed:', response.status, response.statusText);
                // Don't immediately logout on server errors (5xx), only on auth errors (401, 403)
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('priyo_auth_token');
                    localStorage.removeItem('priyo_refresh_token');
                    localStorage.removeItem('priyo_user');
                    this.redirectToLogin();
                } else {
                    // Server error - try to continue with cached user data
                    const cachedUser = localStorage.getItem('priyo_user');
                    if (cachedUser) {
                        try {
                            const user = JSON.parse(cachedUser);
                            if (user.role === 'AGENT' || user.role === 'ADMIN') {
                                this.currentUser = {
                                    id: user.id,
                                    name: user.username,
                                    email: user.email,
                                    role: user.role,
                                    avatar: user.avatar
                                };
                                this.updateUserUI();
                                console.warn('Using cached user data due to server error');
                                return;
                            }
                        } catch (e) {
                            console.error('Invalid cached user data');
                        }
                    }
                    this.redirectToLogin();
                }
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = '/agent-dashboard/login.html';
    }

    updateUserUI() {
        document.getElementById('userName').textContent = this.currentUser.name;
        const avatar = document.getElementById('userAvatar');
        if (this.currentUser.avatar) {
            avatar.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderConversations();
            });
        });

        // Status toggle
        document.getElementById('statusToggle').addEventListener('click', () => {
            this.toggleAgentStatus();
        });

        // User menu
        document.getElementById('userMenu').addEventListener('click', () => {
            this.toggleUserMenu();
        });
    }

    switchView(view) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        const titles = {
            inbox: 'Inbox',
            chats: 'Live Chats',
            tickets: 'Support Tickets',
            reports: 'Reports',
            settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[view];

        this.currentView = view;
        this.loadConversations();
    }

    connectSocket() {
        this.socket = io(this.baseURL, {
            auth: {
                userId: this.currentUser.id,
                role: 'agent',
                token: localStorage.getItem('priyo_auth_token')
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('new-message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('conversation-updated', (data) => {
            this.updateConversationInList(data);
        });

        this.socket.on('conversation-assigned', (data) => {
            this.handleConversationAssigned(data);
        });

        this.socket.on('conversation-resolved', (data) => {
            this.handleConversationResolved(data);
        });
    }

    async loadConversations() {
        try {
            const token = localStorage.getItem('priyo_auth_token');
            if (!token) {
                console.error('No auth token found');
                this.redirectToLogin();
                return;
            }

            const response = await fetch(`${this.baseURL}/api/agent-dashboard/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.conversations = data.conversations || [];
                console.log(`Loaded ${this.conversations.length} conversations`);
            } else if (response.status === 401 || response.status === 403) {
                console.error('Authentication failed, redirecting to login');
                this.redirectToLogin();
                return;
            } else {
                console.error('Failed to load conversations:', response.status);
                // Fallback to empty array
                this.conversations = [];
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.conversations = [];
        }
    }

    renderConversations() {
        const container = document.getElementById('inboxList');
        
        let filteredConversations = this.conversations;

        if (this.currentView === 'chats') {
            filteredConversations = filteredConversations.filter(c => c.type === 'chat');
        } else if (this.currentView === 'tickets') {
            filteredConversations = filteredConversations.filter(c => c.type === 'ticket');
        }

        if (this.currentFilter === 'unread') {
            filteredConversations = filteredConversations.filter(c => c.unread);
        }

        if (filteredConversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color: #9ca3af; margin-bottom: 16px;">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3 style="font-size: 16px; margin-bottom: 8px; color: #374151;">No conversations found</h3>
                    <p style="font-size: 14px; color: #6b7280;">New conversations will appear here when customers start chatting</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredConversations.map(conv => {
            // Handle different conversation data structures
            const customerName = conv.customer?.name || 
                               conv.participants?.find(p => p.user?.role === 'USER')?.user?.username || 
                               'Unknown Customer';
            
            const lastMessageText = conv.lastMessage?.text || 
                                  conv.lastMessage?.content || 
                                  conv.messages?.[conv.messages.length - 1]?.content || 
                                  'No messages yet';
            
            const lastMessageTime = conv.lastMessage?.timestamp || 
                                  conv.lastMessage?.createdAt || 
                                  conv.messages?.[conv.messages.length - 1]?.createdAt || 
                                  conv.updatedAt || 
                                  conv.createdAt;
            
            const displayText = conv.type === 'ticket' ? (conv.subject || lastMessageText) : lastMessageText;
            const conversationType = conv.type || 'chat';
            const conversationStatus = conv.status?.toLowerCase() || 'open';
            const isUnread = conv.unread || false;
            
            return `
                <div class="inbox-item ${isUnread ? 'unread' : ''}" data-id="${conv.id}">
                    <div class="inbox-item-header">
                        <div class="customer-name">${this.escapeHtml(customerName)}</div>
                        <div class="inbox-time">${this.formatTime(lastMessageTime)}</div>
                    </div>
                    <div class="inbox-preview">${this.escapeHtml(displayText)}</div>
                    <div class="inbox-meta">
                        <div style="display: flex; gap: 4px;">
                            <span class="inbox-type type-${conversationType}">${conversationType}</span>
                            <span class="inbox-status status-${conversationStatus}">${conversationStatus}</span>
                        </div>
                        ${isUnread ? '<div class="unread-dot"></div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.inbox-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.inbox-item').forEach(item => {
                    item.classList.remove('active');
                });
                document.querySelector(`[data-id="${item.dataset.id}"]`).classList.add('active');

                this.currentConversation = this.conversations.find(c => c.id === item.dataset.id);
                this.renderConversationView();
            });
        });
    }

    renderConversationView() {
        if (!this.currentConversation) return;

        const container = document.getElementById('conversationView');
        const isTicket = this.currentConversation.type === 'ticket';
        
        container.innerHTML = `
            <div class="conversation-header">
                <div class="conversation-info">
                    <div class="conversation-avatar">${this.currentConversation.customer.name.charAt(0).toUpperCase()}</div>
                    <div class="conversation-details">
                        <h3>${this.currentConversation.customer.name}</h3>
                        <p>${this.currentConversation.customer.email}${isTicket ? ` • ${this.currentConversation.subject}` : ''}</p>
                    </div>
                </div>
                <div class="conversation-actions">
                    <button class="action-btn primary">Resolve</button>
                    <button class="action-btn">Transfer</button>
                </div>
            </div>
            <div class="messages-container" id="messagesContainer">
                <div class="message customer">
                    <div class="message-avatar customer">${this.currentConversation.customer.name.charAt(0).toUpperCase()}</div>
                    <div class="message-content">
                        <div class="message-bubble">${this.currentConversation.lastMessage.text}</div>
                        <div class="message-time">${this.formatTime(this.currentConversation.lastMessage.timestamp)}</div>
                    </div>
                </div>
            </div>
            <div class="message-input-container">
                <div class="message-input-wrapper">
                    <textarea class="message-input" placeholder="Type your message..." id="messageInput"></textarea>
                    <button class="send-btn" id="sendBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        this.setupConversationListeners();
    }

    setupConversationListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');

        if (sendBtn && messageInput) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });

            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !this.currentConversation) return;

        input.value = '';
        
        try {
            const response = await fetch(`${this.baseURL}/api/agent-dashboard/conversations/${this.currentConversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('priyo_auth_token') || 'demo-token'}`
                },
                body: JSON.stringify({
                    text: text,
                    type: 'TEXT'
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.addMessageToUI(data.data);
            } else {
                console.error('Failed to send message:', response.status);
                // Add to UI anyway for demo
                const message = {
                    text: text,
                    sender: 'agent',
                    timestamp: new Date()
                };
                this.addMessageToUI(message);
            }
        } catch (error) {
            console.error('Send message error:', error);
            // Add to UI anyway for demo
            const message = {
                text: text,
                sender: 'agent',
                timestamp: new Date()
            };
            this.addMessageToUI(message);
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender}`;
        messageElement.innerHTML = `
            <div class="message-avatar ${message.sender}">${message.sender === 'agent' ? 'A' : 'C'}</div>
            <div class="message-content">
                <div class="message-bubble">${this.escapeHtml(message.text)}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    handleNewMessage(message) {
        // Update conversation in list
        const conversation = this.conversations.find(c => c.id === message.conversationId);
        if (conversation) {
            conversation.lastMessage = {
                text: message.text,
                timestamp: new Date(message.timestamp),
                sender: message.sender
            };
            conversation.updatedAt = new Date(message.timestamp);
            if (message.sender === 'customer') {
                conversation.unread = true;
            }
        }

        // If this is the current conversation, add to UI
        if (this.currentConversation && this.currentConversation.id === message.conversationId) {
            // Re-render messages will be handled by the handleNewMessage method above
        }
    }

    updateConversationInList(data) {
        const conversation = this.conversations.find(c => c.id === data.conversationId);
        if (conversation) {
            Object.assign(conversation, data);
            this.renderConversations();
        }
    }

    handleConversationAssigned(data) {
        const conversation = this.conversations.find(c => c.id === data.conversationId);
        if (conversation) {
            conversation.assignedTo = data.assignedTo;
            conversation.assignedAgent = data.assignedAgent;
            this.renderConversations();
        }
    }

    handleConversationResolved(data) {
        const conversation = this.conversations.find(c => c.id === data.conversationId);
        if (conversation) {
            conversation.status = data.status;
            this.renderConversations();
            if (this.currentConversation && this.currentConversation.id === data.conversationId) {
                this.renderConversationView();
            }
        }
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio notification not supported');
        }
    }

    toggleAgentStatus() {
        const statuses = ['online', 'away', 'offline'];
        const currentIndex = statuses.indexOf(this.agentStatus);
        const nextIndex = (currentIndex + 1) % statuses.length;
        this.agentStatus = statuses[nextIndex];

        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');

        indicator.className = `status-indicator ${this.agentStatus === 'online' ? '' : this.agentStatus}`;
        text.textContent = this.agentStatus.charAt(0).toUpperCase() + this.agentStatus.slice(1);
    }

    updateBadges() {
        const unreadCount = this.conversations.filter(c => c.unread).length;
        const chatCount = this.conversations.filter(c => c.type === 'chat' && c.unread).length;
        const ticketCount = this.conversations.filter(c => c.type === 'ticket' && c.unread).length;

        document.getElementById('inboxBadge').textContent = unreadCount;
        document.getElementById('chatsBadge').textContent = chatCount;
        document.getElementById('ticketsBadge').textContent = ticketCount;
    }

    toggleUserMenu() {
        // Remove existing dropdown if present
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 60px;
            right: 20px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            min-width: 200px;
            z-index: 1000;
        `;

        dropdown.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                <div style="font-weight: 600; color: #2d3748;">${this.currentUser.name}</div>
                <div style="font-size: 12px; color: #718096;">${this.currentUser.email}</div>
            </div>
            <div style="padding: 8px 0;">
                <button class="dropdown-item" id="profileBtn" style="width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #4a5568;" onmouseover="this.style.backgroundColor='#f7fafc'" onmouseout="this.style.backgroundColor='transparent'">
                    Profile Settings
                </button>
                <button class="dropdown-item" id="logoutBtn" style="width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #e53e3e;" onmouseover="this.style.backgroundColor='#fed7d7'" onmouseout="this.style.backgroundColor='transparent'">
                    Sign Out
                </button>
            </div>
        `;

        document.body.appendChild(dropdown);

        // Add event listeners
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('profileBtn').addEventListener('click', () => {
            dropdown.remove();
            // Placeholder for profile settings
            alert('Profile settings coming soon!');
        });

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target.id !== 'userMenu') {
                    dropdown.remove();
                }
            }, { once: true });
        }, 100);
    }

    async logout() {
        try {
            const token = localStorage.getItem('priyo_auth_token');
            if (token) {
                // Call logout API
                await fetch(`${this.baseURL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear all auth data
            localStorage.removeItem('priyo_auth_token');
            localStorage.removeItem('priyo_refresh_token');
            localStorage.removeItem('priyo_user');
            
            // Disconnect socket
            if (this.socket) {
                this.socket.disconnect();
            }
            
            // Redirect to login
            window.location.href = '/agent-dashboard/login.html';
        }
    }

    formatTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'now';
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new PriyoChatDashboard();
});
