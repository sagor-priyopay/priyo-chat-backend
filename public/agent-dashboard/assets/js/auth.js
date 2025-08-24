/**
 * Priyo Chat Agent Dashboard - Authentication Service
 * Handles login, logout, token management, and role-based access control
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.tokenRefreshTimer = null;
        this.eventEmitter = Utils.createEventEmitter();
        this.init();
    }

    /**
     * Initialize authentication service
     */
    init() {
        this.loadStoredUser();
        this.setupTokenRefresh();
        this.setupStorageListener();
    }

    /**
     * Load user data from storage
     */
    loadStoredUser() {
        const userData = Utils.storage.get(CONFIG.AUTH.USER_DATA_KEY);
        const token = Utils.storage.get(CONFIG.AUTH.TOKEN_STORAGE_KEY);
        
        if (userData && token) {
            this.currentUser = userData;
            this.eventEmitter.emit('userChanged', userData);
        }
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh() {
        const token = Utils.storage.get(CONFIG.AUTH.TOKEN_STORAGE_KEY);
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiresAt = payload.exp * 1000;
                const refreshAt = expiresAt - CONFIG.AUTH.REFRESH_THRESHOLD;
                const now = Date.now();

                if (refreshAt > now) {
                    this.tokenRefreshTimer = setTimeout(() => {
                        this.refreshToken();
                    }, refreshAt - now);
                } else {
                    // Token is about to expire or already expired
                    this.refreshToken();
                }
            } catch (error) {
                Utils.log.error('Invalid token format:', error);
                this.logout();
            }
        }
    }

    /**
     * Setup storage event listener for multi-tab sync
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === CONFIG.AUTH.TOKEN_STORAGE_KEY) {
                if (e.newValue === null) {
                    // Token was removed in another tab
                    this.currentUser = null;
                    this.eventEmitter.emit('userChanged', null);
                    this.redirectToLogin();
                }
            }
        });
    }

    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            Utils.log.info('Attempting login for:', email);

            const response = await API.login(email, password);
            
            if (response.user && response.tokens) {
                // Store authentication data
                Utils.storage.set(CONFIG.AUTH.TOKEN_STORAGE_KEY, response.tokens.accessToken);
                Utils.storage.set(CONFIG.AUTH.REFRESH_TOKEN_KEY, response.tokens.refreshToken);
                Utils.storage.set(CONFIG.AUTH.USER_DATA_KEY, response.user);

                this.currentUser = response.user;
                this.setupTokenRefresh();
                this.eventEmitter.emit('userChanged', response.user);

                Utils.log.info('Login successful:', response.user);
                Utils.showToast(CONFIG.SUCCESS.LOGIN, 'success');

                return { success: true, user: response.user };
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            Utils.log.error('Login failed:', error);
            
            let message = CONFIG.ERRORS.AUTH_FAILED;
            if (error instanceof ApiError) {
                message = error.message;
            }
            
            Utils.showToast(message, 'error');
            return { success: false, error: message };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            Utils.log.info('Logging out user');

            // Clear refresh timer
            if (this.tokenRefreshTimer) {
                clearTimeout(this.tokenRefreshTimer);
                this.tokenRefreshTimer = null;
            }

            // Call logout API
            await API.logout();

            // Clear local data
            this.currentUser = null;
            this.eventEmitter.emit('userChanged', null);

            Utils.showToast(CONFIG.SUCCESS.LOGOUT, 'success');
            this.redirectToLogin();

        } catch (error) {
            Utils.log.error('Logout error:', error);
            // Still clear local data even if API call fails
            this.currentUser = null;
            this.eventEmitter.emit('userChanged', null);
            this.redirectToLogin();
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            const refreshToken = Utils.storage.get(CONFIG.AUTH.REFRESH_TOKEN_KEY);
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            Utils.log.info('Refreshing authentication token');

            const response = await API.refreshToken(refreshToken);
            
            if (response.tokens) {
                Utils.storage.set(CONFIG.AUTH.TOKEN_STORAGE_KEY, response.tokens.accessToken);
                Utils.storage.set(CONFIG.AUTH.REFRESH_TOKEN_KEY, response.tokens.refreshToken);
                
                this.setupTokenRefresh();
                Utils.log.info('Token refreshed successfully');
                
                return true;
            } else {
                throw new Error('Invalid refresh response');
            }
        } catch (error) {
            Utils.log.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser && !!Utils.storage.get(CONFIG.AUTH.TOKEN_STORAGE_KEY);
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole(roles) {
        return this.currentUser && roles.includes(this.currentUser.role);
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.hasRole('ADMIN');
    }

    /**
     * Check if user is agent or admin
     */
    isAgent() {
        return this.hasAnyRole(['AGENT', 'ADMIN']);
    }

    /**
     * Get user permissions based on role
     */
    getPermissions() {
        if (!this.currentUser) return [];

        const permissions = ['view_assigned_tickets', 'reply_to_messages', 'update_ticket_status'];

        if (this.hasRole('ADMIN')) {
            permissions.push(
                'view_all_tickets',
                'create_agents',
                'edit_agents',
                'delete_agents',
                'assign_tickets',
                'view_analytics',
                'export_reports',
                'view_activity_logs'
            );
        }

        return permissions;
    }

    /**
     * Check if user has specific permission
     */
    hasPermission(permission) {
        return this.getPermissions().includes(permission);
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        if (window.location.pathname !== '/agent-dashboard/' && 
            window.location.pathname !== '/agent-dashboard/test.html') {
            window.location.href = '/agent-dashboard/test.html';
        }
    }

    /**
     * Redirect to appropriate dashboard based on role
     */
    redirectToDashboard() {
        if (this.isAdmin()) {
            window.location.href = '/agent-dashboard/admin.html';
        } else if (this.isAgent()) {
            window.location.href = '/agent-dashboard/agent.html';
        } else {
            this.logout();
        }
    }

    /**
     * Subscribe to authentication events
     */
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }

    /**
     * Unsubscribe from authentication events
     */
    off(event, callback) {
        this.eventEmitter.off(event, callback);
    }

    /**
     * Update current user data
     */
    async updateUserProfile(updates) {
        try {
            const response = await API.updateUser(this.currentUser.id, updates);
            
            if (response.user) {
                this.currentUser = { ...this.currentUser, ...response.user };
                Utils.storage.set(CONFIG.AUTH.USER_DATA_KEY, this.currentUser);
                this.eventEmitter.emit('userChanged', this.currentUser);
                
                Utils.showToast(CONFIG.SUCCESS.PROFILE_UPDATED, 'success');
                return { success: true, user: this.currentUser };
            }
        } catch (error) {
            Utils.log.error('Profile update failed:', error);
            Utils.showToast(error.message || 'Profile update failed', 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await API.request('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            Utils.showToast('Password changed successfully', 'success');
            return { success: true };
        } catch (error) {
            Utils.log.error('Password change failed:', error);
            Utils.showToast(error.message || 'Password change failed', 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate session and refresh user data
     */
    async validateSession() {
        try {
            if (!this.isAuthenticated()) {
                return false;
            }

            const response = await API.getCurrentUser();
            
            if (response.user) {
                this.currentUser = response.user;
                Utils.storage.set(CONFIG.AUTH.USER_DATA_KEY, response.user);
                this.eventEmitter.emit('userChanged', response.user);
                return true;
            }
            
            return false;
        } catch (error) {
            Utils.log.error('Session validation failed:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Get authentication status for debugging
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated(),
            currentUser: this.currentUser,
            hasToken: !!Utils.storage.get(CONFIG.AUTH.TOKEN_STORAGE_KEY),
            hasRefreshToken: !!Utils.storage.get(CONFIG.AUTH.REFRESH_TOKEN_KEY),
            permissions: this.getPermissions()
        };
    }
}

/**
 * Route protection middleware
 */
class RouteGuard {
    static init() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/agent-dashboard/' || currentPath === '/agent-dashboard/test.html';
        
        // Check authentication on page load
        if (!Auth.isAuthenticated()) {
            if (!isLoginPage) {
                Auth.redirectToLogin();
                return false;
            }
        } else {
            // Redirect authenticated users away from login page
            if (isLoginPage) {
                Auth.redirectToDashboard();
                return false;
            }
            
            // Check role-based access
            if (currentPath.includes('admin.html') && !Auth.isAdmin()) {
                Utils.showToast(CONFIG.ERRORS.PERMISSION_DENIED, 'error');
                Auth.redirectToDashboard();
                return false;
            }
            
            if (currentPath.includes('agent.html') && !Auth.isAgent()) {
                Utils.showToast(CONFIG.ERRORS.PERMISSION_DENIED, 'error');
                Auth.redirectToLogin();
                return false;
            }
        }
        
        return true;
    }

    static requireAuth() {
        if (!Auth.isAuthenticated()) {
            Auth.redirectToLogin();
            return false;
        }
        return true;
    }

    static requireRole(role) {
        if (!Auth.hasRole(role)) {
            Utils.showToast(CONFIG.ERRORS.PERMISSION_DENIED, 'error');
            Auth.redirectToDashboard();
            return false;
        }
        return true;
    }

    static requirePermission(permission) {
        if (!Auth.hasPermission(permission)) {
            Utils.showToast(CONFIG.ERRORS.PERMISSION_DENIED, 'error');
            return false;
        }
        return true;
    }
}

// Create singleton instance
const Auth = new AuthService();

// Initialize route guard on page load with delay to prevent race conditions
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        RouteGuard.init();
    }, 100);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, RouteGuard, Auth };
}

// Global access
window.AuthService = AuthService;
window.RouteGuard = RouteGuard;
window.Auth = Auth;
