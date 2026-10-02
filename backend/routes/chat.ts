import { Router, Response } from "express"
import { getDb } from "../config/database"
import { chatSessions, chatMessages } from "../models/schema"
import { AuthRequest, authenticate } from "../middleware/auth"
import { eq, and, desc } from "drizzle-orm"
import { validate, chatMessageSchema, createChatSessionSchema } from "../middleware/validate"
import { processMessage } from "../services/conversation"
import { getStoreContext, clearStoreContextCache } from "../services/store-context"
import { config } from "../config"
import { createContextLogger } from "../config/logger"

const log = createContextLogger({ module: "chat" })
const router = Router()

// Public chat endpoint - customers use this from the widget
router.post("/message", validate(chatMessageSchema), async (req: any, res: Response) => {
  try {
    const { storeId, message, conversationId, customerEmail, customerName } = req.body

    if (!storeId || !message) {
      return res.status(400).json({ error: "storeId and message are required" })
    }

    const response = await processMessage(
      storeId,
      message,
      conversationId,
      customerEmail,
      customerName
    )

    return res.json(response)
  } catch (error) {
    log.error({ err: error }, "Chat message processing failed")
    return res.status(500).json({ error: "Failed to process message" })
  }
})

// Get store context for the chatbot (public - widget needs this)
router.get("/store-context/:storeId", async (req: any, res: Response) => {
  try {
    const { storeId } = req.params
    const context = await getStoreContext(storeId)

    if (!context) {
      return res.status(404).json({ error: "Store not found" })
    }

    // Don't expose sensitive data to the widget
    return res.json({
      storeName: context.storeName,
      platform: context.platform,
      shop: context.shop,
      policies: context.policies,
      products: context.products.slice(0, 20),
      returnPolicySummary: context.returnPolicySummary,
    })
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to get store context")
    return res.status(500).json({ error: "Failed to get store context" })
  }
})

// Refresh store context (merchant only)
router.post("/store-context/:storeId/refresh", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params
    clearStoreContextCache(storeId)
    const context = await getStoreContext(storeId)

    if (!context) {
      return res.status(404).json({ error: "Store not found" })
    }

    return res.json({ success: true, context })
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to refresh store context")
    return res.status(500).json({ error: "Failed to refresh store context" })
  }
})

// Get chat sessions for a store (merchant only)
router.get("/sessions/:storeId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params

    const sessions = await getDb()
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.storeId, storeId))
      .orderBy(desc(chatSessions.lastMessageAt))
      .limit(50)

    return res.json(sessions)
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to get chat sessions")
    return res.status(500).json({ error: "Failed to get chat sessions" })
  }
})

// Get messages for a chat session (merchant only)
router.get("/sessions/:sessionId/messages", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params

    const messages = await getDb()
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)

    return res.json(messages)
  } catch (error) {
    log.error({ err: error, sessionId: req.params.sessionId }, "Failed to get chat messages")
    return res.status(500).json({ error: "Failed to get chat messages" })
  }
})

// Close a chat session (merchant only)
router.post("/sessions/:sessionId/close", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params

    await getDb()
      .update(chatSessions)
      .set({
        status: "closed",
        endedAt: new Date().toISOString(),
      })
      .where(eq(chatSessions.id, sessionId))

    return res.json({ success: true })
  } catch (error) {
    log.error({ err: error, sessionId: req.params.sessionId }, "Failed to close chat session")
    return res.status(500).json({ error: "Failed to close chat session" })
  }
})

// Get widget embed code for a store (merchant only)
router.get("/widget/:storeId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params

    const embedCode = `<!-- Quilo Chat Widget -->
<script>
(function() {
  var QUilo_STORE_ID = "${storeId}";
  var QUilo_API_URL = "${config.frontendUrl}/api";
  
  // Create widget container
  var container = document.createElement('div');
  container.id = 'quilo-chat-widget';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;font-family:Inter,sans-serif;';
  
  container.innerHTML = \\\`
    <div id="quilo-chat-button" style="width:60px;height:60px;border-radius:50%;background:#1f108e;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(31,16,142,0.3);transition:transform 0.2s;">
      <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
    </div>
    <div id="quilo-chat-window" style="display:none;width:350px;height:500px;background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);flex-direction:column;overflow:hidden;margin-bottom:10px;">
      <div style="background:#1f108e;color:white;padding:16px;font-weight:600;">Chat with Us 💬</div>
      <div id="quilo-chat-messages" style="flex:1;overflow-y:auto;padding:16px;background:#f8f9ff;"></div>
      <div style="padding:12px;border-top:1px solid #eee;display:flex;">
        <input id="quilo-chat-input" type="text" placeholder="Type a message..." style="flex:1;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;outline:none;" />
        <button id="quilo-chat-send" style="margin-left:8px;background:#1f108e;color:white;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-weight:600;">Send</button>
      </div>
    </div>
  \\\`;
  
  document.body.appendChild(container);
  
  var button = document.getElementById('quilo-chat-button');
  var window = document.getElementById('quilo-chat-window');
  var messages = document.getElementById('quilo-chat-messages');
  var input = document.getElementById('quilo-chat-input');
  var send = document.getElementById('quilo-chat-send');
  var conversationId = null;
  var isOpen = false;
  
  button.onclick = function() {
    isOpen = !isOpen;
    window.style.display = isOpen ? 'flex' : 'none';
    button.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
    if (isOpen && messages.children.length === 0) {
      addMessage('bot', 'Hello! How can I help you today? 👋');
    }
  };
  
  function addMessage(role, text) {
    var div = document.createElement('div');
    div.style.cssText = 'margin-bottom:12px;display:flex;' + (role === 'customer' ? 'justify-content:flex-end;' : '');
    div.innerHTML = '<div style="max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;' + 
      (role === 'customer' ? 'background:#1f108e;color:white;' : 'background:white;color:#333;box-shadow:0 1px 3px rgba(0,0,0,0.1);') + 
      '">' + text + '</div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
  
  async function sendMessage() {
    var text = input.value.trim();
    if (!text) return;
    
    addMessage('customer', text);
    input.value = '';
    
    try {
      var response = await fetch(QUilo_API_URL + '/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: QUilo_STORE_ID, message: text, conversationId: conversationId })
      });
      var data = await response.json();
      conversationId = data.sessionId;
      addMessage('bot', data.message);
    } catch (error) {
      addMessage('bot', 'Sorry, something went wrong. Please try again.');
    }
  }
  
  send.onclick = sendMessage;
  input.onkeypress = function(e) { if (e.key === 'Enter') sendMessage(); };
})();
</script>`

    return res.json({ embedCode })
  } catch (error) {
    log.error({ err: error, storeId: req.params.storeId }, "Failed to generate widget code")
    return res.status(500).json({ error: "Failed to generate widget code" })
  }
})

export default router
