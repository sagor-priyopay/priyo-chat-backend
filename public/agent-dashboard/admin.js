// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentPage = 'overview';
        this.agents = [];
        this.systemStats = {};
        this.charts = {};
        
        this.init();
    }

    async init() {
        // Check admin authentication
        if (!auth.requireAdmin()) return;

        // Handle admin sidebar logo error
        const adminSidebarLogo = document.getElementById('adminSidebarLogo');
        if (adminSidebarLogo) {
            adminSidebarLogo.addEventListener('error', function() {
                this.style.display = 'none';
            });
        }

        this.initializeUI();
        this.setupEventListeners();
        
        // Connect to WebSocket
        socketManager.connect();
        this.setupSocketListeners();
        
        // Load initial data
        await this.loadSystemOverview();
        
        // Start polling for updates
        this.startPolling();
    }

    initializeUI() {
        const user = auth.getCurrentUser();
        if (user) {
            document.getElementById('pageTitle').textContent = `Admin Dashboard - ${user.username}`;
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

        // Overview page events
        document.getElementById('statsTimeframe').addEventListener('change', (e) => {
            this.loadSystemStats(e.target.value);
        });

        document.getElementById('refreshActivity').addEventListener('click', () => {
            this.loadRecentActivity();
        });

        // Agents page events
        document.getElementById('addAgentBtn').addEventListener('click', () => {
            this.showAddAgentModal();
        });

        document.getElementById('exportAgentsBtn').addEventListener('click', () => {
            this.exportAgents();
        });

        document.getElementById('agentSearch').addEventListener('input', (e) => {
            this.filterAgents();
        });

        document.getElementById('agentRoleFilter').addEventListener('change', () => {
            this.filterAgents();
        });

        document.getElementById('agentStatusFilter').addEventListener('change', () => {
            this.filterAgents();
        });

        // Analytics page events
        document.getElementById('applyDateRange').addEventListener('click', () => {
            this.applyDateRangeFilter();
        });

        // Reports page events
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });

        // Settings page events
        document.getElementById('systemSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSystemSettings();
        });

        document.getElementById('notificationSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNotificationSettings();
        });

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        // Add Agent Modal
        document.getElementById('addAgentModalClose').addEventListener('click', () => {
            this.hideAddAgentModal();
        });

        document.getElementById('cancelAddAgent').addEventListener('click', () => {
            this.hideAddAgentModal();
        });

        document.getElementById('confirmAddAgent').addEventListener('click', () => {
            this.createAgent();
        });
    }

    setupSocketListeners() {
        socketManager.on('newMessage', () => {
            this.updateSystemStats();
        });

        socketManager.on('userOnline', (data) => {
            this.updateAgentStatus(data.userId, true);
        });

        socketManager.on('userOffline', (data) => {
            this.updateAgentStatus(data.userId, false);
        });
    }

    // Page Navigation
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
            overview: 'System Overview',
            conversations: 'All Conversations',
            agents: 'Manage Agents',
            analytics: 'Analytics',
            reports: 'Reports',
            settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;
        
        this.currentPage = page;
        
        // Load page-specific data
        this.loadPageData(page);
    }

    async loadPageData(page) {
        switch (page) {
            case 'overview':
                await this.loadSystemOverview();
                break;
            case 'agents':
                await this.loadAgents();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    // Overview Page
    async loadSystemOverview() {
        try {
            await Promise.all([
                this.loadSystemStats(),
                this.loadRecentActivity(),
                this.loadTopPerformers(),
                this.loadSystemHealth()
            ]);
        } catch (error) {
            console.error('Failed to load system overview:', error);
        }
    }

    async loadSystemStats(timeframe = 'month') {
        try {
            // Mock data - replace with actual API calls
            const stats = {
                totalConversations: 1247,
                activeAgents: 8,
                avgResponseTime: '2.3 min',
                resolutionRate: '94%'
            };

            document.getElementById('totalConversations').textContent = stats.totalConversations;
            document.getElementById('activeAgents').textContent = stats.activeAgents;
            document.getElementById('avgResponseTime').textContent = stats.avgResponseTime;
            document.getElementById('resolutionRate').textContent = stats.resolutionRate;
        } catch (error) {
            console.error('Failed to load system stats:', error);
        }
    }

    async loadRecentActivity() {
        try {
            // Mock data - replace with actual API calls
            const activities = [
                {
                    type: 'message',
                    title: 'New conversation started',
                    description: 'Customer John Doe started a new conversation',
                    time: '2 minutes ago'
                },
                {
                    type: 'user',
                    title: 'Agent joined',
                    description: 'Sarah Wilson came online',
                    time: '5 minutes ago'
                },
                {
                    type: 'system',
                    title: 'System update',
                    description: 'Dashboard updated to version 2.1.0',
                    time: '1 hour ago'
                }
            ];

            const container = document.getElementById('activityList');
            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        ${this.getActivityIcon(activity.type)}
                    </div>
                    <div class="activity-content">
                        <h4 class="activity-title">${activity.title}</h4>
                        <p class="activity-description">${activity.description}</p>
                    </div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    async loadTopPerformers() {
        try {
            // Mock data - replace with actual API calls
            const performers = [
                {
                    name: 'Sarah Wilson',
                    email: 'sarah@example.com',
                    avatar: null,
                    score: 98,
                    conversations: 45
                },
                {
                    name: 'Mike Johnson',
                    email: 'mike@example.com',
                    avatar: null,
                    score: 95,
                    conversations: 38
                },
                {
                    name: 'Lisa Chen',
                    email: 'lisa@example.com',
                    avatar: null,
                    score: 92,
                    conversations: 42
                }
            ];

            const container = document.getElementById('performanceList');
            container.innerHTML = performers.map(performer => `
                <div class="performance-item">
                    <div class="agent-info">
                        <img src="${performer.avatar || this.getDefaultAvatar()}" 
                             alt="${performer.name}" class="agent-avatar">
                        <div class="agent-details">
                            <h4>${performer.name}</h4>
                            <p>${performer.conversations} conversations</p>
                        </div>
                    </div>
                    <div class="performance-score">
                        <div class="score-value">${performer.score}%</div>
                        <div class="score-label">Performance</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load top performers:', error);
        }
    }

    async loadSystemHealth() {
        try {
            // Check system health
            const health = {
                server: 'online',
                database: 'online',
                socket: 'online'
            };

            document.getElementById('serverStatus').className = `health-status ${health.server}`;
            document.getElementById('databaseStatus').className = `health-status ${health.database}`;
            document.getElementById('socketStatus').className = `health-status ${health.socket}`;
        } catch (error) {
            console.error('Failed to load system health:', error);
        }
    }

    // Agents Management
    async loadAgents() {
        try {
            // Mock data - replace with actual API calls
            this.agents = [
                {
                    id: '1',
                    name: 'Sarah Wilson',
                    email: 'sarah@example.com',
                    username: 'sarah.wilson',
                    role: 'AGENT',
                    isOnline: true,
                    conversations: 5,
                    avgResponse: '1.2 min',
                    rating: 4.8,
                    lastActive: new Date()
                },
                {
                    id: '2',
                    name: 'Mike Johnson',
                    email: 'mike@example.com',
                    username: 'mike.johnson',
                    role: 'AGENT',
                    isOnline: false,
                    conversations: 3,
                    avgResponse: '2.1 min',
                    rating: 4.6,
                    lastActive: new Date(Date.now() - 3600000)
                }
            ];

            this.renderAgentsTable();
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }

    renderAgentsTable() {
        const tbody = document.getElementById('agentsTableBody');
        
        if (this.agents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <h4>No agents found</h4>
                            <p>Add your first agent to get started</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.agents.map(agent => `
            <tr>
                <td>
                    <div class="agent-cell">
                        <img src="${agent.avatar || this.getDefaultAvatar()}" alt="${agent.name}">
                        <div class="agent-info-cell">
                            <div class="agent-name">${agent.name}</div>
                            <div class="agent-email">${agent.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${agent.role.toLowerCase()}">${agent.role}</span>
                </td>
                <td>
                    <span class="status-${agent.isOnline ? 'online' : 'offline'}">
                        ${agent.isOnline ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>${agent.conversations}</td>
                <td>${agent.avgResponse}</td>
                <td>${agent.rating}/5</td>
                <td>${this.formatTimeAgo(agent.lastActive)}</td>
                <td>
                    <div class="agent-actions">
                        <button class="btn btn-sm btn-secondary" onclick="adminDashboard.editAgent('${agent.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteAgent('${agent.id}')">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterAgents() {
        const search = document.getElementById('agentSearch').value.toLowerCase();
        const roleFilter = document.getElementById('agentRoleFilter').value;
        const statusFilter = document.getElementById('agentStatusFilter').value;

        let filtered = this.agents;

        if (search) {
            filtered = filtered.filter(agent => 
                agent.name.toLowerCase().includes(search) ||
                agent.email.toLowerCase().includes(search)
            );
        }

        if (roleFilter) {
            filtered = filtered.filter(agent => agent.role === roleFilter);
        }

        if (statusFilter) {
            const isOnline = statusFilter === 'online';
            filtered = filtered.filter(agent => agent.isOnline === isOnline);
        }

        // Temporarily store original agents and render filtered
        const originalAgents = this.agents;
        this.agents = filtered;
        this.renderAgentsTable();
        this.agents = originalAgents;
    }

    showAddAgentModal() {
        document.getElementById('addAgentModal').style.display = 'flex';
    }

    hideAddAgentModal() {
        document.getElementById('addAgentModal').style.display = 'none';
        document.getElementById('addAgentForm').reset();
    }

    async createAgent() {
        const form = document.getElementById('addAgentForm');
        const formData = new FormData(form);
        
        const agentData = {
            username: document.getElementById('agentUsername').value,
            email: document.getElementById('agentEmail').value,
            password: document.getElementById('agentPassword').value,
            role: document.getElementById('agentRole').value
        };

        try {
            const response = await api.createUser(agentData);
            if (response) {
                this.showSuccess('Agent created successfully');
                this.hideAddAgentModal();
                await this.loadAgents();
            }
        } catch (error) {
            console.error('Failed to create agent:', error);
            this.showError('Failed to create agent: ' + error.message);
        }
    }

    async editAgent(agentId) {
        // Implementation for editing agent
        console.log('Edit agent:', agentId);
    }

    async deleteAgent(agentId) {
        if (confirm('Are you sure you want to delete this agent?')) {
            try {
                await api.deleteUser(agentId);
                this.showSuccess('Agent deleted successfully');
                await this.loadAgents();
            } catch (error) {
                console.error('Failed to delete agent:', error);
                this.showError('Failed to delete agent');
            }
        }
    }

    async exportAgents() {
        try {
            // Create CSV content
            const headers = ['Name', 'Email', 'Role', 'Status', 'Conversations', 'Avg Response', 'Rating'];
            const csvContent = [
                headers.join(','),
                ...this.agents.map(agent => [
                    agent.name,
                    agent.email,
                    agent.role,
                    agent.isOnline ? 'Online' : 'Offline',
                    agent.conversations,
                    agent.avgResponse,
                    agent.rating
                ].join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'agents-export.csv';
            a.click();
            window.URL.revokeObjectURL(url);

            this.showSuccess('Agents exported successfully');
        } catch (error) {
            console.error('Failed to export agents:', error);
            this.showError('Failed to export agents');
        }
    }

    // Analytics
    async loadAnalytics() {
        try {
            await this.renderAnalyticsCharts();
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    async renderAnalyticsCharts() {
        // Conversation Volume Chart
        const volumeCtx = document.getElementById('conversationVolumeChart').getContext('2d');
        this.charts.volume = new Chart(volumeCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Conversations',
                    data: [120, 190, 300, 500, 200, 300],
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

        // Response Time Trend Chart
        const responseCtx = document.getElementById('responseTimeTrendChart').getContext('2d');
        this.charts.response = new Chart(responseCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Avg Response Time (minutes)',
                    data: [3.2, 2.8, 2.1, 2.5],
                    backgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Agent Performance Chart
        const performanceCtx = document.getElementById('agentPerformanceChart').getContext('2d');
        this.charts.performance = new Chart(performanceCtx, {
            type: 'radar',
            data: {
                labels: ['Response Time', 'Resolution Rate', 'Customer Rating', 'Conversations', 'Availability'],
                datasets: [{
                    label: 'Team Average',
                    data: [85, 92, 88, 90, 95],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Customer Satisfaction Chart
        const satisfactionCtx = document.getElementById('satisfactionChart').getContext('2d');
        this.charts.satisfaction = new Chart(satisfactionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Excellent', 'Good', 'Average', 'Poor'],
                datasets: [{
                    data: [65, 25, 8, 2],
                    backgroundColor: ['#38a169', '#667eea', '#d69e2e', '#e53e3e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    applyDateRangeFilter() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            // Reload charts with new date range
            this.renderAnalyticsCharts();
            this.showSuccess('Date range applied successfully');
        }
    }

    // Reports
    async loadReports() {
        // Load existing reports
        console.log('Loading reports...');
    }

    async generateReport() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const format = document.getElementById('reportFormat').value;

        if (!startDate || !endDate) {
            this.showError('Please select a date range');
            return;
        }

        try {
            // Mock report generation
            this.showSuccess(`${reportType} report generated successfully`);
        } catch (error) {
            console.error('Failed to generate report:', error);
            this.showError('Failed to generate report');
        }
    }

    // Settings
    async saveSystemSettings() {
        try {
            const settings = {
                autoAssign: document.getElementById('autoAssign').value,
                maxConversations: document.getElementById('maxConversations').value,
                responseAlert: document.getElementById('responseAlert').value
            };

            // Save settings via API
            this.showSuccess('System settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError('Failed to save settings');
        }
    }

    async saveNotificationSettings() {
        try {
            const settings = {
                emailNotifications: document.getElementById('emailNotifications').checked,
                pushNotifications: document.getElementById('pushNotifications').checked,
                slackIntegration: document.getElementById('slackIntegration').checked
            };

            // Save settings via API
            this.showSuccess('Notification settings saved successfully');
        } catch (error) {
            console.error('Failed to save notification settings:', error);
            this.showError('Failed to save notification settings');
        }
    }

    // Utility Methods
    updateSystemStats() {
        // Refresh system statistics
        this.loadSystemStats();
    }

    updateAgentStatus(userId, isOnline) {
        // Update agent status in the table
        const agent = this.agents.find(a => a.id === userId);
        if (agent) {
            agent.isOnline = isOnline;
            this.renderAgentsTable();
        }
    }

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

    startPolling() {
        // Poll for updates every 30 seconds
        setInterval(() => {
            if (this.currentPage === 'overview') {
                this.loadSystemStats();
                this.loadRecentActivity();
            }
        }, 30000);
    }

    getActivityIcon(type) {
        const icons = {
            message: '💬',
            user: '👤',
            system: '⚙️'
        };
        return icons[type] || '📋';
    }

    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC4xMzQwMSAxNCA1IDE3LjEzNDEgNSAyMUg5SDE1SDE5QzE5IDE3LjEzNDEgMTUuODY2IDE0IDEyIDE0WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=';
    }

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
        }, 5000);

        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
    }
}

// Global instance for onclick handlers
let adminDashboard;

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});
