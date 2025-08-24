/**
 * Priyo Chat Agent Dashboard - Ticket Management
 * Handles ticket/conversation listing, filtering, and management
 */

class TicketManager {
    constructor() {
        this.tickets = [];
        this.filteredTickets = [];
        this.currentFilters = {
            status: 'all',
            search: '',
            priority: 'all',
            assigned: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = CONFIG.DASHBOARD.TICKETS_PER_PAGE;
        this.selectedTicket = null;
        this.eventEmitter = Utils.createEventEmitter();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTickets();
        this.setupAutoRefresh();
    }

    setupEventListeners() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const status = e.target.dataset.status;
                this.setStatusFilter(status);
            });
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((value) => {
                this.setSearchFilter(value);
            }, CONFIG.PERFORMANCE.DEBOUNCE_DELAY);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }

        // Priority filter
        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.setPriorityFilter(e.target.value);
            });
        }

        // Assigned filter
        const assignedFilter = document.getElementById('assignedFilter');
        if (assignedFilter) {
            assignedFilter.addEventListener('change', (e) => {
                this.setAssignedFilter(e.target.value);
            });
        }

        // Refresh button
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.loadTickets(true);
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page);
            }
        });
    }

    async loadTickets(force = false) {
        try {
            const loadingElement = Utils.showLoading(document.getElementById('ticketList'), 'Loading tickets...');

            // Use cache if not forcing refresh
            const cacheKey = `tickets_${JSON.stringify(this.currentFilters)}`;
            const fetcher = () => API.getConversations(this.currentFilters);

            const response = force ? 
                await fetcher() : 
                await API.getCached(cacheKey, fetcher);

            if (response.conversations) {
                this.tickets = this.transformTickets(response.conversations);
                this.applyFilters();
                this.renderTickets();
                this.updateTicketCounts();
            }

            Utils.hideLoading(document.getElementById('ticketList'));
        } catch (error) {
            Utils.log.error('Failed to load tickets:', error);
            Utils.showToast('Failed to load tickets', 'error');
            Utils.hideLoading(document.getElementById('ticketList'));
            this.renderError();
        }
    }

    transformTickets(conversations) {
        return conversations.map(conv => ({
            id: conv.id,
            customer: this.getCustomerInfo(conv.participants),
            subject: this.generateSubject(conv),
            preview: this.getLastMessagePreview(conv.lastMessage),
            status: this.determineStatus(conv),
            priority: this.determinePriority(conv),
            assignedTo: this.getAssignedAgent(conv.participants),
            unreadCount: conv.unreadCount || 0,
            lastActivity: conv.updatedAt,
            createdAt: conv.createdAt,
            isActive: conv.isActive !== false,
            metadata: {
                participantCount: conv.participants.length,
                messageCount: conv.messageCount || 0,
                tags: conv.tags || []
            }
        }));
    }

    getCustomerInfo(participants) {
        const customer = participants.find(p => p.role === 'CUSTOMER');
        return customer ? {
            id: customer.id,
            name: customer.username,
            email: customer.email,
            avatar: customer.avatar,
            isOnline: customer.isOnline
        } : {
            id: 'unknown',
            name: 'Unknown Customer',
            email: '',
            avatar: null,
            isOnline: false
        };
    }

    generateSubject(conversation) {
        if (conversation.name) {
            return conversation.name;
        }
        
        // Generate subject from last message or default
        if (conversation.lastMessage) {
            return conversation.lastMessage.content.substring(0, 50) + '...';
        }
        
        return 'New Conversation';
    }

    getLastMessagePreview(lastMessage) {
        if (!lastMessage) {
            return 'No messages yet';
        }

        let preview = lastMessage.content;
        if (preview.length > 100) {
            preview = preview.substring(0, 100) + '...';
        }

        return preview;
    }

    determineStatus(conversation) {
        // This would typically come from the backend
        // For now, we'll use some heuristics
        if (!conversation.isActive) {
            return 'CLOSED';
        }
        
        if (conversation.lastMessage) {
            const lastMessageTime = new Date(conversation.lastMessage.createdAt);
            const hoursSinceLastMessage = (Date.now() - lastMessageTime) / (1000 * 60 * 60);
            
            if (hoursSinceLastMessage > 24) {
                return 'PENDING';
            }
        }
        
        return 'IN_PROGRESS';
    }

    determinePriority(conversation) {
        // This would typically come from the backend
        // For now, we'll use some heuristics
        if (conversation.unreadCount > 5) {
            return 'HIGH';
        }
        
        if (conversation.unreadCount > 2) {
            return 'MEDIUM';
        }
        
        return 'LOW';
    }

    getAssignedAgent(participants) {
        const agent = participants.find(p => p.role === 'AGENT' || p.role === 'ADMIN');
        return agent ? {
            id: agent.id,
            name: agent.username,
            avatar: agent.avatar
        } : null;
    }

    setStatusFilter(status) {
        this.currentFilters.status = status;
        this.currentPage = 1;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.status === status);
        });
        
        this.applyFilters();
        this.renderTickets();
    }

    setSearchFilter(search) {
        this.currentFilters.search = search.toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
        this.renderTickets();
    }

    setPriorityFilter(priority) {
        this.currentFilters.priority = priority;
        this.currentPage = 1;
        this.applyFilters();
        this.renderTickets();
    }

    setAssignedFilter(assigned) {
        this.currentFilters.assigned = assigned;
        this.currentPage = 1;
        this.applyFilters();
        this.renderTickets();
    }

    applyFilters() {
        this.filteredTickets = this.tickets.filter(ticket => {
            // Status filter
            if (this.currentFilters.status !== 'all' && ticket.status !== this.currentFilters.status) {
                return false;
            }

            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search;
                const searchableText = [
                    ticket.customer.name,
                    ticket.customer.email,
                    ticket.subject,
                    ticket.preview
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Priority filter
            if (this.currentFilters.priority !== 'all' && ticket.priority !== this.currentFilters.priority) {
                return false;
            }

            // Assigned filter
            if (this.currentFilters.assigned !== 'all') {
                const currentUser = Auth.getCurrentUser();
                if (this.currentFilters.assigned === 'me') {
                    if (!ticket.assignedTo || ticket.assignedTo.id !== currentUser.id) {
                        return false;
                    }
                } else if (this.currentFilters.assigned === 'unassigned') {
                    if (ticket.assignedTo) {
                        return false;
                    }
                }
            }

            return true;
        });

        // Sort tickets
        this.filteredTickets.sort((a, b) => {
            // Unread tickets first
            if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
            if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
            
            // Then by last activity
            return new Date(b.lastActivity) - new Date(a.lastActivity);
        });
    }

    renderTickets() {
        const ticketList = document.getElementById('ticketList');
        if (!ticketList) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTickets = this.filteredTickets.slice(startIndex, endIndex);

        if (pageTickets.length === 0) {
            this.renderEmptyState();
            return;
        }

        const ticketsHtml = pageTickets.map(ticket => this.renderTicketItem(ticket)).join('');
        ticketList.innerHTML = ticketsHtml;

        // Add click listeners
        ticketList.querySelectorAll('.ticket-item').forEach(item => {
            item.addEventListener('click', () => {
                const ticketId = item.dataset.ticketId;
                this.selectTicket(ticketId);
            });
        });

        this.renderPagination();
    }

    renderTicketItem(ticket) {
        const isSelected = this.selectedTicket && this.selectedTicket.id === ticket.id;
        const statusConfig = CONFIG.TICKET_STATUS[ticket.status] || CONFIG.TICKET_STATUS.PENDING;
        const priorityConfig = CONFIG.PRIORITY_LEVELS[ticket.priority] || CONFIG.PRIORITY_LEVELS.LOW;

        return `
            <div class="ticket-item ${isSelected ? 'active' : ''} ${ticket.unreadCount > 0 ? 'unread' : ''}" 
                 data-ticket-id="${ticket.id}">
                <div class="ticket-avatar">
                    ${this.renderAvatar(ticket.customer)}
                </div>
                <div class="ticket-content">
                    <div class="ticket-header">
                        <div class="ticket-customer">${Utils.escapeHtml(ticket.customer.name)}</div>
                        <div class="ticket-time">${Utils.formatRelativeTime(ticket.lastActivity)}</div>
                    </div>
                    <div class="ticket-subject">${Utils.escapeHtml(ticket.subject)}</div>
                    <div class="ticket-preview">${Utils.escapeHtml(ticket.preview)}</div>
                    <div class="ticket-meta">
                        <div class="ticket-badges">
                            <span class="badge status-${ticket.status.toLowerCase()}" 
                                  style="background-color: ${statusConfig.color}20; color: ${statusConfig.color};">
                                ${statusConfig.label}
                            </span>
                            <span class="badge priority-${ticket.priority.toLowerCase()}"
                                  style="background-color: ${priorityConfig.color}20; color: ${priorityConfig.color};">
                                ${priorityConfig.label}
                            </span>
                            ${ticket.assignedTo ? `
                                <span class="badge badge-secondary">
                                    ${Utils.escapeHtml(ticket.assignedTo.name)}
                                </span>
                            ` : ''}
                        </div>
                        ${ticket.unreadCount > 0 ? `
                            <div class="unread-count">${ticket.unreadCount}</div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderAvatar(customer) {
        if (customer.avatar) {
            return `<img src="${customer.avatar}" alt="${Utils.escapeHtml(customer.name)}" class="avatar avatar-md">`;
        }

        const initials = Utils.getInitials(customer.name);
        const color = Utils.getAvatarColor(customer.name);

        return `
            <div class="avatar avatar-md" style="background-color: ${color}; color: white;">
                ${initials}
            </div>
        `;
    }

    renderEmptyState() {
        const ticketList = document.getElementById('ticketList');
        if (!ticketList) return;

        const emptyStateHtml = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div class="empty-state-title">No tickets found</div>
                <div class="empty-state-description">
                    ${this.currentFilters.search ? 
                        'Try adjusting your search criteria or filters.' : 
                        'No tickets match the current filters.'
                    }
                </div>
                <button class="btn btn-primary" onclick="TicketManager.instance.clearFilters()">
                    Clear Filters
                </button>
            </div>
        `;

        ticketList.innerHTML = emptyStateHtml;
        this.renderPagination();
    }

    renderError() {
        const ticketList = document.getElementById('ticketList');
        if (!ticketList) return;

        ticketList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="empty-state-title">Failed to load tickets</div>
                <div class="empty-state-description">
                    There was an error loading your tickets. Please try again.
                </div>
                <button class="btn btn-primary" onclick="TicketManager.instance.loadTickets(true)">
                    Retry
                </button>
            </div>
        `;
    }

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredTickets.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHtml = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHtml += `
                <button class="pagination-btn" data-page="${this.currentPage - 1}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHtml += '<span class="pagination-ellipsis">...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += '<span class="pagination-ellipsis">...</span>';
            }
            paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHtml += `
                <button class="pagination-btn" data-page="${this.currentPage + 1}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                </button>
            `;
        }

        paginationHtml += '</div>';
        paginationContainer.innerHTML = paginationHtml;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTickets();
    }

    selectTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        this.selectedTicket = ticket;
        this.eventEmitter.emit('ticketSelected', ticket);
        
        // Update UI
        document.querySelectorAll('.ticket-item').forEach(item => {
            item.classList.toggle('active', item.dataset.ticketId === ticketId);
        });

        // Mark as read if it has unread messages
        if (ticket.unreadCount > 0) {
            this.markTicketAsRead(ticket);
        }
    }

    async markTicketAsRead(ticket) {
        try {
            // This would typically get the actual message IDs
            // For now, we'll just update the local state
            ticket.unreadCount = 0;
            this.renderTickets();
            this.updateTicketCounts();
        } catch (error) {
            Utils.log.error('Failed to mark ticket as read:', error);
        }
    }

    async updateTicketStatus(ticketId, status) {
        try {
            await API.updateConversationStatus(ticketId, status);
            
            // Update local state
            const ticket = this.tickets.find(t => t.id === ticketId);
            if (ticket) {
                ticket.status = status;
                this.applyFilters();
                this.renderTickets();
                this.updateTicketCounts();
            }

            Utils.showToast(CONFIG.SUCCESS.STATUS_UPDATED, 'success');
        } catch (error) {
            Utils.log.error('Failed to update ticket status:', error);
            Utils.showToast('Failed to update ticket status', 'error');
        }
    }

    updateTicketCounts() {
        const statusCounts = {
            all: this.tickets.length,
            PENDING: this.tickets.filter(t => t.status === 'PENDING').length,
            IN_PROGRESS: this.tickets.filter(t => t.status === 'IN_PROGRESS').length,
            SOLVED: this.tickets.filter(t => t.status === 'SOLVED').length,
            CLOSED: this.tickets.filter(t => t.status === 'CLOSED').length
        };

        // Update filter tab counts
        document.querySelectorAll('.filter-tab').forEach(tab => {
            const status = tab.dataset.status;
            const count = statusCounts[status] || 0;
            const countElement = tab.querySelector('.count');
            if (countElement) {
                countElement.textContent = count;
            }
        });

        // Update total unread count
        const totalUnread = this.tickets.reduce((sum, ticket) => sum + ticket.unreadCount, 0);
        this.eventEmitter.emit('unreadCountChanged', totalUnread);
    }

    clearFilters() {
        this.currentFilters = {
            status: 'all',
            search: '',
            priority: 'all',
            assigned: 'all'
        };
        this.currentPage = 1;

        // Reset UI
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.status === 'all');
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) priorityFilter.value = 'all';

        const assignedFilter = document.getElementById('assignedFilter');
        if (assignedFilter) assignedFilter.value = 'all';

        this.applyFilters();
        this.renderTickets();
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadTickets();
            }
        }, CONFIG.DASHBOARD.AUTO_REFRESH_INTERVAL);
    }

    getSelectedTicket() {
        return this.selectedTicket;
    }

    refreshTicket(ticketId) {
        // Refresh a specific ticket
        this.loadTickets();
    }

    // Event subscription methods
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }

    off(event, callback) {
        this.eventEmitter.off(event, callback);
    }
}

// Create singleton instance
const TicketManagerInstance = new TicketManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TicketManager, TicketManagerInstance };
}

// Global access
window.TicketManager = TicketManager;
window.TicketManager.instance = TicketManagerInstance;
