(function() {
  // Widget configuration
  const config = {
    apiBaseUrl: window.PRIYO_WIDGET_CONFIG?.apiBaseUrl || 'https://priyo-chat-backend-64wg.onrender.com/api',
    socketUrl: window.PRIYO_WIDGET_CONFIG?.socketUrl || 'https://priyo-chat-backend-64wg.onrender.com',
    widgetId: window.PRIYO_WIDGET_CONFIG?.widgetId || 'default-widget'
  };

  // Create widget container with user's exact HTML structure
  const widgetContainer = document.createElement('div');
  widgetContainer.innerHTML = `
    <!-- Chat bubble -->
    <div id="chatBubble">
      <img src="/widget/chat-icon.png" alt="Chat" />
    </div>

    <!-- Arrow above bubble (visible when widget open) -->
    <div id="bubbleArrow"></div>

    <!-- Welcome popup (from bubble) -->
    <div id="bubblePopup">
      <div class="popup-arrow"></div>
      <div id="popupContent">
        <span id="popupMessage">Hello! 👋 Welcome to Priyo Pay. How can I help you today?</span>
        <button id="popupCloseBtn">&times;</button>
      </div>
    </div>

    <!-- Chat widget -->
    <div id="chatWidget">
      <div class="chat-header">
        <img src="/widget/logo.png" alt="Priyo Pay Logo"/>
        <span id="chatCloseBtn">&times;</span>
      </div>

      <div class="chat-tabs">
        <div class="chat-tab active" id="tabChatBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
          Chat
        </div>
        <div class="chat-tab" id="tabHelpBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm1-7.75c-.34.17-.5.5-.5.75h-2a2.003 2.003 0 0 1 1.5-1.95V7h-1v-2h2v2.25z"/>
          </svg>
          Help
        </div>
      </div>

      <div id="tabChat">
        <div id="chatBody"></div>
        <div id="typingIndicator">Priyo agent is typing...</div>
      </div>

      <div id="tabHelp" style="display: none;">
        <div style="height:100%; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
          <div>
            <p style="margin:0 0 8px 0; font-weight:600;">Open the help center</p>
            <p style="margin:0 0 12px 0; color:#666;">Clicking Help opens our full helpdesk in a new tab.</p>
            <button id="openHelpBtn" style="padding:8px 12px; border-radius:6px; border:0; background:#E60023; color:#fff; cursor:pointer;">Open Help Center</button>
          </div>
        </div>
      </div>

      <div class="chat-footer" aria-hidden="false">
        <input id="chatInput" type="text" placeholder="Type your message..." />
        <button id="sendBtn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="white">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Inject user's exact CSS
  const style = document.createElement('style');
  style.textContent = `
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Chat bubble */
    #chatBubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #E60023;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      user-select: none;
      animation: pulse 2s infinite;
      transition: transform 0.3s ease;
    }

    #chatBubble img {
      width: 58px;
      height: 58px;
      user-select: none;
      pointer-events: none;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(230, 0, 35, 0.7); }
      50% { box-shadow: 0 0 12px 10px rgba(230, 0, 35, 0.3); }
    }

    /* Arrow above bubble (visible when widget open) */
    #bubbleArrow {
      position: fixed;
      bottom: calc(20px + 56px + 8px);
      right: 20px;
      width: 56px;
      height: 20px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 10002;
      transform-origin: center bottom;
    }

    #bubbleArrow::before {
      content: "";
      position: absolute;
      left: 50%;
      transform: translateX(-50%) rotate(0deg);
      bottom: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-bottom: 16px solid #E60023;
      width: 0;
      height: 0;
    }

    /* show arrow state */
    #bubbleArrow.show {
      opacity: 1;
      transform: translateY(-4px);
      animation: bounce 2.5s infinite ease-in-out;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    /* Chat widget */
    #chatWidget {
      position: fixed;
      bottom: 110px;
      right: 20px;
      width: 360px;
      height: 560px;
      background-color: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 10003;
      user-select: none;
      animation: slideUp 0.4s ease forwards;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-header {
      background: #000;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 20px 20px 0 0;
      flex-shrink: 0;
      position: relative;
    }

    .chat-header img {
      width: 120px;
      user-select: none;
    }

    #chatCloseBtn {
      color: #fff;
      font-size: 26px;
      cursor: pointer;
      user-select: none;
    }
    #chatCloseBtn:hover {
      color: #ff4d4d;
      transform: scale(1.15);
      transition: color 0.25s ease, transform 0.25s ease;
    }

    /* Welcome popup (from bubble) */
    #bubblePopup {
      position: fixed;
      bottom: calc(20px + 56px + 6px);
      right: calc(20px + 64px);
      max-width: 260px;
      background: #E60023;
      color: white;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 6px 22px rgba(0,0,0,0.25);
      font-size: 14px;
      font-weight: 600;
      display: block;
      align-items: center;
      justify-content: space-between;
      z-index: 10004;
      user-select: none;
      opacity: 0;
      transform: translateY(8px) scale(0.98);
      pointer-events: none;
      transition: opacity 0.35s cubic-bezier(.2,.9,.2,1), transform 0.35s cubic-bezier(.2,.9,.2,1);
    }

    /* visible state */
    #bubblePopup.show {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* little arrow on the popup pointing to bubble */
    .popup-arrow {
      position: absolute;
      bottom: -8px;
      right: 22px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid #E60023;
    }

    #popupContent {
      display: flex;
      align-items: center;
      width: 100%;
    }

    #popupMessage {
      flex: 1;
      margin-right: 10px;
    }

    #popupCloseBtn {
      background: transparent;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      font-weight: 700;
    }

    #popupCloseBtn:hover {
      color: #ff9999;
    }

    /* Tabs */
    .chat-tabs {
      display: flex;
      justify-content: center;
      gap: 12px;
      background: #000;
      padding: 8px 10px;
      border-radius: 0 0 20px 20px;
      flex-shrink: 0;
    }

    .chat-tab {
      flex: 1;
      max-width: 110px;
      padding: 8px 14px;
      border-radius: 25px;
      background: #222;
      color: #fff;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: transform 0.2s ease, background-color 0.2s ease;
    }

    .chat-tab:hover {
      transform: scale(1.05);
      background: #444;
    }

    .chat-tab.active {
      background: #E60023;
    }

    .chat-tab.active:hover {
      background: #ff1a3c;
    }

    /* Each tab content is a flex child, with its own scrolling area */
    #tabChat, #tabHelp {
      padding: 10px;
      flex: 1 1 auto;
      overflow: hidden;
      display: none;
      box-sizing: border-box;
    }

    #tabChat {
      display: block;
    }

    /* Chat body is the scrollable column */
    #chatBody {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      padding: 12px;
      box-sizing: border-box;
      scroll-behavior: smooth;
    }

    /* Footer */
    .chat-footer {
      display: flex;
      gap: 10px;
      padding: 10px;
      align-items: center;
      background: #f2f2f2;
      border-radius: 0 0 20px 20px;
      flex-shrink: 0;
      box-sizing: border-box;
      position: relative;
    }

    .chat-footer[aria-hidden="true"] {
      visibility: hidden;
      pointer-events: none;
      opacity: 0;
      display: none;
    }

    .chat-footer[aria-hidden="false"] {
      visibility: visible;
      pointer-events: auto;
      opacity: 1;
      display: flex;
    }

    #chatInput {
      flex: 1;
      padding: 10px 14px;
      border-radius: 25px;
      border: 1px solid #ccc;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    }

    #sendBtn {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #E60023;
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .message {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .message.user {
      justify-content: flex-end;
      text-align: right;
    }

    .message-text {
      max-width: 75%;
      padding: 10px 16px;
      border-radius: 20px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .message.bot .message-text {
      background: #f0f0f0;
      color: #000;
      border-bottom-left-radius: 0;
    }

    .message.user .message-text {
      background: #E60023;
      color: #fff;
      border-bottom-right-radius: 0;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }

    .avatar.bot {
      background-image: url('/widget/chat-icon.png');
    }

    #typingIndicator {
      font-style: italic;
      color: #666;
      font-size: 13px;
      display: none;
      margin-top: 6px;
    }

    @media (max-width: 480px) {
      #chatWidget {
        width: 95vw;
        height: 60vh;
        right: 2.5vw;
        bottom: 80px;
      }
      #bubblePopup {
        right: 12px;
        bottom: calc(20px + 56px + 10px);
        max-width: 70vw;
      }
    }
  `;

  // Append to document
  document.head.appendChild(style);
  document.body.appendChild(widgetContainer);

  // Load widget script with backend integration
  const script = document.createElement('script');
  script.src = '/widget/widget.js';
  script.onload = function() {
    if (window.PriyoWidget) {
      window.PriyoWidget.init(config);
    }
  };
  document.body.appendChild(script);
})();
