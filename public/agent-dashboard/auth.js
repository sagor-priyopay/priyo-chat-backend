// Authentication Manager for Agent Dashboard
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                const userData = await api.getCurrentUser();
                if (userData && userData.user) {
                    this.setUser(userData.user);
                    return true;
                }
            } catch (error) {
                console.error('Auto-login failed:', error);
                this.logout();
            }
        }
        return false;
    }

    setUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('userAuthenticated', { 
            detail: { user } 
        }));
    }

    async login(email, password) {
        try {
            const response = await api.login(email, password);
            
            if (response && response.user) {
                // Check if user has appropriate role
                if (!this.hasValidRole(response.user.role)) {
                    throw new Error('Access denied. Admin or Agent role required.');
                }
                
                this.setUser(response.user);
                return { success: true, user: response.user };
            }
            
            throw new Error('Login failed');
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Clear local storage
        localStorage.removeItem('currentUser');
        api.clearTokens();
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        
        // Redirect to login
        window.location.href = '/agent-dashboard/login.html';
    }

    hasValidRole(role) {
        return role === CONFIG.ROLES.ADMIN || role === CONFIG.ROLES.AGENT;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === CONFIG.ROLES.ADMIN;
    }

    isAgent() {
        return this.currentUser && this.currentUser.role === CONFIG.ROLES.AGENT;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/agent-dashboard/login.html';
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth() || !this.isAdmin()) {
            this.showError('Admin access required');
            return false;
        }
        return true;
    }

    showError(message) {
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, CONFIG.NOTIFICATION_TIMEOUT);
    }
}

// Create global auth manager instance
const auth = new AuthManager();
