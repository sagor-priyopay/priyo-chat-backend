function initChatWidget() {
  /* ---------- DOM element references ---------- */
  let chatBubble, chatWidget, chatCloseBtn, tabChatBtn, tabHelpBtn, tabContents, 
      chatBody, chatFooter, chatInput, sendBtn, typingIndicator, bubbleArrow, 
      bubblePopup, popupCloseBtn, openHelpBtn;

  /* ---------- State variables ---------- */
  let isChatOpen = false;
  let activeTab = 'chat';
  let welcomeShown = false;

  /* ---------- Sound & notification helpers ---------- */
  function playBeep(frequency = 440, duration = 200, volume = 0.2) {
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
  }

  function playGentleSound() { playBeep(880, 150, 0.1); }
  function playAlertSound() { playBeep(440, 300, 0.3); }

  function showDesktopNotification(messageText) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const notification = new Notification("Priyo Pay", {
        body: messageText,
        icon: "https://i.imgur.com/4DB1BHj.png"
      });
      notification.onclick = () => window.focus();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }

  /* ---------- DOM helpers ---------- */
  function adjustChatPadding() {
    if (!chatFooter || !chatBody) return;
    const footerHeight = chatFooter.offsetHeight || 56;
    chatBody.style.paddingBottom = (footerHeight + 8) + 'px';
  }

  function scrollToBottom(behavior = 'auto') {
    if (!chatBody) return;
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior });
  }

  function showFooter() {
    if (!chatFooter) return;
    chatFooter.style.display = 'flex';
  }

  function hideFooter() {
    if (!chatFooter) return;
    chatFooter.style.display = 'none';
  }

  /* ---------- Core widget functions ---------- */
  function openWidget() {
    if (!chatWidget || !bubbleArrow || !bubblePopup) return;
    chatWidget.style.display = 'flex';
    isChatOpen = true;
    switchTo('chat');
    bubbleArrow.classList.add('show');
    if (bubblePopup.classList.contains('show')) {
      bubblePopup.classList.remove('show');
    }
    adjustChatPadding();
    setTimeout(() => {
      if (chatInput) chatInput.focus();
      scrollToBottom('auto');
      if (!welcomeShown) {
        addMessage("Hello! 👋 Welcome to Priyo Pay. How can I help you today?", 'bot');
        welcomeShown = true;
      }
    }, 120);
  }

  function closeWidget() {
    if (!chatWidget || !bubbleArrow) return;
    chatWidget.style.display = 'none';
    isChatOpen = false;
    bubbleArrow.classList.remove('show');
  }

  function switchTo(tab) {
    if (tab === activeTab || !tabChatBtn || !tabHelpBtn || !tabContents.chat || !tabContents.help) return;
    activeTab = tab;

    [tabChatBtn, tabHelpBtn].forEach(btn => btn.classList.remove('active'));
    tab === 'chat' ? tabChatBtn.classList.add('active') : tabHelpBtn.classList.add('active');

    tabContents.chat.style.display = (tab === 'chat') ? 'block' : 'none';
    tabContents.help.style.display = (tab === 'help') ? 'block' : 'none';

    if (tab === 'chat') {
      showFooter();
      adjustChatPadding();
      setTimeout(() => {
        if (chatInput) chatInput.focus();
        scrollToBottom('smooth');
      }, 80);
    } else {
      hideFooter();
    }
  }

  function addMessage(text, sender = 'bot') {
    if (!chatBody) return;
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerHTML = `<div class="avatar ${sender}"></div><div class="message-text"></div>`;
    div.querySelector('.message-text').textContent = text;
    chatBody.appendChild(div);
    scrollToBottom('smooth');

    if (sender === 'bot') {
      isChatOpen ? playGentleSound() : playAlertSound();
      if (!isChatOpen) showDesktopNotification(text);
    }
  }

  async function sendMessage() {
    if (!chatInput || activeTab !== 'chat') return;
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value = '';
    if (typingIndicator) typingIndicator.style.display = 'block';

    // Mock backend response
    await new Promise(r => setTimeout(r, 900));
    addMessage(`You said: "${text}"`, 'bot');
    if (typingIndicator) typingIndicator.style.display = 'none';
  }

  /* ---------- Event binding ---------- */
  function bindEvents() {
    chatBubble.addEventListener('click', () => isChatOpen ? closeWidget() : openWidget());
    chatCloseBtn.addEventListener('click', closeWidget);
    tabChatBtn.addEventListener('click', () => switchTo('chat'));
    tabHelpBtn.addEventListener('click', () => switchTo('help'));
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    popupCloseBtn.addEventListener('click', () => bubblePopup.classList.remove('show'));
    openHelpBtn.addEventListener('click', () => window.open('https://help.priyo.com/en/', '_blank'));
    window.addEventListener('resize', () => {
      adjustChatPadding();
      if (isChatOpen) scrollToBottom('auto');
    });
  }

  /* ---------- Initialization ---------- */
  function initialize() {
    // Grab all DOM elements safely
    chatBubble = document.getElementById('chatBubble');
    chatWidget = document.getElementById('chatWidget');
    chatCloseBtn = document.getElementById('chatCloseBtn');
    tabChatBtn = document.getElementById('tabChatBtn');
    tabHelpBtn = document.getElementById('tabHelpBtn');
    tabContents = {
      chat: document.getElementById('tabChat'),
      help: document.getElementById('tabHelp')
    };
    chatBody = document.getElementById('chatBody');
    chatFooter = document.getElementById('chatFooter');
    chatInput = document.getElementById('chatInput');
    sendBtn = document.getElementById('sendBtn');
    typingIndicator = document.getElementById('typingIndicator');
    bubbleArrow = document.getElementById('bubbleArrow');
    bubblePopup = document.getElementById('bubblePopup');
    popupCloseBtn = document.getElementById('popupCloseBtn');
    openHelpBtn = document.getElementById('openHelpBtn');

    // Check if essential elements exist
    if (!chatBubble || !chatWidget) {
      console.error("Priyo Widget: Essential elements not found. Initialization failed.");
      return;
    }

    bindEvents();
    adjustChatPadding();
    switchTo('chat');
    chatBubble.style.display = 'flex';

    // Show welcome popup
    setTimeout(() => {
      if (bubblePopup) bubblePopup.classList.add('show');
    }, 300);

    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    console.log("Priyo Widget Initialized Successfully");
  }

  // Wait for the DOM to be fully loaded before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  /* ---------- Public API ---------- */
  window.PriyoWidget = {
    open: openWidget,
    close: closeWidget,
    addMessage: addMessage,
    setVisitorInfo: (email, name) => {
      console.log(`Visitor info set: ${name} (${email})`);
      // Here you would typically send this info to your backend
    }
  };
}

initChatWidget();
