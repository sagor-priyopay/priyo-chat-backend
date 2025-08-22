class AgentDashboard {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.activeConversationId = null;
        this.conversations = new Map();
        this.isTyping = false;
        this.typingTimeout = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Status change
        document.getElementById('statusSelect').addEventListener('change', (e) => {
            this.updateAgentStatus(e.target.value);
        });

        // Conversation filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterConversations(e.target.dataset.filter);
            });
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', (e) => {
            this.handleTyping();
            this.toggleSendButton();
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send message button
        document.getElementById('sendMessageBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Customer info panel
        document.getElementById('conversationInfoBtn').addEventListener('click', () => {
            this.toggleCustomerInfoPanel();
        });

        document.getElementById('closePanelBtn').addEventListener('click', () => {
            this.hideCustomerInfoPanel();
        });

        // Close conversation
        document.getElementById('closeConversationBtn').addEventListener('click', () => {
            this.closeConversation();
        });

        // File upload
        document.getElementById('attachFileBtn').addEventListener('click', () => {
            this.showFileUploadModal();
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });
    }

    checkAuthStatus() {
        const token = localStorage.getItem('agentToken');
        const user = localStorage.getItem('agentUser');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.showDashboard();
            this.connectWebSocket();
        } else {
            this.showLogin();
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Check if user is an agent or admin
                if (data.user.role !== 'AGENT' && data.user.role !== 'ADMIN') {
                    errorDiv.textContent = 'Access denied. Agent account required.';
                    errorDiv.style.display = 'block';
                    return;
                }

                // Store auth data
                localStorage.setItem('agentToken', data.accessToken);
                localStorage.setItem('agentUser', JSON.stringify(data.user));
                
                this.currentUser = data.user;
                this.showDashboard();
                this.connectWebSocket();
            } else {
                errorDiv.textContent = data.message || 'Login failed';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.style.display = 'block';
        }
    }

    handleLogout() {
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        
        // Update agent info
        document.getElementById('agentName').textContent = this.currentUser.username;
        
        // Load conversations
        this.loadConversations();
    }

    connectWebSocket() {
        const token = localStorage.getItem('agentToken');
        
        this.socket = io({
            auth: {
                token: token
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            this.updateConnectionStatus(false);
        });

        // Listen for new messages
        this.socket.on('message:new', (data) => {
            this.handleNewMessage(data);
        });

        // Listen for typing indicators
        this.socket.on('typing:start', (data) => {
            this.showTypingIndicator(data);
        });

        this.socket.on('typing:stop', (data) => {
            this.hideTypingIndicator(data);
        });

        // Listen for user status changes
        this.socket.on('user:status', (data) => {
            this.updateUserStatus(data);
        });

        // Listen for conversation updates
        this.socket.on('conversation:updated', (data) => {
            this.updateConversation(data);
        });
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusSelect = document.getElementById('statusSelect');
        
        if (connected) {
            statusIndicator.className = 'status-indicator online';
            statusSelect.disabled = false;
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusSelect.disabled = true;
        }
    }

    async loadConversations() {
        try {
            const token = localStorage.getItem('agentToken');
            const response = await fetch('/api/conversations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="no-conversations">
                    <p>No active conversations</p>
                </div>
            `;
            return;
        }

        conversations.forEach(conversation => {
            this.conversations.set(conversation.id, conversation);
            const item = this.createConversationItem(conversation);
            container.appendChild(item);
        });

        // Update active count
        document.getElementById('activeCount').textContent = conversations.length;
    }

    createConversationItem(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.conversationId = conversation.id;
        
        const lastMessage = conversation.messages?.[0];
        const unreadCount = conversation.unreadCount || 0;
        const customerName = conversation.participants?.find(p => p.user.role === 'CUSTOMER')?.user.username || 'Customer';
        
        if (unreadCount > 0) {
            div.classList.add('unread');
        }

        div.innerHTML = `
            <div class="conversation-header">
                <span class="conversation-customer">${customerName}</span>
                <span class="conversation-time">${this.formatTime(conversation.updatedAt)}</span>
            </div>
            <div class="conversation-preview">
                ${lastMessage ? lastMessage.content : 'No messages yet'}
            </div>
            ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
        `;

        div.addEventListener('click', () => {
            this.selectConversation(conversation.id);
        });

        return div;
    }

    async selectConversation(conversationId) {
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
            selectedItem.classList.remove('unread');
            const badge = selectedItem.querySelector('.unread-badge');
            if (badge) badge.remove();
        }

        this.activeConversationId = conversationId;
        
        // Join conversation room
        if (this.socket) {
            this.socket.emit('conversation:join', conversationId);
        }

        // Load conversation details
        await this.loadConversationDetails(conversationId);
        
        // Show conversation
        document.getElementById('noConversation').style.display = 'none';
        document.getElementById('activeConversation').style.display = 'flex';
    }

    async loadConversationDetails(conversationId) {
        try {
            const token = localStorage.getItem('agentToken');
            
            // Load conversation info
            const convResponse = await fetch(`/api/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Load messages
            const messagesResponse = await fetch(`/api/messages/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (convResponse.ok && messagesResponse.ok) {
                const conversation = await convResponse.json();
                const messages = await messagesResponse.json();
                
                this.renderConversationHeader(conversation);
                this.renderMessages(messages.messages || []);
                this.updateCustomerInfoPanel(conversation);
            }
        } catch (error) {
            console.error('Error loading conversation details:', error);
        }
    }

    renderConversationHeader(conversation) {
        const customer = conversation.participants?.find(p => p.user.role === 'CUSTOMER')?.user;
        if (customer) {
            document.getElementById('customerName').textContent = customer.username;
            document.getElementById('customerStatus').textContent = customer.isOnline ? 'Online' : 'Offline';
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isAgent = message.sender.role === 'AGENT' || message.sender.role === 'ADMIN';
        
        div.className = `message ${isAgent ? 'agent' : 'customer'}`;
        
        div.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${isAgent ? 'headset' : 'user'}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${message.sender.username}</span>
                    <span class="message-time">${this.formatTime(message.createdAt)}</span>
                </div>
                <div class="message-text">${this.escapeHtml(message.content)}</div>
            </div>
        `;

        return div;
    }

    handleNewMessage(data) {
        // Update conversation list
        this.updateConversationInList(data);
        
        // If message is for active conversation, add to chat
        if (data.conversationId === this.activeConversationId) {
            const messageElement = this.createMessageElement({
                content: data.content || data.text,
                sender: {
                    username: data.senderUsername,
                    role: data.senderRole
                },
                createdAt: data.timestamp
            });
            
            const container = document.getElementById('messagesContainer');
            container.appendChild(messageElement);
            container.scrollTop = container.scrollHeight;
        }
    }

    updateConversationInList(messageData) {
        const conversationItem = document.querySelector(`[data-conversation-id="${messageData.conversationId}"]`);
        if (conversationItem) {
            // Update preview text
            const preview = conversationItem.querySelector('.conversation-preview');
            if (preview) {
                preview.textContent = messageData.content || messageData.text;
            }
            
            // Update time
            const time = conversationItem.querySelector('.conversation-time');
            if (time) {
                time.textContent = this.formatTime(messageData.timestamp);
            }
            
            // Move to top of list
            const container = document.getElementById('conversationsList');
            container.insertBefore(conversationItem, container.firstChild);
            
            // Add unread indicator if not active conversation
            if (messageData.conversationId !== this.activeConversationId && !messageData.isAI) {
                conversationItem.classList.add('unread');
                let badge = conversationItem.querySelector('.unread-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'unread-badge';
                    badge.textContent = '1';
                    conversationItem.appendChild(badge);
                } else {
                    badge.textContent = parseInt(badge.textContent) + 1;
                }
            }
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.activeConversationId) return;

        try {
            const token = localStorage.getItem('agentToken');
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    conversationId: this.activeConversationId,
                    content: content,
                    type: 'TEXT'
                })
            });

            if (response.ok) {
                input.value = '';
                this.toggleSendButton();
                this.autoResizeTextarea(input);
                
                // Stop typing indicator
                if (this.socket) {
                    this.socket.emit('typing:stop', {
                        conversationId: this.activeConversationId
                    });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    handleTyping() {
        if (!this.activeConversationId || !this.socket) return;

        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing:start', {
                conversationId: this.activeConversationId
            });
        }

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('typing:stop', {
                conversationId: this.activeConversationId
            });
        }, 2000);
    }

    showTypingIndicator(data) {
        if (data.conversationId === this.activeConversationId) {
            const indicator = document.getElementById('typingIndicator');
            const text = document.getElementById('typingText');
            text.textContent = `${data.username} is typing...`;
            indicator.style.display = 'flex';
        }
    }

    hideTypingIndicator(data) {
        if (data.conversationId === this.activeConversationId) {
            document.getElementById('typingIndicator').style.display = 'none';
        }
    }

    toggleSendButton() {
        const input = document.getElementById('messageInput');
        const button = document.getElementById('sendMessageBtn');
        button.disabled = !input.value.trim();
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateAgentStatus(status) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator ${status}`;
        
        // You can also send status update to server here
        if (this.socket) {
            this.socket.emit('agent:status', { status });
        }
    }

    filterConversations(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Filter conversations
        const conversations = document.querySelectorAll('.conversation-item');
        conversations.forEach(conv => {
            let show = true;
            
            switch (filter) {
                case 'unread':
                    show = conv.classList.contains('unread');
                    break;
                case 'waiting':
                    // You can implement waiting logic here
                    break;
                case 'all':
                default:
                    show = true;
            }
            
            conv.style.display = show ? 'block' : 'none';
        });
    }

    toggleCustomerInfoPanel() {
        const panel = document.getElementById('customerInfoPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    hideCustomerInfoPanel() {
        document.getElementById('customerInfoPanel').style.display = 'none';
    }

    updateCustomerInfoPanel(conversation) {
        const customer = conversation.participants?.find(p => p.user.role === 'CUSTOMER')?.user;
        if (customer) {
            document.getElementById('panelCustomerName').textContent = customer.username;
            document.getElementById('panelCustomerEmail').textContent = customer.email;
            document.getElementById('panelCustomerId').textContent = customer.id;
        }
        
        document.getElementById('panelConversationStart').textContent = this.formatTime(conversation.createdAt);
        document.getElementById('panelMessageCount').textContent = conversation.messages?.length || 0;
        document.getElementById('panelConversationStatus').textContent = 'Active';
    }

    async closeConversation() {
        if (!this.activeConversationId) return;
        
        if (confirm('Are you sure you want to close this conversation?')) {
            try {
                const token = localStorage.getItem('agentToken');
                const response = await fetch(`/api/conversations/${this.activeConversationId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // Remove from list
                    const item = document.querySelector(`[data-conversation-id="${this.activeConversationId}"]`);
                    if (item) item.remove();
                    
                    // Show no conversation screen
                    document.getElementById('activeConversation').style.display = 'none';
                    document.getElementById('noConversation').style.display = 'flex';
                    
                    this.activeConversationId = null;
                }
            } catch (error) {
                console.error('Error closing conversation:', error);
            }
        }
    }

    showFileUploadModal() {
        document.getElementById('fileUploadModal').style.display = 'flex';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return Math.floor(diff / 60000) + 'm ago';
        } else if (diff < 86400000) { // Less than 1 day
            return Math.floor(diff / 3600000) + 'h ago';
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AgentDashboard();
});
