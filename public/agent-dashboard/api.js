// API Service for Agent Dashboard
class APIService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
    }

    // Set authentication tokens
    setTokens(accessToken, refreshToken) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    }

    // Clear authentication tokens
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    // Get authorization headers
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    // Handle API response
    async handleResponse(response) {
        if (response.status === 401) {
            // Try to refresh token
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                this.clearTokens();
                window.location.href = '/agent-dashboard/login.html';
                throw new Error('Authentication failed');
            }
            return null; // Indicate retry needed
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    // Make authenticated API request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            }
        };

        let response = await fetch(url, config);
        let data = await this.handleResponse(response);

        // Retry once if token was refreshed
        if (data === null) {
            response = await fetch(url, config);
            data = await this.handleResponse(response);
        }

        return data;
    }

    // Authentication APIs
    async login(email, password) {
        const response = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await this.handleResponse(response);
        if (data && data.tokens) {
            this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        }
        return data;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearTokens();
        }
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // Conversation APIs
    async getConversations(page = 1, limit = CONFIG.CONVERSATIONS_PER_PAGE) {
        return this.request(`/conversations?page=${page}&limit=${limit}`);
    }

    async getConversation(conversationId) {
        return this.request(`/conversations/${conversationId}`);
    }

    async closeConversation(conversationId) {
        return this.request(`/conversations/${conversationId}`, { method: 'DELETE' });
    }

    // Message APIs
    async getMessages(conversationId, page = 1, limit = CONFIG.MESSAGES_PER_PAGE) {
        return this.request(`/messages/${conversationId}?page=${page}&limit=${limit}`);
    }

    async sendMessage(conversationId, content, type = 'TEXT') {
        return this.request('/messages', {
            method: 'POST',
            body: JSON.stringify({ conversationId, content, type })
        });
    }

    async markMessagesAsRead(messageIds) {
        return this.request('/messages/read', {
            method: 'POST',
            body: JSON.stringify({ messageIds })
        });
    }

    async getUnreadCount() {
        return this.request('/messages/unread/count');
    }

    // User Management APIs (Admin only)
    async getUsers(role = null) {
        const query = role ? `?role=${role}` : '';
        return this.request(`/users${query}`);
    }

    async createUser(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(userId) {
        return this.request(`/users/${userId}`, { method: 'DELETE' });
    }

    // Analytics APIs
    async getAgentMetrics(agentId = null, startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (agentId) params.append('agentId', agentId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/analytics/agent-metrics${query}`);
    }

    async getSystemMetrics() {
        return this.request('/analytics/system-metrics');
    }

    // File upload
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        return this.handleResponse(response);
    }
}

// Create global API instance
const api = new APIService();
