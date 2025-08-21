/* ---------- Priyo Chat Widget - Backend Integrated Version ---------- */

// Configuration
const WIDGET_CONFIG = {
  apiBaseUrl: window.PRIYO_WIDGET_API_URL || 'http://localhost:3000/api',
  socketUrl: window.PRIYO_WIDGET_SOCKET_URL || 'http://localhost:3000',
  visitorId: null,
  token: null,
  conversationId: null,
  socket: null,
  isAuthenticated: false
};

// Generate unique visitor ID
function generateVisitorId() {
  return 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get or create visitor ID
function getVisitorId() {
  if (WIDGET_CONFIG.visitorId) return WIDGET_CONFIG.visitorId;
  
  let visitorId = localStorage.getItem('priyo_visitor_id');
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem('priyo_visitor_id', visitorId);
  }
  WIDGET_CONFIG.visitorId = visitorId;
  return visitorId;
}

/* ---------- API Functions ---------- */
async function authenticateWidget() {
  try {
    const response = await fetch(`${WIDGET_CONFIG.apiBaseUrl}/widget/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: (() => {
        const payload = { visitorId: getVisitorId() };
        const email = localStorage.getItem('priyo_visitor_email');
        const name = localStorage.getItem('priyo_visitor_name');
        if (email && email.trim().length) payload.email = email.trim();
        if (name && name.trim().length) payload.name = name.trim();
        return JSON.stringify(payload);
      })()
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Auth failed:', {
        status: response.status,
        body: data
      });
      return false;
    }
    if (data.success) {
      WIDGET_CONFIG.token = data.token;
      WIDGET_CONFIG.isAuthenticated = true;
      localStorage.setItem('priyo_widget_token', data.token);
      return true;
    }
  } catch (error) {
    console.error('Widget authentication failed:', error);
  }
  return false;
}

async function getOrCreateConversation() {
  try {
    const response = await fetch(`${WIDGET_CONFIG.apiBaseUrl}/widget/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WIDGET_CONFIG.token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      WIDGET_CONFIG.conversationId = data.conversation.id;
      return data.conversation;
    }
  } catch (error) {
    console.error('Failed to get conversation:', error);
  }
  return null;
}

async function sendMessageToBackend(message) {
  try {
    const response = await fetch(`${WIDGET_CONFIG.apiBaseUrl}/widget/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WIDGET_CONFIG.token}`
      },
      body: JSON.stringify({
        message,
        conversationId: WIDGET_CONFIG.conversationId,
        visitorId: WIDGET_CONFIG.visitorId
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Failed to send message:', error);
    return false;
  }
}

/* ---------- WebSocket Functions ---------- */
function initializeSocket() {
  if (!WIDGET_CONFIG.token) return;

  // Load Socket.IO from CDN if not already loaded
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
    script.onload = () => connectSocket();
    document.head.appendChild(script);
  } else {
    connectSocket();
  }
}

function connectSocket() {
  WIDGET_CONFIG.socket = io(WIDGET_CONFIG.socketUrl, {
    auth: {
      token: WIDGET_CONFIG.token
    },
    transports: ['websocket', 'polling']
  });

  WIDGET_CONFIG.socket.on('connect', () => {
    console.log('Widget connected to socket');
    if (WIDGET_CONFIG.conversationId) {
      WIDGET_CONFIG.socket.emit('conversation:join', WIDGET_CONFIG.conversationId);
    }
  });

  WIDGET_CONFIG.socket.on('message:new', (data) => {
    if (data.conversationId === WIDGET_CONFIG.conversationId) {
      // Only show messages from others (agents/admins)
      if (data.senderRole !== 'CUSTOMER') {
        addMessage(data.content, 'bot');
      }
    }
  });

  WIDGET_CONFIG.socket.on('typing:start', (data) => {
    if (data.conversationId === WIDGET_CONFIG.conversationId && data.senderRole !== 'CUSTOMER') {
      showTypingIndicator();
    }
  });

  WIDGET_CONFIG.socket.on('typing:stop', (data) => {
    if (data.conversationId === WIDGET_CONFIG.conversationId) {
      hideTypingIndicator();
    }
  });

  WIDGET_CONFIG.socket.on('disconnect', () => {
    console.log('Widget disconnected from socket');
  });
}

/* ---------- Sound & Notification Helpers ---------- */
function playBeep(frequency = 440, duration = 200, volume = 0.2) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration / 1000);
    oscillator.stop(audioCtx.currentTime + duration / 1000);
  } catch (e) {
    // Fallback for browsers without AudioContext
  }
}

function playGentleSound() {
  playBeep(880, 150, 0.1);
}

function playAlertSound() {
  playBeep(440, 300, 0.3);
}

function showDesktopNotification(messageText) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    const notification = new Notification("Priyo Pay", {
      body: messageText,
      icon: "https://i.imgur.com/4DB1BHj.png"
    });
    notification.onclick = () => {
      window.focus();
      openWidget();
    };
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

/* ---------- DOM Elements ---------- */
const chatBubble = document.getElementById('chatBubble');
const chatWidget = document.getElementById('chatWidget');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const tabChatBtn = document.getElementById('tabChatBtn');
const tabHelpBtn = document.getElementById('tabHelpBtn');
const tabContents = {
  chat: document.getElementById('tabChat'),
  help: document.getElementById('tabHelp')
};
const chatBody = document.getElementById('chatBody');
const chatFooter = document.getElementById('chatFooter');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const bubbleArrow = document.getElementById('bubbleArrow');
const bubblePopup = document.getElementById('bubblePopup');
const popupCloseBtn = document.getElementById('popupCloseBtn');
const openHelpBtn = document.getElementById('openHelpBtn');

let isChatOpen = false;
let activeTab = 'chat';
let welcomeShown = false;
let typingTimeout = null;

/* ---------- Helper Functions ---------- */
function adjustChatPadding() {
  try {
    const footerHeight = chatFooter.offsetHeight || 56;
    chatBody.style.paddingBottom = (footerHeight + 8) + 'px';
    tabContents.chat.style.paddingBottom = '0px';
    tabContents.help.style.paddingBottom = '0px';
  } catch (e) {
    console.error('Error adjusting chat padding:', e);
  }
}

function scrollToBottom(behavior = 'auto') {
  if (!chatBody) return;
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior });
}

function showFooter() {
  chatFooter.setAttribute('aria-hidden', 'false');
  chatFooter.style.visibility = 'visible';
  chatFooter.style.pointerEvents = 'auto';
  chatFooter.style.opacity = '1';
  chatFooter.style.display = 'flex';
}

function hideFooter() {
  chatFooter.setAttribute('aria-hidden', 'true');
  chatFooter.style.visibility = 'hidden';
  chatFooter.style.pointerEvents = 'none';
  chatFooter.style.opacity = '0';
  chatFooter.style.display = 'none';
}

function showTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.style.display = 'block';
    scrollToBottom('smooth');
  }
}

function hideTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.style.display = 'none';
  }
}

/* ---------- Widget Open/Close Functions ---------- */
async function openWidget() {
  chatWidget.style.display = 'flex';
  isChatOpen = true;
  switchTo('chat');
  bubbleArrow.classList.add('show');
  
  if (bubblePopup.classList.contains('show')) {
    bubblePopup.classList.remove('show');
    bubblePopup.addEventListener('transitionend', function onEnd() {
      bubblePopup.style.display = 'none';
      bubblePopup.removeEventListener('transitionend', onEnd);
    }, { once: true });
  }
  
  adjustChatPadding();
  
  // Initialize backend connection if not already done
  if (!WIDGET_CONFIG.isAuthenticated) {
    const authenticated = await authenticateWidget();
    if (authenticated) {
      initializeSocket();
      const conversation = await getOrCreateConversation();
      if (conversation && conversation.messages) {
        // Load existing messages
        conversation.messages.forEach(msg => {
          const sender = msg.senderRole === 'CUSTOMER' ? 'user' : 'bot';
          addMessage(msg.content, sender, false); // false = don't play sound for existing messages
        });
      }
    }
  }
  
  setTimeout(() => {
    try { 
      chatInput.focus(); 
    } catch(e) { 
      console.error('Error focusing input:', e); 
    }
    scrollToBottom('auto');
    
    if (!welcomeShown && !WIDGET_CONFIG.conversationId) {
      addMessage("Hello! 👋 Welcome to Priyo Pay. How can I help you today?", 'bot');
      welcomeShown = true;
    }
  }, 120);
}

function closeWidget() {
  chatWidget.style.display = 'none';
  isChatOpen = false;
  bubbleArrow.classList.remove('show');
}

/* ---------- Tab Switching ---------- */
function switchTo(tab) {
  if (tab === activeTab) return;
  activeTab = tab;

  [tabChatBtn, tabHelpBtn].forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  
  if (tab === 'chat') {
    tabChatBtn.classList.add('active');
    tabChatBtn.setAttribute('aria-selected', 'true');
  }
  if (tab === 'help') {
    tabHelpBtn.classList.add('active');
    tabHelpBtn.setAttribute('aria-selected', 'true');
  }

  tabContents.chat.style.display = (tab === 'chat') ? 'block' : 'none';
  tabContents.help.style.display = (tab === 'help') ? 'block' : 'none';

  if (tab === 'chat') {
    showFooter();
    adjustChatPadding();
    setTimeout(() => {
      try { 
        chatInput.focus(); 
      } catch(e) { 
        console.error('Error focusing input:', e); 
      }
      scrollToBottom('smooth');
    }, 80);
  } else {
    hideFooter();
    try { 
      chatInput.blur(); 
    } catch(e) { 
      console.error('Error blurring input:', e); 
    }
  }
}

/* ---------- Messaging Functions ---------- */
function addMessage(text, sender = 'bot', playSound = true) {
  const div = document.createElement('div');
  div.className = 'message ' + (sender === 'user' ? 'user' : 'bot');
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar ' + (sender === 'user' ? 'user' : 'bot');
  
  const txt = document.createElement('div');
  txt.className = 'message-text';
  txt.textContent = text;
  
  div.appendChild(avatar);
  div.appendChild(txt);
  chatBody.appendChild(div);
  scrollToBottom('smooth');
  
  if (playSound && sender === 'bot') {
    if (isChatOpen) {
      playGentleSound();
    } else {
      playAlertSound();
      showDesktopNotification(text);
    }
  }
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || activeTab !== 'chat') return;
  
  // Add user message to UI immediately
  addMessage(text, 'user', false);
  chatInput.value = '';
  
  // Send typing indicator
  if (WIDGET_CONFIG.socket && WIDGET_CONFIG.conversationId) {
    WIDGET_CONFIG.socket.emit('typing:start', { conversationId: WIDGET_CONFIG.conversationId });
  }
  
  // Send message to backend
  const success = await sendMessageToBackend(text);
  
  // Stop typing indicator
  if (WIDGET_CONFIG.socket && WIDGET_CONFIG.conversationId) {
    WIDGET_CONFIG.socket.emit('typing:stop', { conversationId: WIDGET_CONFIG.conversationId });
  }
  
  if (!success) {
    // Fallback message if backend fails
    setTimeout(() => {
      addMessage("I'm sorry, there seems to be a connection issue. Please try again later.", 'bot');
    }, 1000);
  }
}

/* ---------- Event Listeners ---------- */
// Help tab functionality
const HELP_URL = 'https://help.priyo.com/en/';

tabHelpBtn.addEventListener('click', () => {
  window.open(HELP_URL, '_blank');
  switchTo('help');
});

tabHelpBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    tabHelpBtn.click();
  }
});

if (openHelpBtn) {
  openHelpBtn.addEventListener('click', () => {
    window.open(HELP_URL, '_blank');
  });
  
  openHelpBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openHelpBtn.click();
    }
  });
}

tabChatBtn.addEventListener('click', () => switchTo('chat'));
tabChatBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    switchTo('chat');
  }
});

// Bubble click toggles widget
chatBubble.addEventListener('click', () => {
  if (isChatOpen) closeWidget(); 
  else openWidget();
});

chatBubble.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    chatBubble.click();
  }
});

chatCloseBtn.addEventListener('click', closeWidget);

// Send message functionality
sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && activeTab === 'chat') {
    e.preventDefault();
    sendMessage();
  }
});

// Typing indicator for user
chatInput.addEventListener('input', () => {
  if (WIDGET_CONFIG.socket && WIDGET_CONFIG.conversationId && chatInput.value.trim()) {
    WIDGET_CONFIG.socket.emit('typing:start', { conversationId: WIDGET_CONFIG.conversationId });
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing
    typingTimeout = setTimeout(() => {
      if (WIDGET_CONFIG.socket && WIDGET_CONFIG.conversationId) {
        WIDGET_CONFIG.socket.emit('typing:stop', { conversationId: WIDGET_CONFIG.conversationId });
      }
    }, 1000);
  }
});

/* ---------- Auto-scroll on mutations ---------- */
const obs = new MutationObserver(() => {
  if (isChatOpen && activeTab === 'chat') scrollToBottom('auto');
});
obs.observe(chatBody, { childList: true, subtree: true });

/* ---------- Responsive adjustments ---------- */
window.addEventListener('resize', () => {
  adjustChatPadding();
  if (isChatOpen && activeTab === 'chat') {
    setTimeout(() => scrollToBottom('auto'), 120);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isChatOpen && activeTab === 'chat') {
    adjustChatPadding();
    requestAnimationFrame(() => scrollToBottom('smooth'));
  }
});

/* ---------- Popup logic ---------- */
window.addEventListener('load', () => {
  bubblePopup.style.display = 'block';
  setTimeout(() => {
    bubblePopup.classList.add('show');
  }, 300);
});

popupCloseBtn.addEventListener('click', () => {
  bubblePopup.classList.remove('show');
  bubblePopup.addEventListener('transitionend', function onEnd() {
    bubblePopup.style.display = 'none';
    bubblePopup.removeEventListener('transitionend', onEnd);
  }, { once: true });
});

/* ---------- Initialize ---------- */
adjustChatPadding();

// Try to restore previous session
const savedToken = localStorage.getItem('priyo_widget_token');
if (savedToken) {
  WIDGET_CONFIG.token = savedToken;
  WIDGET_CONFIG.isAuthenticated = true;
  // Will initialize socket when widget is opened
}

/* ---------- Public API for customization ---------- */
window.PriyoWidget = {
  open: openWidget,
  close: closeWidget,
  setVisitorInfo: (email, name) => {
    localStorage.setItem('priyo_visitor_email', email);
    localStorage.setItem('priyo_visitor_name', name);
  },
  configure: (config) => {
    Object.assign(WIDGET_CONFIG, config);
  }
};
