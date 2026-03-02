/**
 * Soniq Chat Widget
 * Embeddable chat widget for customer websites
 *
 * Usage:
 * <script src="https://app.soniq.ai/widget/soniq-chat.js"></script>
 * <script>
 *   new SoniqChat({ tenantId: 'YOUR_TENANT_ID' });
 * </script>
 */

(function () {
  "use strict";

  const WIDGET_VERSION = "1.0.0";
  const DEFAULT_API_URL = "https://api.soniqai.com";

  class SoniqChat {
    constructor(config) {
      if (!config || !config.tenantId) {
        console.error("[SoniqChat] tenantId is required");
        return;
      }

      this.tenantId = config.tenantId;
      this.apiUrl = config.apiUrl || DEFAULT_API_URL;
      this.position = config.position || "bottom-right";
      this.sessionId = this.generateSessionId();
      this.isOpen = false;
      this.isLoading = false;
      this.config = null;
      this.visitorInfo = {};

      this.init();
    }

    async init() {
      try {
        // Fetch widget configuration
        const response = await fetch(
          `${this.apiUrl}/api/chat/config/${this.tenantId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to load chat configuration");
        }
        this.config = await response.json();

        // Inject styles
        this.injectStyles();

        // Create widget DOM
        this.createWidget();

        // Show greeting
        this.addMessage("assistant", this.config.greeting);

        console.log(`[SoniqChat] Widget initialized v${WIDGET_VERSION}`);
      } catch (err) {
        console.error("[SoniqChat] Initialization failed:", err);
      }
    }

    generateSessionId() {
      return (
        "chat_" +
        Date.now().toString(36) +
        Math.random().toString(36).substr(2, 9)
      );
    }

    injectStyles() {
      if (document.getElementById("soniq-chat-styles")) return;

      const style = document.createElement("style");
      style.id = "soniq-chat-styles";
      style.textContent = `
        .soniq-chat-button {
          position: fixed;
          ${this.position.includes("right") ? "right: 20px" : "left: 20px"};
          ${this.position.includes("bottom") ? "bottom: 20px" : "top: 20px"};
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${this.config?.theme_color || "#6366f1"};
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          z-index: 999998;
        }
        .soniq-chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .soniq-chat-button svg {
          width: 28px;
          height: 28px;
        }
        .soniq-chat-container {
          position: fixed;
          ${this.position.includes("right") ? "right: 20px" : "left: 20px"};
          ${this.position.includes("bottom") ? "bottom: 90px" : "top: 90px"};
          width: 380px;
          max-width: calc(100vw - 40px);
          height: 520px;
          max-height: calc(100vh - 120px);
          background: #18181b;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          transition: opacity 0.2s, transform 0.2s;
        }
        .soniq-chat-container.hidden {
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
        }
        .soniq-chat-header {
          padding: 16px;
          background: #27272a;
          border-bottom: 1px solid #3f3f46;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .soniq-chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .soniq-chat-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${this.config?.theme_color || "#6366f1"};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }
        .soniq-chat-name {
          color: #fafafa;
          font-weight: 600;
          font-size: 15px;
        }
        .soniq-chat-status {
          color: #a1a1aa;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .soniq-chat-status::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
        }
        .soniq-chat-close {
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .soniq-chat-close:hover {
          background: #3f3f46;
          color: #fafafa;
        }
        .soniq-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .soniq-message {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          animation: soniq-fade-in 0.2s ease;
        }
        @keyframes soniq-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .soniq-message.user {
          align-self: flex-end;
          background: ${this.config?.theme_color || "#6366f1"};
          color: white;
          border-bottom-right-radius: 4px;
        }
        .soniq-message.assistant {
          align-self: flex-start;
          background: #27272a;
          color: #fafafa;
          border-bottom-left-radius: 4px;
        }
        .soniq-typing {
          align-self: flex-start;
          background: #27272a;
          padding: 12px 16px;
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          display: flex;
          gap: 4px;
        }
        .soniq-typing span {
          width: 8px;
          height: 8px;
          background: #71717a;
          border-radius: 50%;
          animation: soniq-typing 1.4s infinite;
        }
        .soniq-typing span:nth-child(2) { animation-delay: 0.2s; }
        .soniq-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes soniq-typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .soniq-chat-input-container {
          padding: 12px 16px;
          background: #27272a;
          border-top: 1px solid #3f3f46;
          display: flex;
          gap: 8px;
        }
        .soniq-chat-input {
          flex: 1;
          padding: 10px 14px;
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .soniq-chat-input:focus {
          border-color: ${this.config?.theme_color || "#6366f1"};
        }
        .soniq-chat-input::placeholder {
          color: #71717a;
        }
        .soniq-chat-send {
          padding: 10px 16px;
          background: ${this.config?.theme_color || "#6366f1"};
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .soniq-chat-send:hover {
          opacity: 0.9;
        }
        .soniq-chat-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .soniq-chat-footer {
          padding: 8px;
          text-align: center;
          font-size: 11px;
          color: #52525b;
        }
        .soniq-chat-footer a {
          color: #71717a;
          text-decoration: none;
        }
        .soniq-chat-footer a:hover {
          color: #a1a1aa;
        }
        @media (max-width: 480px) {
          .soniq-chat-container {
            width: calc(100vw - 20px);
            height: calc(100vh - 100px);
            right: 10px;
            left: 10px;
            bottom: 80px;
            border-radius: 12px;
          }
          .soniq-chat-button {
            right: 10px;
            bottom: 10px;
            width: 56px;
            height: 56px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    createWidget() {
      // Create floating button
      const button = document.createElement("button");
      button.className = "soniq-chat-button";
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      button.onclick = () => this.toggle();
      button.setAttribute("aria-label", "Open chat");

      // Create chat container
      const container = document.createElement("div");
      container.className = "soniq-chat-container hidden";
      container.innerHTML = `
        <div class="soniq-chat-header">
          <div class="soniq-chat-header-info">
            <div class="soniq-chat-avatar">${(this.config?.agent_name || "A").charAt(0).toUpperCase()}</div>
            <div>
              <div class="soniq-chat-name">${this.config?.agent_name || "Assistant"}</div>
              <div class="soniq-chat-status">Online</div>
            </div>
          </div>
          <button class="soniq-chat-close" aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="soniq-chat-messages" id="soniq-messages"></div>
        <div class="soniq-chat-input-container">
          <input
            type="text"
            class="soniq-chat-input"
            id="soniq-input"
            placeholder="Type a message..."
            autocomplete="off"
          />
          <button class="soniq-chat-send" id="soniq-send">Send</button>
        </div>
        <div class="soniq-chat-footer">
          Powered by <a href="https://soniq.ai" target="_blank" rel="noopener">Soniq</a>
        </div>
      `;

      document.body.appendChild(button);
      document.body.appendChild(container);

      // Store references
      this.button = button;
      this.container = container;
      this.messagesContainer = container.querySelector("#soniq-messages");
      this.input = container.querySelector("#soniq-input");
      this.sendButton = container.querySelector("#soniq-send");

      // Event listeners
      container.querySelector(".soniq-chat-close").onclick = () =>
        this.toggle();
      this.sendButton.onclick = () => this.sendMessage();
      this.input.onkeypress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      };
    }

    toggle() {
      this.isOpen = !this.isOpen;
      this.container.classList.toggle("hidden", !this.isOpen);

      if (this.isOpen) {
        this.input.focus();
      }
    }

    addMessage(role, content) {
      const div = document.createElement("div");
      div.className = `soniq-message ${role}`;
      div.textContent = content;
      this.messagesContainer.appendChild(div);
      this.scrollToBottom();
    }

    showTyping() {
      const typing = document.createElement("div");
      typing.className = "soniq-typing";
      typing.id = "soniq-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      this.messagesContainer.appendChild(typing);
      this.scrollToBottom();
    }

    hideTyping() {
      const typing = document.getElementById("soniq-typing");
      if (typing) typing.remove();
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async sendMessage() {
      const message = this.input.value.trim();
      if (!message || this.isLoading) return;

      // Clear input and add user message
      this.input.value = "";
      this.addMessage("user", message);

      // Show typing indicator
      this.isLoading = true;
      this.sendButton.disabled = true;
      this.showTyping();

      try {
        const response = await fetch(`${this.apiUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenant_id: this.tenantId,
            session_id: this.sessionId,
            message: message,
            visitor_info:
              Object.keys(this.visitorInfo).length > 0
                ? this.visitorInfo
                : undefined,
          }),
        });

        const data = await response.json();

        this.hideTyping();

        if (response.ok) {
          this.addMessage("assistant", data.response);

          // Handle tool results (booking confirmations, etc.)
          if (data.tool_calls) {
            this.handleToolResults(data.tool_calls);
          }
        } else {
          this.addMessage(
            "assistant",
            "Sorry, I encountered an issue. Please try again.",
          );
          console.error("[SoniqChat] API error:", data);
        }
      } catch (err) {
        this.hideTyping();
        this.addMessage(
          "assistant",
          "Sorry, I'm having trouble connecting. Please try again.",
        );
        console.error("[SoniqChat] Network error:", err);
      } finally {
        this.isLoading = false;
        this.sendButton.disabled = false;
        this.input.focus();
      }
    }

    handleToolResults(toolCalls) {
      for (const tc of toolCalls) {
        // Handle specific tool results
        if (tc.name === "collect_contact_info" && tc.result?.info) {
          // Update local visitor info
          this.visitorInfo = { ...this.visitorInfo, ...tc.result.info };
        }

        if (tc.name === "create_booking" && tc.result?.success) {
          console.log("[SoniqChat] Booking created:", tc.result);
        }

        if (tc.name === "create_order" && tc.result?.success) {
          console.log("[SoniqChat] Order created:", tc.result);
        }
      }
    }

    // Public API methods
    open() {
      if (!this.isOpen) this.toggle();
    }

    close() {
      if (this.isOpen) this.toggle();
    }

    setVisitorInfo(info) {
      this.visitorInfo = { ...this.visitorInfo, ...info };
    }
  }

  // Expose globally
  window.SoniqChat = SoniqChat;
})();
