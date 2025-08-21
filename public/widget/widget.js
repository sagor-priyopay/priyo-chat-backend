class PriyoWidget {
  constructor() {
    this.config = null;
    this.socket = null;
    this.isOpen = false;
    this.conversationId = null;
    this.userId = null;
    this.messageQueue = [];
    this.isConnected = false;
    this.elements = {};
  }

  init(config) {
    this.config = config;
    this.initElements();
    this.bindEvents();
    this.initializeUser();
    this.connectWebSocket();
    console.log('Priyo Widget initialized');
  }

  initElements() {
    this.elements = {
      chatButton: document.getElementById('priyo-chat-button'),
      chatWidget: document.getElementById('priyo-chat-widget'),
      messagesContainer: document.getElementById('priyo-messages-container'),
      messageInput: document.getElementById('priyo-message-input'),
      sendButton: document.getElementById('priyo-send-btn'),
      typingIndicator: document.getElementById('priyo-typing-indicator'),
      closeButton: document.getElementById('priyo-close-btn'),
      minimizeButton: document.getElementById('priyo-minimize-btn'),
      notificationBadge: document.getElementById('priyo-notification-badge'),
      notificationCount: document.getElementById('priyo-notification-count'),
      agentStatusText: document.getElementById('priyo-agent-status-text')
    };
  }

  bindEvents() {
    // Chat button click
    this.elements.chatButton.addEventListener('click', () => {
      this.toggleWidget();
    });

    // Close and minimize buttons
    this.elements.closeButton.addEventListener('click', () => {
      this.closeWidget();
    });

    this.elements.minimizeButton.addEventListener('click', () => {
      this.minimizeWidget();
    });

    // Message input
    this.elements.messageInput.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value);
    });

    this.elements.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.elements.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.messageQueue.length > 0) {
        this.clearNotifications();
      }
    });
  }

  async initializeUser() {
    try {
      // Generate or retrieve user ID
      this.userId = localStorage.getItem('priyo_user_id') || this.generateUserId();
      localStorage.setItem('priyo_user_id', this.userId);

      // Create or get conversation
      const response = await fetch(`${this.config.apiBaseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          widgetId: this.config.widgetId,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.conversationId = data.conversationId;
        this.loadConversationHistory();
      }
    } catch (error) {
      console.error('Failed to initialize user:', error);
    }
  }

  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  connectWebSocket() {
    try {
      this.socket = io(this.config.socketUrl, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.updateConnectionStatus('Online');
        
        if (this.conversationId) {
          this.socket.emit('join-conversation', this.conversationId);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.updateConnectionStatus('Offline');
      });

      this.socket.on('new-message', (message) => {
        this.handleIncomingMessage(message);
      });

      this.socket.on('agent-typing', (data) => {
        this.showTypingIndicator(data.isTyping);
      });

      this.socket.on('agent-status', (data) => {
        this.updateConnectionStatus(data.status);
      });

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.updateConnectionStatus('Offline');
    }
  }

  async loadConversationHistory() {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/conversations/${this.conversationId}/messages`);
      if (response.ok) {
        const messages = await response.json();
        this.renderMessages(messages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  toggleWidget() {
    if (this.isOpen) {
      this.closeWidget();
    } else {
      this.openWidget();
    }
  }

  openWidget() {
    this.elements.chatWidget.classList.add('priyo-open');
    this.isOpen = true;
    this.clearNotifications();
    this.elements.messageInput.focus();
    
    // Mark messages as read
    if (this.conversationId) {
      this.markMessagesAsRead();
    }
  }

  closeWidget() {
    this.elements.chatWidget.classList.remove('priyo-open');
    this.isOpen = false;
  }

  minimizeWidget() {
    this.closeWidget();
  }

  handleInputChange(value) {
    const isEmpty = value.trim().length === 0;
    this.elements.sendButton.disabled = isEmpty;

    // Send typing indicator to agents
    if (this.socket && this.conversationId) {
      this.socket.emit('user-typing', {
        conversationId: this.conversationId,
        isTyping: !isEmpty
      });
    }
  }

  async sendMessage() {
    const messageText = this.elements.messageInput.value.trim();
    if (!messageText) return;

    // Clear input
    this.elements.messageInput.value = '';
    this.elements.sendButton.disabled = true;

    // Add user message to UI
    this.addMessage({
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    });

    try {
      // Send to backend
      const response = await fetch(`${this.config.apiBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: this.conversationId,
          userId: this.userId,
          text: messageText,
          type: 'user'
        })
      });

      if (response.ok) {
        const message = await response.json();
        
        // Send via WebSocket for real-time delivery
        if (this.socket) {
          this.socket.emit('send-message', {
            conversationId: this.conversationId,
            message: message
          });
        }

        // Show typing indicator for AI/agent response
        this.showTypingIndicator(true);
        
        // Auto-hide typing after 3 seconds if no response
        setTimeout(() => {
          this.showTypingIndicator(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      this.showError('Failed to send message. Please try again.');
    }
  }

  handleIncomingMessage(message) {
    if (message.conversationId === this.conversationId) {
      this.showTypingIndicator(false);
      this.addMessage(message);
      
      // Show notification if widget is closed
      if (!this.isOpen) {
        this.showNotification(message.text);
      }
      
      // Play notification sound
      this.playNotificationSound();
    }
  }

  addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `priyo-message ${message.sender === 'user' ? 'priyo-user-message' : 'priyo-bot-message'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit', 
      minute: '2-digit'
    });

    if (message.sender === 'user') {
      messageElement.innerHTML = `
        <div class="priyo-message-avatar">U</div>
        <div class="priyo-message-content">
          <div class="priyo-message-text">${this.escapeHtml(message.text)}</div>
          <div class="priyo-message-time">${time}</div>
        </div>
      `;
    } else {
      messageElement.innerHTML = `
        <div class="priyo-message-avatar">
          <img src="https://i.imgur.com/4DB1BHj.png" alt="Agent" />
        </div>
        <div class="priyo-message-content">
          <div class="priyo-message-text">${this.escapeHtml(message.text)}</div>
          <div class="priyo-message-time">${time}</div>
        </div>
      `;
    }

    this.elements.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  renderMessages(messages) {
    // Clear existing messages except welcome message
    const welcomeMessage = this.elements.messagesContainer.querySelector('.priyo-welcome-message');
    this.elements.messagesContainer.innerHTML = '';
    
    if (welcomeMessage && messages.length === 0) {
      this.elements.messagesContainer.appendChild(welcomeMessage);
    }

    messages.forEach(message => {
      this.addMessage(message);
    });
  }

  showTypingIndicator(show) {
    this.elements.typingIndicator.style.display = show ? 'flex' : 'none';
    if (show) {
      this.scrollToBottom();
    }
  }

  showNotification(messageText) {
    // Update notification badge
    const currentCount = parseInt(this.elements.notificationCount.textContent) || 0;
    this.elements.notificationCount.textContent = currentCount + 1;
    this.elements.notificationBadge.style.display = 'flex';

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('New message from Priyo Support', {
        body: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
        icon: 'https://i.imgur.com/4DB1BHj.png',
        tag: 'priyo-chat'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  clearNotifications() {
    this.elements.notificationBadge.style.display = 'none';
    this.elements.notificationCount.textContent = '1';
    this.messageQueue = [];
  }

  async markMessagesAsRead() {
    try {
      await fetch(`${this.config.apiBaseUrl}/conversations/${this.conversationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: this.userId })
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  updateConnectionStatus(status) {
    this.elements.agentStatusText.textContent = status;
    
    const statusDot = document.querySelector('.priyo-status-dot');
    if (statusDot) {
      statusDot.style.background = status === 'Online' ? '#2ed573' : '#ff4757';
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

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'priyo-error-message';
    errorElement.textContent = message;
    errorElement.style.cssText = `
      background: #ff4757;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      margin: 8px 16px;
      font-size: 12px;
    `;
    
    this.elements.messagesContainer.appendChild(errorElement);
    
    setTimeout(() => {
      errorElement.remove();
    }, 3000);
  }

  scrollToBottom() {
    setTimeout(() => {
      this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }, 100);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API methods
  open() {
    this.openWidget();
  }

  close() {
    this.closeWidget();
  }

  sendCustomMessage(text) {
    this.elements.messageInput.value = text;
    this.sendMessage();
  }

  setUserInfo(email, name) {
    localStorage.setItem('priyo_user_email', email);
    localStorage.setItem('priyo_user_name', name);
    
    // Update backend with user info
    if (this.conversationId) {
      fetch(`${this.config.apiBaseUrl}/conversations/${this.conversationId}/user-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name })
      }).catch(error => {
        console.error('Failed to update user info:', error);
      });
    }
  }
}

// Initialize widget when script loads
window.PriyoWidget = new PriyoWidget();

// Load Socket.IO if not already loaded
if (typeof io === 'undefined') {
  const socketScript = document.createElement('script');
  socketScript.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
  socketScript.onload = () => {
    console.log('Socket.IO loaded');
  };
  document.head.appendChild(socketScript);
}
