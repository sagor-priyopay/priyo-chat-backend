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
    this.currentTab = 'chat';
    this.popupTimeout = null;
  }

  init(config) {
    this.config = config;
    this.initElements();
    this.bindEvents();
    this.initializeUser();
    this.connectWebSocket();
    this.showWelcomePopup();
    console.log('Priyo Widget initialized');
  }

  initElements() {
    this.elements = {
      chatBubble: document.getElementById('chatBubble'),
      chatWidget: document.getElementById('chatWidget'),
      bubblePopup: document.getElementById('bubblePopup'),
      bubbleArrow: document.getElementById('bubbleArrow'),
      chatBody: document.getElementById('chatBody'),
      chatInput: document.getElementById('chatInput'),
      sendBtn: document.getElementById('sendBtn'),
      chatCloseBtn: document.getElementById('chatCloseBtn'),
      popupCloseBtn: document.getElementById('popupCloseBtn'),
      tabChatBtn: document.getElementById('tabChatBtn'),
      tabHelpBtn: document.getElementById('tabHelpBtn'),
      tabChat: document.getElementById('tabChat'),
      tabHelp: document.getElementById('tabHelp'),
      typingIndicator: document.getElementById('typingIndicator'),
      openHelpBtn: document.getElementById('openHelpBtn')
    };
  }

  bindEvents() {
    // Chat bubble click to open widget
    this.elements.chatBubble.addEventListener('click', () => {
      this.openWidget();
    });

    // Close button
    this.elements.chatCloseBtn.addEventListener('click', () => {
      this.closeWidget();
    });

    // Popup close button
    this.elements.popupCloseBtn.addEventListener('click', () => {
      this.hideWelcomePopup();
    });

    // Tab switching
    this.elements.tabChatBtn.addEventListener('click', () => {
      this.switchTab('chat');
    });

    this.elements.tabHelpBtn.addEventListener('click', () => {
      this.switchTab('help');
    });

    // Help button
    this.elements.openHelpBtn.addEventListener('click', () => {
      window.open('https://help.priyopay.com', '_blank');
    });

    // Message input
    this.elements.chatInput.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value);
    });

    this.elements.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.elements.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.messageQueue.length > 0) {
        this.clearNotifications();
      }
    });

    // Hide popup when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.bubblePopup.contains(e.target) && 
          !this.elements.chatBubble.contains(e.target)) {
        this.hideWelcomePopup();
      }
    });
  }

  async initializeUser() {
    try {
      // Generate or retrieve user ID
      this.userId = localStorage.getItem('priyo_user_id') || this.generateUserId();
      localStorage.setItem('priyo_user_id', this.userId);

      // Create or get conversation
      const response = await fetch(`${this.config.apiBaseUrl}/widget/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: this.userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.conversationId = data.conversation.id;
          this.renderMessages(data.conversation.messages);
          if (this.socket && this.socket.connected) {
            this.socket.emit('join-conversation', this.conversationId);
          }
        }
      } else {
        console.error('Failed to initialize conversation:', await response.text());
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
    if (!this.conversationId) return;
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/widget/conversation/${this.conversationId}/messages?visitorId=${this.userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.renderMessages(data.messages);
        }
      } else {
        console.error('Failed to load conversation history:', await response.text());
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  switchTab(tab) {
    // Update tab buttons
    this.elements.tabChatBtn.classList.remove('active');
    this.elements.tabHelpBtn.classList.remove('active');
    
    // Hide all tab content
    this.elements.tabChat.style.display = 'none';
    this.elements.tabHelp.style.display = 'none';
    
    // Show selected tab
    if (tab === 'chat') {
      this.elements.tabChatBtn.classList.add('active');
      this.elements.tabChat.style.display = 'block';
      this.elements.chatInput.focus();
    } else if (tab === 'help') {
      this.elements.tabHelpBtn.classList.add('active');
      this.elements.tabHelp.style.display = 'block';
    }
    
    this.currentTab = tab;
  }

  showWelcomePopup() {
    // Show popup after 2 seconds
    this.popupTimeout = setTimeout(() => {
      this.elements.bubblePopup.classList.add('show');
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        this.hideWelcomePopup();
      }, 8000);
    }, 2000);
  }

  hideWelcomePopup() {
    this.elements.bubblePopup.classList.remove('show');
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = null;
    }
  }

  openWidget() {
    this.elements.chatWidget.style.display = 'flex';
    this.elements.bubbleArrow.classList.add('show');
    this.hideWelcomePopup();
    this.isOpen = true;
    this.clearNotifications();
    this.elements.chatInput.focus();
    
    // Mark messages as read
    if (this.conversationId) {
      this.markMessagesAsRead();
    }
  }

  closeWidget() {
    this.elements.chatWidget.style.display = 'none';
    this.elements.bubbleArrow.classList.remove('show');
    this.isOpen = false;
  }

  handleInputChange(value) {
    const isEmpty = value.trim().length === 0;
    this.elements.sendBtn.disabled = isEmpty;

    // Send typing indicator to agents
    if (this.socket && this.conversationId) {
      this.socket.emit('user-typing', {
        conversationId: this.conversationId,
        isTyping: !isEmpty
      });
    }
  }

  async sendMessage() {
    const messageText = this.elements.chatInput.value.trim();
    if (!messageText) return;

    // Clear input
    this.elements.chatInput.value = '';
    this.elements.sendBtn.disabled = true;

    // Add user message to UI
    this.addMessage({
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    });

    try {
      // Send to backend
      const response = await fetch(`${this.config.apiBaseUrl}/widget/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: this.conversationId,
          visitorId: this.userId,
          message: messageText
        })
      });

      if (!response.ok) {
        this.showError('Failed to send message. Please try again.');
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
    messageElement.className = `message ${message.sender === 'user' ? 'user' : 'bot'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit', 
      minute: '2-digit'
    });

    if (message.sender === 'user') {
      messageElement.innerHTML = `
        <div class="message-text">${this.escapeHtml(message.text)}</div>
      `;
    } else {
      messageElement.innerHTML = `
        <div class="avatar bot"></div>
        <div class="message-text">${this.escapeHtml(message.text)}</div>
      `;
    }

    this.elements.chatBody.appendChild(messageElement);
    this.scrollToBottom();
  }

  renderMessages(messages) {
    // Clear existing messages
    this.elements.chatBody.innerHTML = '';
    
    // Add welcome message if no messages
    if (messages.length === 0) {
      this.addWelcomeMessage();
    }

    messages.forEach(message => {
      this.addMessage(message);
    });
  }

  addWelcomeMessage() {
    const welcomeElement = document.createElement('div');
    welcomeElement.className = 'message bot';
    welcomeElement.innerHTML = `
      <div class="avatar bot"></div>
      <div class="message-text">Hello! 👋 Welcome to Priyo Pay. How can I help you today?</div>
    `;
    this.elements.chatBody.appendChild(welcomeElement);
  }

  showTypingIndicator(show) {
    this.elements.typingIndicator.style.display = show ? 'block' : 'none';
    if (show) {
      this.scrollToBottom();
    }
  }

  showNotification(messageText) {
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('New message from Priyo Support', {
        body: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
        icon: '/widget/chat-icon.png',
        tag: 'priyo-chat'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  clearNotifications() {
    this.messageQueue = [];
  }

  async markMessagesAsRead() {
    // try {
    //   await fetch(`${this.config.apiBaseUrl}/conversations/${this.conversationId}/read`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ userId: this.userId })
    //   });
    // } catch (error) {
    //   console.error('Failed to mark messages as read:', error);
    // }
  }

  updateConnectionStatus(status) {
    // Connection status can be logged or displayed elsewhere if needed
    console.log(`Connection status: ${status}`);
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
    errorElement.className = 'message bot error';
    errorElement.innerHTML = `
      <div class="avatar bot"></div>
      <div class="message-text" style="background: #ff4757; color: white;">${message}</div>
    `;
    
    this.elements.chatBody.appendChild(errorElement);
    this.scrollToBottom();
    
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  scrollToBottom() {
    setTimeout(() => {
      this.elements.chatBody.scrollTop = this.elements.chatBody.scrollHeight;
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
    this.elements.chatInput.value = text;
    this.sendMessage();
  }

  setUserInfo(email, name) {
    localStorage.setItem('priyo_user_email', email);
    localStorage.setItem('priyo_user_name', name);
    
    // Update backend with user info
    // if (this.conversationId) {
    //   fetch(`${this.config.apiBaseUrl}/conversations/${this.conversationId}/user-info`, {
    //     method: 'PUT',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ email, name })
    //   }).catch(error => {
    //     console.error('Failed to update user info:', error);
    //   });
    // }
  }
}

// Initialize widget when script loads
window.PriyoWidget = new PriyoWidget();

// Load Socket.IO if not already loaded
if (typeof io === 'undefined') {
  const socketScript = document.createElement('script');
  socketScript.src = '/widget/socket.io.min.js';
  socketScript.onload = () => {
    console.log('Socket.IO loaded');
  };
  document.head.appendChild(socketScript);
}
