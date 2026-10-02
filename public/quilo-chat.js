/**
 * Quilo Chat Widget
 * Embed this on any Shopify store to add AI-powered customer support chat.
 *
 * Usage:
 * <script src="https://your-quilo-domain.com/quilo-chat.js"
 *         data-store-id="STORE_ID"
 *         data-api-url="https://your-quilo-domain.com/api">
 * </script>
 */

(function () {
  "use strict";

  // Prevent multiple instances
  if (window.QuiloChat) {
    console.warn("Quilo Chat is already loaded.");
    return;
  }

  // Read config from script tag
  var script = document.currentScript || document.querySelector("script[data-store-id]");
  if (!script) {
    console.error("Quilo Chat: Could not find script tag with data-store-id.");
    return;
  }

  var STORE_ID = script.getAttribute("data-store-id");
  var API_URL = script.getAttribute("data-api-url") || "http://localhost:4000/api";
  var PRIMARY_COLOR = script.getAttribute("data-color") || "#1f108e";
  var GREETING = script.getAttribute("data-greeting") || "Hello! How can I help you today?";
  var POSITION = script.getAttribute("data-position") || "bottom-right";

  if (!STORE_ID) {
    console.error("Quilo Chat: data-store-id attribute is required.");
    return;
  }

  // Build styles
  var positionStyles = POSITION === "bottom-left"
    ? "bottom:20px;left:20px;"
    : "bottom:20px;right:20px;";

  var widgetStyles = document.createElement("style");
  widgetStyles.textContent = [
    "#quilo-chat-root { position:fixed;" + positionStyles + "z-index:99999;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }",
    "#quilo-chat-toggle { width:60px;height:60px;border-radius:50%;background:" + PRIMARY_COLOR + ";color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:transform 0.2s,box-shadow 0.2s;border:none; }",
    "#quilo-chat-toggle:hover { transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,0.25); }",
    "#quilo-chat-toggle svg { width:28px;height:28px;fill:white;pointer-events:none; }",
    "#quilo-chat-panel { display:none;width:360px;height:520px;background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);flex-direction:column;overflow:hidden;margin-bottom:12px; }",
    "#quilo-chat-panel.quilo-open { display:flex; }",
    "#quilo-chat-header { background:" + PRIMARY_COLOR + ";color:white;padding:16px 20px;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:space-between; }",
    "#quilo-chat-close { background:none;border:none;color:white;cursor:pointer;font-size:20px;padding:4px;line-height:1; }",
    "#quilo-chat-messages { flex:1;overflow-y:auto;padding:16px;background:#f8f9ff;display:flex;flex-direction:column;gap:10px; }",
    ".quilo-msg { max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;word-wrap:break-word; }",
    ".quilo-msg-bot { background:white;color:#1a1a2e;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,0.08);border-bottom-left-radius:4px; }",
    ".quilo-msg-customer { background:" + PRIMARY_COLOR + ";color:white;align-self:flex-end;border-bottom-right-radius:4px; }",
    ".quilo-msg-system { align-self:center;background:transparent;color:#888;font-size:12px;max-width:90%;text-align:center; }",
    "#quilo-chat-input-area { padding:12px;border-top:1px solid #eee;display:flex;gap:8px;background:white; }",
    "#quilo-chat-input { flex:1;border:1px solid #ddd;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;font-family:inherit;transition:border-color 0.2s; }",
    "#quilo-chat-input:focus { border-color:" + PRIMARY_COLOR + "; }",
    "#quilo-chat-send { background:" + PRIMARY_COLOR + ";color:white;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit;transition:opacity 0.2s; }",
    "#quilo-chat-send:hover { opacity:0.9; }",
    "#quilo-chat-send:disabled { opacity:0.5;cursor:not-allowed; }",
    ".quilo-typing { display:flex;gap:4px;padding:12px 14px; }",
    ".quilo-typing-dot { width:8px;height:8px;border-radius:50%;background:#ccc;animation:quilo-bounce 1.4s infinite ease-in-out; }",
    ".quilo-typing-dot:nth-child(2) { animation-delay:0.2s; }",
    ".quilo-typing-dot:nth-child(3) { animation-delay:0.4s; }",
    "@keyframes quilo-bounce { 0%,80%,100% { transform:scale(0.6);opacity:0.4; } 40% { transform:scale(1);opacity:1; } }",
    "@media (max-width:400px) { #quilo-chat-panel { width:calc(100vw - 40px);height:calc(100vh - 120px); } }"
  ].join("\n");
  document.head.appendChild(widgetStyles);

  // Create widget HTML
  var root = document.createElement("div");
  root.id = "quilo-chat-root";
  root.innerHTML = [
    '<button id="quilo-chat-toggle" aria-label="Open chat">',
    '  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    '</button>',
    '<div id="quilo-chat-panel">',
    '  <div id="quilo-chat-header">',
    '    <span>Chat with Us 💬</span>',
    '    <button id="quilo-chat-close" aria-label="Close chat">&times;</button>',
    '  </div>',
    '  <div id="quilo-chat-messages"></div>',
    '  <div id="quilo-chat-input-area">',
    '    <input id="quilo-chat-input" type="text" placeholder="Type a message..." autocomplete="off" />',
    '    <button id="quilo-chat-send">Send</button>',
    '  </div>',
    '</div>'
  ].join("\n");
  document.body.appendChild(root);

  // DOM elements
  var toggleBtn = document.getElementById("quilo-chat-toggle");
  var panel = document.getElementById("quilo-chat-panel");
  var closeBtn = document.getElementById("quilo-chat-close");
  var messagesDiv = document.getElementById("quilo-chat-messages");
  var input = document.getElementById("quilo-chat-input");
  var sendBtn = document.getElementById("quilo-chat-send");

  // State
  var isOpen = false;
  var conversationId = null;
  var isTyping = false;
  var greeted = false;

  // Event listeners
  toggleBtn.addEventListener("click", function () {
    isOpen = !isOpen;
    panel.classList.toggle("quilo-open", isOpen);
    if (isOpen && !greeted) {
      addMessage("bot", GREETING);
      greeted = true;
    }
    if (isOpen) {
      input.focus();
    }
  });

  closeBtn.addEventListener("click", function () {
    isOpen = false;
    panel.classList.remove("quilo-open");
  });

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Functions
  function addMessage(role, text) {
    var msgDiv = document.createElement("div");
    msgDiv.className = "quilo-msg quilo-msg-" + role;

    if (role === "system") {
      msgDiv.className = "quilo-msg quilo-msg-system";
    }

    // Support basic markdown-like formatting
    var html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");

    msgDiv.innerHTML = html;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function showTyping() {
    var typingDiv = document.createElement("div");
    typingDiv.id = "quilo-typing-indicator";
    typingDiv.className = "quilo-msg quilo-msg-bot";
    typingDiv.innerHTML = '<div class="quilo-typing"><div class="quilo-typing-dot"></div><div class="quilo-typing-dot"></div><div class="quilo-typing-dot"></div></div>';
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    isTyping = true;
  }

  function hideTyping() {
    var indicator = document.getElementById("quilo-typing-indicator");
    if (indicator) {
      indicator.remove();
    }
    isTyping = false;
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || isTyping) return;

    addMessage("customer", text);
    input.value = "";
    sendBtn.disabled = true;
    showTyping();

    fetch(API_URL + "/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: STORE_ID,
        message: text,
        conversationId: conversationId
      })
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .then(function (data) {
        hideTyping();
        conversationId = data.sessionId;
        addMessage("bot", data.message);
      })
      .catch(function (error) {
        hideTyping();
        addMessage("bot", "Sorry, something went wrong. Please try again.");
        console.error("Quilo Chat error:", error);
      })
      .finally(function () {
        sendBtn.disabled = false;
        input.focus();
      });
  }

  // Expose API
  window.QuiloChat = {
    open: function () {
      if (!isOpen) toggleBtn.click();
    },
    close: function () {
      if (isOpen) closeBtn.click();
    },
    isOpen: function () {
      return isOpen;
    },
    getConversationId: function () {
      return conversationId;
    }
  };

  console.log("Quilo Chat loaded for store:", STORE_ID);
})();
