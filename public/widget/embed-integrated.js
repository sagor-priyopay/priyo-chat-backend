(function() {
  // Widget configuration
  const config = {
    apiBaseUrl: window.PRIYO_WIDGET_CONFIG?.apiBaseUrl || 'https://priyo-chat-64wg.onrender.com/api',
    socketUrl: window.PRIYO_WIDGET_CONFIG?.socketUrl || 'https://priyo-chat-64wg.onrender.com',
    widgetId: window.PRIYO_WIDGET_CONFIG?.widgetId || 'default-widget'
  };

  // Create widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'priyo-widget-container';
  widgetContainer.innerHTML = `
    <!-- Chat Button -->
    <div id="priyo-chat-button" class="priyo-chat-button">
      <div class="priyo-button-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <div class="priyo-notification-badge" id="priyo-notification-badge" style="display: none;">
        <span id="priyo-notification-count">1</span>
      </div>
    </div>

    <!-- Chat Widget -->
    <div id="priyo-chat-widget" class="priyo-chat-widget">
      <!-- Header -->
      <div class="priyo-chat-header">
        <div class="priyo-header-info">
          <div class="priyo-agent-avatar">
            <img src="https://i.imgur.com/4DB1BHj.png" alt="Agent" />
          </div>
          <div class="priyo-agent-details">
            <div class="priyo-agent-name">Priyo Support</div>
            <div class="priyo-agent-status">
              <span class="priyo-status-dot"></span>
              <span id="priyo-agent-status-text">Online</span>
            </div>
          </div>
        </div>
        <div class="priyo-header-actions">
          <button id="priyo-minimize-btn" class="priyo-header-btn" title="Minimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
          <button id="priyo-close-btn" class="priyo-header-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages Container -->
      <div id="priyo-messages-container" class="priyo-messages-container">
        <div class="priyo-welcome-message">
          <div class="priyo-message priyo-bot-message">
            <div class="priyo-message-avatar">
              <img src="https://i.imgur.com/4DB1BHj.png" alt="Bot" />
            </div>
            <div class="priyo-message-content">
              <div class="priyo-message-text">Hello! 👋 Welcome to Priyo Pay. How can I help you today?</div>
              <div class="priyo-message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div id="priyo-typing-indicator" class="priyo-typing-indicator" style="display: none;">
        <div class="priyo-typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="priyo-typing-text">Agent is typing...</span>
      </div>

      <!-- Input Area -->
      <div class="priyo-input-area">
        <div class="priyo-input-container">
          <input 
            type="text" 
            id="priyo-message-input" 
            placeholder="Type your message..." 
            maxlength="1000"
          />
          <button id="priyo-send-btn" class="priyo-send-btn" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div class="priyo-input-footer">
          <span class="priyo-powered-by">Powered by Priyo Pay</span>
        </div>
      </div>
    </div>
  `;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    /* Widget Styles */
    #priyo-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .priyo-chat-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      position: relative;
    }

    .priyo-chat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    .priyo-notification-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ff4757;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }

    .priyo-chat-widget {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s ease;
    }

    .priyo-chat-widget.priyo-open {
      display: flex;
      transform: translateY(0);
      opacity: 1;
    }

    .priyo-chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .priyo-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .priyo-agent-avatar img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .priyo-agent-name {
      font-weight: 600;
      font-size: 16px;
    }

    .priyo-agent-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.9;
    }

    .priyo-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2ed573;
    }

    .priyo-header-actions {
      display: flex;
      gap: 8px;
    }

    .priyo-header-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .priyo-header-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }

    .priyo-messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8f9fa;
    }

    .priyo-message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .priyo-user-message {
      flex-direction: row-reverse;
    }

    .priyo-message-avatar img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }

    .priyo-user-message .priyo-message-avatar {
      background: #667eea;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .priyo-message-content {
      max-width: 70%;
    }

    .priyo-message-text {
      background: white;
      padding: 12px 16px;
      border-radius: 18px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      word-wrap: break-word;
    }

    .priyo-user-message .priyo-message-text {
      background: #667eea;
      color: white;
    }

    .priyo-message-time {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      padding: 0 4px;
    }

    .priyo-typing-indicator {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8f9fa;
    }

    .priyo-typing-dots {
      display: flex;
      gap: 4px;
    }

    .priyo-typing-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: priyo-typing 1.4s infinite ease-in-out;
    }

    .priyo-typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .priyo-typing-dots span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes priyo-typing {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .priyo-typing-text {
      font-size: 12px;
      color: #666;
    }

    .priyo-input-area {
      border-top: 1px solid #e9ecef;
      background: white;
    }

    .priyo-input-container {
      display: flex;
      padding: 16px;
      gap: 12px;
      align-items: flex-end;
    }

    #priyo-message-input {
      flex: 1;
      border: 1px solid #e9ecef;
      border-radius: 20px;
      padding: 12px 16px;
      font-size: 14px;
      outline: none;
      resize: none;
      max-height: 100px;
    }

    #priyo-message-input:focus {
      border-color: #667eea;
    }

    .priyo-send-btn {
      background: #667eea;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
    }

    .priyo-send-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .priyo-send-btn:not(:disabled):hover {
      background: #5a67d8;
      transform: scale(1.05);
    }

    .priyo-input-footer {
      padding: 8px 16px;
      text-align: center;
      border-top: 1px solid #f1f3f4;
    }

    .priyo-powered-by {
      font-size: 11px;
      color: #999;
    }

    /* Mobile Responsive */
    @media (max-width: 480px) {
      .priyo-chat-widget {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        bottom: 80px;
        right: 20px;
      }
    }
  `;

  // Append to document
  document.head.appendChild(style);
  document.body.appendChild(widgetContainer);

  // Load widget script
  const script = document.createElement('script');
  script.src = '/widget/widget.js';
  script.onload = function() {
    if (window.PriyoWidget) {
      window.PriyoWidget.init(config);
    }
  };
  document.body.appendChild(script);
})();
