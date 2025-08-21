(function() {
  // 1️⃣ Load CSS dynamically
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/widget/styles.css';
  document.head.appendChild(link);

  // 2️⃣ Insert full widget HTML dynamically
  var container = document.createElement('div');
  container.id = 'priyo-chat-widget-container';
  container.innerHTML = `
    <div id="chatBubble" role="button" tabindex="0" aria-label="Open chat" title="Open chat">
      <img src="https://i.imgur.com/4DB1BHj.png" alt="Bot Icon"/>
    </div>

    <div id="bubbleArrow" aria-hidden="true"></div>

    <div id="bubblePopup" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="popup-arrow" aria-hidden="true"></div>
      <div id="popupContent">
        <span id="popupMessage">Hello! 👋 Welcome to Priyo Pay. How can I help you today?</span>
        <button id="popupCloseBtn" aria-label="Close popup" title="Close" type="button">&times;</button>
      </div>
    </div>

    <div id="chatWidget" role="region" aria-label="Priyo Pay Chat Widget" tabindex="0" aria-live="polite">
      <div class="chat-header">
        <div class="header-left"></div>
        <img src="https://imgur.com/OrhhQLr.png" alt="Priyo Pay Logo"/>
        <span id="chatCloseBtn" role="button" tabindex="0" aria-label="Minimize chat" title="Minimize chat">&times;</span>
      </div>

      <div class="chat-tabs" role="tablist" aria-label="Chat navigation tabs">
        <div class="chat-tab active" id="tabChatBtn" role="tab" aria-selected="true" tabindex="0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:6px;">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
          Chat
        </div>
        <div class="chat-tab" id="tabHelpBtn" role="tab" aria-selected="false" tabindex="0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:6px;">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm1-7.75c-.34.17-.5.5-.5.75h-2a2.003 2.003 0 0 1 1.5-1.95V7h-1v-2h2v2.25z"/>
          </svg>
          Help
        </div>
      </div>

      <div id="tabChat" role="tabpanel" aria-labelledby="tabChatBtn" tabindex="0">
        <div id="chatBody" aria-live="polite" aria-relevant="additions"></div>
        <div id="typingIndicator">Priyo is typing...</div>
      </div>

      <div id="tabHelp" role="tabpanel" aria-labelledby="tabHelpBtn" tabindex="0" style="display:none;">
        <div style="height:100%; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
          <div>
            <p style="margin:0 0 8px 0; font-weight:600;">Open the help center</p>
            <p style="margin:0 0 12px 0; color:#666;">Clicking Help opens our full helpdesk in a new tab.</p>
            <button id="openHelpBtn" style="padding:8px 12px; border-radius:6px; border:0; background:#E60023; color:#fff; cursor:pointer;">Open Help Center</button>
          </div>
        </div>
      </div>

      <div class="chat-footer" id="chatFooter" aria-hidden="false">
        <input id="chatInput" type="text" placeholder="Type your message..." aria-label="Type your message" autocomplete="off"/>
        <button id="sendBtn" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // 3️⃣ Load script.js dynamically and initialize
  var script = document.createElement('script');
  script.src = '/widget/priyo-widget-integrated.js';
  script.onload = function() {
    // Optional: if script.js has init function
    if (typeof initChatWidget === 'function') {
      initChatWidget();
    }
  };
  document.body.appendChild(script);
})();
