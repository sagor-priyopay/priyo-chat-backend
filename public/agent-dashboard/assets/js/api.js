/**
 * Priyo Chat Agent Dashboard - API Integration
 * Handles all backend API communications with error handling and retry logic
 */

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.endpoints = CONFIG.ENDPOINTS;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const token = Utils.storage.get(CONFIG.AUTH.TOKEN_STORAGE_KEY);
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * Make HTTP request with error handling and retry logic
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: this.getAuthHeaders(),
            ...options
        };

        Utils.log.debug('API Request:', { url, options: defaultOptions });

        try {
            const response = await Utils.retry(async () => {
                const res = await fetch(url, defaultOptions);
                
                // Handle authentication errors
                if (res.status === 401) {
                    await this.handleAuthError();
                    throw new Error('Authentication required');
                }

                // Handle other HTTP errors
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                    throw new ApiError(errorData.error || `HTTP ${res.status}`, res.status, errorData);
                }

                return res;
            }, this.retryAttempts, this.retryDelay);

            const data = await response.json();
            Utils.log.debug('API Response:', data);
            return data;

        } catch (error) {
            Utils.log.error('API Error:', error);
            
            if (error instanceof ApiError) {
                throw error;
            }

            // Network or other errors
            throw new ApiError(
                error.message || CONFIG.ERRORS.NETWORK_ERROR,
                0,
                { originalError: error }
            );
        }
    }

    /**
     * Handle authentication errors
     */
    async handleAuthError() {
        const refreshToken = Utils.storage.get(CONFIG.AUTH.REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
            try {
                const response = await this.refreshToken(refreshToken);
                Utils.storage.set(CONFIG.AUTH.TOKEN_STORAGE_KEY, response.tokens.accessToken);
                Utils.storage.set(CONFIG.AUTH.REFRESH_TOKEN_KEY, response.tokens.refreshToken);
                return true;
            } catch (error) {
                Utils.log.error('Token refresh failed:', error);
            }
        }

        // Clear stored auth data and redirect to login
        this.clearAuthData();
        window.location.href = '/agent-dashboard/';
        return false;
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        Utils.storage.remove(CONFIG.AUTH.TOKEN_STORAGE_KEY);
        Utils.storage.remove(CONFIG.AUTH.REFRESH_TOKEN_KEY);
        Utils.storage.remove(CONFIG.AUTH.USER_DATA_KEY);
    }

    // Authentication API methods
    async login(email, password) {
        return this.request(this.endpoints.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async logout() {
        try {
            await this.request(this.endpoints.LOGOUT, { method: 'POST' });
        } catch (error) {
            Utils.log.warn('Logout API call failed:', error);
        } finally {
            this.clearAuthData();
        }
    }

    async refreshToken(refreshToken) {
        return this.request(this.endpoints.REFRESH, {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
            headers: { 'Content-Type': 'application/json' } // No auth header for refresh
        });
    }

    async getCurrentUser() {
        return this.request(this.endpoints.ME);
    }

    // Conversation/Ticket API methods
    async getConversations(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = `${this.endpoints.CONVERSATIONS}${params.toString() ? `?${params}` : ''}`;
        return this.request(endpoint);
    }

    async getConversation(id) {
        const endpoint = this.endpoints.CONVERSATION_DETAIL.replace('{id}', id);
        return this.request(endpoint);
    }

    async createConversation(data) {
        return this.request(this.endpoints.CONVERSATIONS, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateConversationStatus(id, status) {
        const endpoint = this.endpoints.CONVERSATION_DETAIL.replace('{id}', id);
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async closeConversation(id) {
        const endpoint = this.endpoints.CONVERSATION_DETAIL.replace('{id}', id);
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Message API methods
    async getMessages(conversationId, page = 1, limit = 50) {
        const endpoint = this.endpoints.MESSAGES.replace('{conversationId}', conversationId);
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        return this.request(`${endpoint}?${params}`);
    }

    async sendMessage(data) {
        return this.request(this.endpoints.SEND_MESSAGE, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async markMessagesAsRead(messageIds) {
        return this.request(this.endpoints.MARK_READ, {
            method: 'POST',
            body: JSON.stringify({ messageIds })
        });
    }

    async getUnreadCount() {
        return this.request(this.endpoints.UNREAD_COUNT);
    }

    // File upload API methods
    async uploadFile(file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        const token = Utils.storage.get(CONFIG.AUTH.TOKEN_STORAGE_KEY);
        const headers = {
            'Authorization': token ? `Bearer ${token}` : ''
        };

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new ApiError('Invalid JSON response', xhr.status));
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(new ApiError(errorResponse.error || `HTTP ${xhr.status}`, xhr.status, errorResponse));
                    } catch (error) {
                        reject(new ApiError(`HTTP ${xhr.status}`, xhr.status));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new ApiError('Network error during file upload', 0));
            });

            xhr.addEventListener('timeout', () => {
                reject(new ApiError('File upload timeout', 0));
            });

            xhr.open('POST', `${this.baseUrl}${this.endpoints.UPLOAD}`);
            Object.keys(headers).forEach(key => {
                xhr.setRequestHeader(key, headers[key]);
            });

            xhr.timeout = 60000; // 60 second timeout for file uploads
            xhr.send(formData);
        });
    }

    // Admin-only API methods
    async getUsers(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = `${this.endpoints.USERS}${params.toString() ? `?${params}` : ''}`;
        return this.request(endpoint);
    }

    async createUser(userData) {
        return this.request(this.endpoints.USERS, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(userId, userData) {
        return this.request(`${this.endpoints.USERS}/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(userId) {
        return this.request(`${this.endpoints.USERS}/${userId}`, {
            method: 'DELETE'
        });
    }

    async getAnalytics(timeRange = '7d') {
        const params = new URLSearchParams({ range: timeRange });
        return this.request(`${this.endpoints.ANALYTICS}?${params}`);
    }

    async getActivityLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = `${this.endpoints.ACTIVITY_LOGS}${params.toString() ? `?${params}` : ''}`;
        return this.request(endpoint);
    }

    // Performance metrics API methods
    async getAgentMetrics(agentId = null, timeRange = '7d') {
        const params = new URLSearchParams({ range: timeRange });
        if (agentId) params.set('agentId', agentId);
        return this.request(`/api/metrics/agent?${params}`);
    }

    async getTeamMetrics(timeRange = '7d') {
        const params = new URLSearchParams({ range: timeRange });
        return this.request(`/api/metrics/team?${params}`);
    }

    async exportReport(type, filters = {}) {
        const params = new URLSearchParams({ type, ...filters });
        const response = await fetch(`${this.baseUrl}/api/reports/export?${params}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new ApiError(`Export failed: ${response.status}`, response.status);
        }

        return response.blob();
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Batch operations
    async batchRequest(requests) {
        const promises = requests.map(req => 
            this.request(req.endpoint, req.options).catch(error => ({ error, request: req }))
        );

        const results = await Promise.all(promises);
        
        const successful = results.filter(result => !result.error);
        const failed = results.filter(result => result.error);

        return { successful, failed };
    }

    // Cache management
    cache = new Map();
    cacheTimeouts = new Map();

    async getCached(key, fetcher, ttl = CONFIG.PERFORMANCE.CACHE_TTL) {
        // Check if we have cached data
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < ttl) {
                Utils.log.debug('Cache hit:', key);
                return cached.data;
            }
        }

        // Fetch fresh data
        Utils.log.debug('Cache miss:', key);
        const data = await fetcher();
        
        // Store in cache
        this.cache.set(key, { data, timestamp: Date.now() });
        
        // Set cleanup timeout
        if (this.cacheTimeouts.has(key)) {
            clearTimeout(this.cacheTimeouts.get(key));
        }
        
        const timeout = setTimeout(() => {
            this.cache.delete(key);
            this.cacheTimeouts.delete(key);
        }, ttl);
        
        this.cacheTimeouts.set(key, timeout);

        return data;
    }

    clearCache(pattern = null) {
        if (pattern) {
            // Clear specific pattern
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                    if (this.cacheTimeouts.has(key)) {
                        clearTimeout(this.cacheTimeouts.get(key));
                        this.cacheTimeouts.delete(key);
                    }
                }
            }
        } else {
            // Clear all cache
            this.cache.clear();
            for (const timeout of this.cacheTimeouts.values()) {
                clearTimeout(timeout);
            }
            this.cacheTimeouts.clear();
        }
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }

    get isNetworkError() {
        return this.status === 0;
    }

    get isAuthError() {
        return this.status === 401 || this.status === 403;
    }

    get isServerError() {
        return this.status >= 500;
    }

    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }
}

// Create singleton instance
const API = new ApiService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, ApiError, API };
}

// Global access
window.ApiService = ApiService;
window.ApiError = ApiError;
window.API = API;
