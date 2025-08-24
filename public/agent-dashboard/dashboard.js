// Dashboard JavaScript - Main functionality
class Dashboard {
    constructor() {
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.currentPage = 'conversations';
        this.typingTimer = null;
        this.messagePollingInterval = null;
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!auth.requireAuth()) return;

        // Initialize UI
        this.initializeUI();
        this.setupEventListeners();
        
        // Connect to WebSocket
        socketManager.connect();
        this.setupSocketListeners();
        
        // Load initial data
        await this.loadUserProfile();
        await this.loadConversations();
        
        // Setup role-based UI
        this.setupRoleBasedUI();
        
        // Start polling for updates
        this.startPolling();
    }

    initializeUI() {
        // Set user info in header
        const user = auth.getCurrentUser();
        if (user) {
            document.getElementById('pageTitle').textContent = `Welcome, ${user.username}`;
        }
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });

        // User menu
        document.getElementById('userAvatar').addEventListener('click', () => {
            this.toggleUserDropdown();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.logout();
        });

        // Conversation filters
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterConversations(e.target.value);
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            this.handleTyping();
        });

        // Send button
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // File attachment
        document.getElementById('attachBtn').addEventListener('click', () => {
            this.showFileModal();
        });

        // Chat actions
        document.getElementById('resolveBtn').addEventListener('click', () => {
            this.resolveConversation();
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            this.closeConversation();
        });

        // Notification bell
        document.getElementById('notificationBell').addEventListener('click', () => {
            this.showNotifications();
        });

        // File modal
        this.setupFileModal();
    }

    setupSocketListeners() {
        socketManager.on('newMessage', (data) => {
            this.handleNewMessage(data);
        });

        socketManager.on('userTyping', (data) => {
            this.showTypingIndicator(data);
        });

        socketManager.on('userStoppedTyping', (data) => {
            this.hideTypingIndicator(data);
        });

        socketManager.on('conversationUpdated', (data) => {
            this.updateConversation(data);
        });

        socketManager.on('socketConnected', () => {
            console.log('Socket connected successfully');
        });
    }

    async loadUserProfile() {
        try {
            const response = await api.getCurrentUser();
            if (response && response.user) {
                // Update UI with user info
                const user = response.user;
                document.getElementById('pageTitle').textContent = `Welcome, ${user.username}`;
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    async loadConversations() {
        try {
            const response = await api.getConversations();
            if (response && response.conversations) {
                this.conversations = response.conversations;
                this.renderConversations();
                this.updateUnreadCount();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.showError('Failed to load conversations');
        }
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No conversations yet</h4>
                    <p>New customer conversations will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.conversations.map(conv => {
            const otherParticipant = conv.participants.find(p => p.id !== auth.getCurrentUser().id);
            const lastMessage = conv.lastMessage;
            const timeAgo = lastMessage ? this.formatTimeAgo(new Date(lastMessage.createdAt)) : '';
            
            return `
                <div class="conversation-item" data-id="${conv.id}">
                    <img src="${otherParticipant?.avatar || this.getDefaultAvatar()}" 
                         alt="${otherParticipant?.username || 'Customer'}" 
                         class="conversation-avatar">
                    <div class="conversation-info">
                        <h4 class="conversation-name">${otherParticipant?.username || 'Customer'}</h4>
                        <p class="conversation-preview">
                            ${lastMessage ? lastMessage.content.substring(0, 50) + '...' : 'No messages yet'}
                        </p>
                    </div>
                    <div class="conversation-meta">
                        <span class="conversation-time">${timeAgo}</span>
                        ${conv.unreadCount > 0 ? `<span class="conversation-badge">${conv.unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.id;
                this.selectConversation(conversationId);
            });
        });
    }

    async selectConversation(conversationId) {
        try {
            // Update UI
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-id="${conversationId}"]`).classList.add('active');

            // Load conversation details
            const response = await api.getConversation(conversationId);
            if (response && response.conversation) {
                this.currentConversation = response.conversation;
                await this.loadMessages(conversationId);
                this.showChatContainer();
                
                // Join conversation room
                socketManager.joinConversation(conversationId);
            }
        } catch (error) {
            console.error('Failed to select conversation:', error);
            this.showError('Failed to load conversation');
        }
    }

    async loadMessages(conversationId) {
        try {
            const response = await api.getMessages(conversationId);
            if (response && response.messages) {
                this.messages = response.messages;
                this.renderMessages();
                this.scrollToBottom();
                
                // Mark messages as read
                const unreadMessages = this.messages
                    .filter(msg => msg.sender.id !== auth.getCurrentUser().id)
                    .map(msg => msg.id);
                
                if (unreadMessages.length > 0) {
                    await api.markMessagesAsRead(unreadMessages);
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    renderMessages() {
        const container = document.getElementById('messagesList');
        const currentUserId = auth.getCurrentUser().id;
        
        container.innerHTML = this.messages.map(message => {
            const isSent = message.sender.id === currentUserId;
            const timeFormatted = this.formatMessageTime(new Date(message.createdAt));
            
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    <img src="${message.sender.avatar || this.getDefaultAvatar()}" 
                         alt="${message.sender.username}" 
                         class="message-avatar">
                    <div class="message-content">
                        <p class="message-text">${this.escapeHtml(message.content)}</p>
                        ${message.fileUrl ? this.renderFileAttachment(message) : ''}
                        <div class="message-time">${timeFormatted}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderFileAttachment(message) {
        const fileIcon = this.getFileIcon(message.fileName);
        return `
            <a href="${message.fileUrl}" target="_blank" class="message-file">
                <span class="file-icon">${fileIcon}</span>
                <span class="file-name">${message.fileName}</span>
                <span class="file-size">(${this.formatFileSize(message.fileSize)})</span>
            </a>
        `;
    }

    showChatContainer() {
        document.getElementById('chatPlaceholder').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        // Update chat header
        if (this.currentConversation) {
            const otherParticipant = this.currentConversation.participants
                .find(p => p.id !== auth.getCurrentUser().id);
            
            if (otherParticipant) {
                document.getElementById('chatAvatar').src = otherParticipant.avatar || this.getDefaultAvatar();
                document.getElementById('chatUserName').textContent = otherParticipant.username;
                document.getElementById('chatStatus').textContent = otherParticipant.isOnline ? 'Online' : 'Offline';
            }
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentConversation) return;

        try {
            const response = await api.sendMessage(this.currentConversation.id, content);
            if (response && response.data) {
                // Add message to UI immediately
                this.messages.push({
                    id: response.data.id,
                    content: content,
                    type: 'TEXT',
                    sender: auth.getCurrentUser(),
                    createdAt: new Date().toISOString()
                });
                
                this.renderMessages();
                this.scrollToBottom();
                input.value = '';
                
                // Stop typing indicator
                socketManager.sendStopTyping(this.currentConversation.id);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError('Failed to send message');
        }
    }

    handleTyping() {
        if (!this.currentConversation) return;
        
        // Send typing indicator
        socketManager.sendTyping(this.currentConversation.id);
        
        // Clear existing timer
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        
        // Stop typing after 3 seconds of inactivity
        this.typingTimer = setTimeout(() => {
            socketManager.sendStopTyping(this.currentConversation.id);
        }, 3000);
    }

    handleNewMessage(data) {
        // Add message to current conversation if it matches
        if (this.currentConversation && data.conversationId === this.currentConversation.id) {
            this.messages.push({
                id: data.id,
                content: data.content,
                type: data.type,
                sender: {
                    id: data.senderId,
                    username: data.senderUsername,
                    avatar: null
                },
                createdAt: data.createdAt
            });
            
            this.renderMessages();
            this.scrollToBottom();
            
            // Mark as read if conversation is active
            api.markMessagesAsRead([data.id]).catch(console.error);
        }
        
        // Update conversation list
        this.loadConversations();
        
        // Show notification if not current conversation
        if (!this.currentConversation || data.conversationId !== this.currentConversation.id) {
            this.updateNotificationCount();
        }
    }

    showTypingIndicator(data) {
        if (this.currentConversation && data.conversationId === this.currentConversation.id) {
            const indicator = document.getElementById('typingIndicator');
            indicator.textContent = `${data.username} is typing...`;
            indicator.style.display = 'block';
        }
    }

    hideTypingIndicator(data) {
        if (this.currentConversation && data.conversationId === this.currentConversation.id) {
            document.getElementById('typingIndicator').style.display = 'none';
        }
    }

    async resolveConversation() {
        if (!this.currentConversation) return;
        
        try {
            // In a real implementation, you'd have a resolve endpoint
            // For now, we'll close the conversation
            await this.closeConversation();
            this.showSuccess('Conversation marked as resolved');
        } catch (error) {
            console.error('Failed to resolve conversation:', error);
            this.showError('Failed to resolve conversation');
        }
    }

    async closeConversation() {
        if (!this.currentConversation) return;
        
        try {
            await api.closeConversation(this.currentConversation.id);
            
            // Leave socket room
            socketManager.leaveConversation(this.currentConversation.id);
            
            // Reset UI
            this.currentConversation = null;
            document.getElementById('chatContainer').style.display = 'none';
            document.getElementById('chatPlaceholder').style.display = 'flex';
            
            // Reload conversations
            await this.loadConversations();
            
            this.showSuccess('Conversation closed');
        } catch (error) {
            console.error('Failed to close conversation:', error);
            this.showError('Failed to close conversation');
        }
    }

    // Navigation
    navigateToPage(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(pageEl => {
            pageEl.style.display = 'none';
        });
        
        // Show selected page
        document.getElementById(`${page}Page`).style.display = 'block';
        
        // Update page title
        const titles = {
            conversations: 'Conversations',
            analytics: 'Analytics',
            agents: 'Manage Agents',
            reports: 'Reports',
            settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;
        
        this.currentPage = page;
        
        // Load page-specific data
        if (page === 'analytics') {
            this.loadAnalytics();
        }
    }

    async loadAnalytics() {
        try {
            const response = await api.getAgentMetrics();
            if (response) {
                this.renderAnalytics(response);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            // Show placeholder data
            this.renderAnalytics({
                avgResponseTime: '2.5 min',
                totalResolved: 45,
                customerRating: 4.8,
                activeChats: 3
            });
        }
    }

    renderAnalytics(data) {
        document.getElementById('avgResponseTime').textContent = data.avgResponseTime || '--';
        document.getElementById('totalResolved').textContent = data.totalResolved || '--';
        document.getElementById('customerRating').textContent = data.customerRating || '--';
        document.getElementById('activeChats').textContent = data.activeChats || '--';
        
        // Render charts
        this.renderCharts(data);
    }

    renderCharts(data) {
        // Response Time Chart
        const responseCtx = document.getElementById('responseTimeChart').getContext('2d');
        new Chart(responseCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Response Time (minutes)',
                    data: [3.2, 2.8, 2.1, 2.5, 1.9, 2.3, 2.0],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        
        // Resolution Chart
        const resolutionCtx = document.getElementById('resolutionChart').getContext('2d');
        new Chart(resolutionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Resolved', 'Pending', 'In Progress'],
                datasets: [{
                    data: [75, 15, 10],
                    backgroundColor: ['#38a169', '#d69e2e', '#667eea']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    setupRoleBasedUI() {
        const user = auth.getCurrentUser();
        if (user && user.role === 'ADMIN') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }
    }

    // Utility methods
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }

    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }

    filterConversations(status) {
        // Filter conversations based on status
        let filtered = this.conversations;
        
        if (status) {
            filtered = this.conversations.filter(conv => {
                // Add status filtering logic based on your data structure
                return true; // Placeholder
            });
        }
        
        // Re-render with filtered data
        const container = document.getElementById('conversationsList');
        // Implementation would go here
    }

    async updateUnreadCount() {
        try {
            const response = await api.getUnreadCount();
            if (response && response.unreadCount > 0) {
                const badge = document.getElementById('notificationBadge');
                badge.textContent = response.unreadCount;
                badge.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to update unread count:', error);
        }
    }

    updateNotificationCount() {
        this.updateUnreadCount();
    }

    showNotifications() {
        // Show notifications panel
        console.log('Show notifications');
    }

    setupFileModal() {
        const modal = document.getElementById('fileModal');
        const closeBtn = document.getElementById('fileModalClose');
        const cancelBtn = document.getElementById('cancelUpload');
        
        closeBtn.addEventListener('click', () => this.hideFileModal());
        cancelBtn.addEventListener('click', () => this.hideFileModal());
        
        document.getElementById('confirmUpload').addEventListener('click', () => {
            this.uploadFile();
        });
    }

    showFileModal() {
        document.getElementById('fileModal').style.display = 'flex';
    }

    hideFileModal() {
        document.getElementById('fileModal').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('filePreview').innerHTML = '';
    }

    async uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) return;
        
        try {
            const response = await api.uploadFile(file);
            if (response && response.fileUrl) {
                // Send file message
                await api.sendMessage(this.currentConversation.id, `File: ${file.name}`, 'FILE');
                this.hideFileModal();
                await this.loadMessages(this.currentConversation.id);
            }
        } catch (error) {
            console.error('File upload failed:', error);
            this.showError('File upload failed');
        }
    }

    startPolling() {
        // Poll for new conversations every 30 seconds
        setInterval(() => {
            if (this.currentPage === 'conversations') {
                this.loadConversations();
            }
        }, CONFIG.REFRESH_INTERVAL);
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    // Helper methods
    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    formatMessageTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📄',
            doc: '📝',
            docx: '📝',
            txt: '📄',
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️'
        };
        return icons[ext] || '📎';
    }

    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC4xMzQwMSAxNCA1IDE3LjEzNDEgNSAyMUg5SDE1SDE5QzE5IDE3LjEzNDEgMTUuODY2IDE0IDEyIDE0WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <div class="notification-header">${type === 'error' ? 'Error' : 'Success'}</div>
            <div class="notification-body">${message}</div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, CONFIG.NOTIFICATION_TIMEOUT);

        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
