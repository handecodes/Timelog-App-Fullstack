import { ask } from './proxyApi.js';

// ── Chatbot Styles ─────────────────────────────────────────────────────────
const styleElement = document.createElement('style');
styleElement.innerHTML = `
  .chatbot-launcher {
    position: fixed;
    bottom: 25px;
    right: 25px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, var(--primary-purple, #6b3b9d) 0%, #8a4fc2 100%);
    border-radius: 50%;
    box-shadow: 0 4px 16px var(--shadow-purple, rgba(107, 59, 157, 0.4));
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    z-index: 9999;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
    border: none;
  }
  .chatbot-launcher:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px var(--shadow-purple, rgba(107, 59, 157, 0.6));
  }
  .chatbot-launcher svg {
    width: 28px;
    height: 28px;
    fill: #ffffff;
    transition: transform 0.3s ease;
    pointer-events: none;
  }
  .chatbot-launcher.active svg {
    transform: rotate(90deg);
  }
  .chatbot-window {
    position: fixed;
    bottom: 95px;
    right: 25px;
    width: 380px;
    height: 520px;
    background: rgba(38, 61, 92, 0.92);
    backdrop-filter: blur(16px) saturate(120%);
    -webkit-backdrop-filter: blur(16px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    z-index: 9998;
    overflow: hidden;
    transform: translateY(20px) scale(0.95);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.3s ease;
  }
  body.lightTheme .chatbot-window {
    background: rgba(248, 247, 253, 0.95);
    border: 1px solid rgba(107, 59, 157, 0.18);
    box-shadow: 0 8px 40px rgba(107, 59, 157, 0.15);
  }
  .chatbot-window.open {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: auto;
  }
  .chatbot-header {
    background: linear-gradient(135deg, var(--primary-purple, #6b3b9d) 0%, #8a4fc2 100%);
    padding: 14px 18px;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .chatbot-header-title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.01em;
  }
  .chatbot-header-title svg {
    width: 20px;
    height: 20px;
    fill: #ffffff;
    flex-shrink: 0;
  }
  .chatbot-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .chatbot-close-btn, .chatbot-reset-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.8);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.2s ease, transform 0.2s ease;
  }
  .chatbot-close-btn:hover, .chatbot-reset-btn:hover {
    color: #ffffff;
    transform: scale(1.15);
  }
  .chatbot-messages {
    flex: 1;
    padding: 16px 18px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.2) transparent;
  }
  body.lightTheme .chatbot-messages {
    scrollbar-color: rgba(107,59,157,0.2) transparent;
  }
  .chat-msg {
    max-width: 82%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 0.9rem;
    line-height: 1.45;
    word-break: break-word;
    animation: chatFadeIn 0.25s ease forwards;
  }
  .chat-msg.user {
    align-self: flex-end;
    background: linear-gradient(135deg, var(--primary-purple,#6b3b9d) 0%, #8a4fc2 100%);
    color: #ffffff;
    border-bottom-right-radius: 3px;
    box-shadow: 0 2px 8px rgba(107,59,157,0.35);
  }
  .chat-msg.bot {
    align-self: flex-start;
    background: rgba(255,255,255,0.1);
    color: var(--text-white,#ffffff);
    border-bottom-left-radius: 3px;
    border: 1px solid rgba(255,255,255,0.07);
  }
  body.lightTheme .chat-msg.bot {
    background: rgba(255,255,255,0.8);
    color: var(--text-dark,#324b6b);
    border: 1px solid rgba(107,59,157,0.12);
  }
  .chat-msg.error {
    align-self: center;
    background: rgba(239,83,80,0.18);
    color: #ff6b6b;
    border: 1px solid rgba(239,83,80,0.3);
    font-size: 0.82rem;
    text-align: center;
    max-width: 90%;
  }
  .chat-typing {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.1);
    border-radius: 16px;
    border-bottom-left-radius: 3px;
    width: fit-content;
    border: 1px solid rgba(255,255,255,0.07);
  }
  body.lightTheme .chat-typing {
    background: rgba(255,255,255,0.8);
    border: 1px solid rgba(107,59,157,0.12);
  }
  .chat-typing span {
    width: 7px;
    height: 7px;
    background-color: rgba(255,255,255,0.7);
    border-radius: 50%;
    display: inline-block;
    animation: chatBounce 1.4s infinite ease-in-out both;
  }
  body.lightTheme .chat-typing span {
    background-color: var(--primary-purple,#6b3b9d);
  }
  .chat-typing span:nth-child(1){ animation-delay: -0.32s; }
  .chat-typing span:nth-child(2){ animation-delay: -0.16s; }
  @keyframes chatBounce {
    0%,80%,100%{ transform: scale(0); }
    40%{ transform: scale(1); }
  }
  @keyframes chatFadeIn {
    from{ opacity:0; transform:translateY(6px); }
    to{ opacity:1; transform:translateY(0); }
  }
  .chatbot-input-area {
    padding: 12px 16px;
    display: flex;
    gap: 10px;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.08);
    background: rgba(10,20,35,0.45);
    flex-shrink: 0;
  }
  body.lightTheme .chatbot-input-area {
    border-top: 1px solid rgba(107,59,157,0.12);
    background: rgba(255,255,255,0.5);
  }
  .chatbot-input {
    flex: 1;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 22px;
    padding: 9px 16px;
    color: #ffffff;
    font-family: inherit;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s ease;
    min-width: 0;
  }
  body.lightTheme .chatbot-input {
    background: #ffffff;
    border: 1px solid rgba(107,59,157,0.22);
    color: var(--text-dark,#324b6b);
  }
  .chatbot-input::placeholder {
    color: rgba(255,255,255,0.4);
  }
  body.lightTheme .chatbot-input::placeholder {
    color: rgba(50,75,107,0.45);
  }
  .chatbot-input:focus {
    border-color: rgba(138,79,194,0.6);
  }
  .chatbot-send-btn {
    background: linear-gradient(135deg, var(--primary-purple,#6b3b9d) 0%, #8a4fc2 100%);
    border: none;
    color: #ffffff;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .chatbot-send-btn:hover {
    opacity: 0.85;
    transform: scale(1.08);
  }
  .chatbot-send-btn svg {
    width: 17px;
    height: 17px;
    fill: #ffffff;
    pointer-events: none;
  }
  @media (max-width: 480px) {
    .chatbot-window {
      width: calc(100vw - 30px);
      right: 15px;
      left: 15px;
      bottom: 85px;
      height: 70vh;
    }
  }
`;

// ── Mount everything when DOM is ready ─────────────────────────────────────
function mountChatbot() {
  // Guard: don't mount twice
  if (document.getElementById('chatbot-container')) return;

  document.head.appendChild(styleElement);

  const chatContainer = document.createElement('div');
  chatContainer.id = 'chatbot-container';
  chatContainer.innerHTML = `
    <button class="chatbot-launcher" id="chatbot-launcher" aria-label="Open AI Assistant" type="button">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm8 0h2v2h-2zm-4 0h2v2h-2z"/></svg>
    </button>

    <div class="chatbot-window" id="chatbot-window" role="dialog" aria-label="Timelog AI Chat">
      <div class="chatbot-header">
        <div class="chatbot-header-title">
          <svg viewBox="0 0 24 24"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/></svg>
          <span>Timelog AI</span>
        </div>
        <div class="chatbot-header-actions">
          <button class="chatbot-reset-btn" id="chatbot-reset-btn" title="Clear conversation" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          </button>
          <button class="chatbot-close-btn" id="chatbot-close-btn" title="Close" type="button">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>
      <div class="chatbot-messages" id="chatbot-messages"></div>
      <div class="chatbot-input-area">
        <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Ask about productivity, Pomodoro, time logs…" autocomplete="off" />
        <button class="chatbot-send-btn" id="chatbot-send-btn" aria-label="Send" type="button">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(chatContainer);

  // ── Wire up elements ──────────────────────────────────────────────────────
  const launcher       = document.getElementById('chatbot-launcher');
  const windowEl       = document.getElementById('chatbot-window');
  const closeBtn       = document.getElementById('chatbot-close-btn');
  const resetBtn       = document.getElementById('chatbot-reset-btn');
  const sendBtn        = document.getElementById('chatbot-send-btn');
  const inputEl        = document.getElementById('chatbot-input');
  const messagesEl     = document.getElementById('chatbot-messages');

  const GREETINGS = [
    "Hi! I'm your Timelog AI assistant 🧠💬",
    "Ask me anything — productivity tips, Pomodoro technique, how to analyse your time logs, or anything else!",
  ];

  let messages = [];

  function saveHistory()  { localStorage.setItem('timelog_chat_history', JSON.stringify(messages)); }
  function scrollDown()   { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function loadHistory() {
    try { messages = JSON.parse(localStorage.getItem('timelog_chat_history') || '[]'); } catch { messages = []; }
    if (messages.length === 0) {
      GREETINGS.forEach(t => messages.push({ role: 'bot', text: t }));
      saveHistory();
    }
  }

  function addBubble(role, text) {
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function renderAll() {
    messagesEl.innerHTML = '';
    messages.forEach(m => addBubble(m.role, m.text));
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing'; el.id = 'chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el); scrollDown();
  }
  function hideTyping() { document.getElementById('chat-typing')?.remove(); }

  function toggleChat() {
    const open = windowEl.classList.toggle('open');
    launcher.classList.toggle('active', open);
    if (open) { inputEl.focus(); scrollDown(); }
  }

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    messages.push({ role: 'user', text });
    addBubble('user', text);
    saveHistory();
    showTyping();
    try {
      const res = await ask(text);
      hideTyping();
      const reply = res?.generatedMessage || res?.GeneratedMessage || 'No response generated.';
      messages.push({ role: 'bot', text: reply });
      addBubble('bot', reply);
      saveHistory();
    } catch (err) {
      console.error('Chatbot error:', err);
      hideTyping();
      addBubble('error', 'Could not reach the AI service. Please check your connection and try again.');
    }
  }

  function handleReset() {
    if (!confirm('Clear the chat history?')) return;
    messages = [];
    localStorage.removeItem('timelog_chat_history');
    loadHistory();
    renderAll();
  }

  launcher.addEventListener('click', toggleChat);
  closeBtn .addEventListener('click', toggleChat);
  resetBtn .addEventListener('click', handleReset);
  sendBtn  .addEventListener('click', handleSend);
  inputEl  .addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

  loadHistory();
  renderAll();
}

// Run immediately if DOM is ready, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountChatbot);
} else {
  mountChatbot();
}
