/* ---------- sound & notification helpers ---------- */
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
    notification.onclick = () => window.focus();
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

/* ---------- grab DOM once ---------- */
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

/* ---------- helpers ---------- */
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
  console.log('Footer shown');
}

function hideFooter() {
  chatFooter.setAttribute('aria-hidden', 'true');
  chatFooter.style.visibility = 'hidden';
  chatFooter.style.pointerEvents = 'none';
  chatFooter.style.opacity = '0';
  chatFooter.style.display = 'none';
  console.log('Footer hidden');
}

/* ---------- open/close functions ---------- */
function openWidget() {
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
  setTimeout(() => {
    try { chatInput.focus(); } catch(e) { console.error('Error focusing input:', e); }
    scrollToBottom('auto');
    if (!welcomeShown) {
      addMessage("Hello! 👋 Welcome to Priyo Pay. How can I help you today?", 'bot');
      welcomeShown = true;
    }
  }, 120);
}

function closeWidget() {
  chatWidget.style.display = 'none';
  isChatOpen = false;
  bubbleArrow.classList.remove('show');
  console.log('Widget closed');
}

/* ---------- tab switching ---------- */
function switchTo(tab) {
  if (tab === activeTab) return;
  activeTab = tab;
  console.log('Switching to tab:', tab);
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
      try { chatInput.focus(); } catch(e) { console.error('Error focusing input:', e); }
      scrollToBottom('smooth');
    }, 80);
  } else {
    hideFooter();
    try { chatInput.blur(); } catch(e) { console.error('Error blurring input:', e); }
  }
}

/* ---------- help tab action ---------- */
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

/* ---------- bubble click toggles widget ---------- */
chatBubble.addEventListener('click', () => {
  if (isChatOpen) closeWidget(); else openWidget();
});
chatBubble.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    chatBubble.click();
  }
});
chatCloseBtn.addEventListener('click', closeWidget);

/* ---------- messaging ---------- */
function addMessage(text, sender = 'bot') {
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
  if (sender === 'bot') {
    if (isChatOpen) {
      playGentleSound();
    } else {
      playAlertSound();
      showDesktopNotification(text);
    }
  }
}

sendBtn.addEventListener('click', async () => {
  const t = chatInput.value.trim();
  if (!t || activeTab !== 'chat') return;
  addMessage(t, 'user');
  chatInput.value = '';
  typingIndicator.style.display = 'block';
  await new Promise(r => setTimeout(r, 900));
  addMessage(`You said: \"${t}\"`, 'bot');
  typingIndicator.style.display = 'none';
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && activeTab === 'chat') {
    e.preventDefault();
    sendBtn.click();
  }
});

/* ---------- ensure scroll pinned to bottom on mutations ---------- */
const obs = new MutationObserver(() => {
  if (isChatOpen && activeTab === 'chat') scrollToBottom('auto');
});
obs.observe(chatBody, { childList: true, subtree: true });

/* ---------- responsiveness adjustments ---------- */
window.addEventListener('resize', () => {
  adjustChatPadding();
  if (isChatOpen && activeTab === 'chat') setTimeout(() => scrollToBottom('auto'), 120);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isChatOpen && activeTab === 'chat') {
    adjustChatPadding();
    requestAnimationFrame(() => scrollToBottom('smooth'));
  }
});

/* ---------- popup logic ---------- */
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

/* ---------- initial setup ---------- */
adjustChatPadding();
switchTo('chat');
chatBubble.style.display = 'flex';

window.addEventListener('load', () => {
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
});
