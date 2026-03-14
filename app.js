const chatContainer = document.getElementById("chat-container");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");

let isSending = false;

function addMessage(role, content, isTemp = false) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (role === "assistant" && isTemp) {
    const loader = document.createElement("div");
    loader.className = "loading-indicator";
    loader.innerHTML = `
      <span>Thinking</span>
      <span class="dot-pulse"></span>
      <span class="dot-pulse"></span>
      <span class="dot-pulse"></span>
    `;
    bubble.appendChild(loader);
  } else {
    bubble.textContent = content;
  }

  row.appendChild(bubble);

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = role === "user" ? "You" : "Llama 3";
  row.appendChild(meta);

  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return { row, bubble };
}

function setSendingState(sending) {
  isSending = sending;
  sendBtn.disabled = sending;
}

async function sendMessage() {
  if (isSending) return;

  const text = messageInput.value.trim();
  if (!text) return;

  setSendingState(true);

  addMessage("user", text);
  messageInput.value = "";
  autoResizeTextarea();

  const tempAssistant = addMessage("assistant", "", true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `HTTP ${res.status}`);
    }

    const data = await res.json();

    tempAssistant.bubble.textContent = data.reply || "(No response)";
  } catch (err) {
    console.error(err);
    tempAssistant.bubble.textContent = "Error talking to Ollama. Is it running?";
  } finally {
    tempAssistant.bubble.parentElement.querySelector(".message-meta").textContent = "Llama 3";
    setSendingState(false);
  }
}

function resetChat() {
  chatContainer.innerHTML = "";
  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "New chat started.", reset: true })
  }).catch(() => {
    // ignore errors here, it just resets server-side history
  });
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

sendBtn.addEventListener("click", () => {
  sendMessage();
});

resetBtn.addEventListener("click", () => {
  resetChat();
});

messageInput.addEventListener("input", autoResizeTextarea);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initial welcome message
addMessage("assistant", "Hi! I am your local Llama 3 assistant. Ask me anything.");

