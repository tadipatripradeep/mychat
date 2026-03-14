const express = require("express");
const cors = require("cors");
const path = require("path");
// Use node-fetch so this works on older Node versions too
const fetch = (...args) => import("node-fetch").then(({ default: fetchFn }) => fetchFn(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Change this if your Ollama model name is different
const MODEL_NAME = process.env.OLLAMA_MODEL || "llama3";
const OLLAMA_CHAT_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// In-memory conversation history per simple session (very basic)
let conversationHistory = [
  {
    role: "system",
    content: "You are a helpful AI assistant."
  }
];

app.post("/api/chat", async (req, res) => {
  try {
    const { message, reset } = req.body || {};

    if (reset) {
      conversationHistory = [
        {
          role: "system",
          content: "You are a helpful AI assistant."
        }
      ];
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string in body." });
    }

    conversationHistory.push({
      role: "user",
      content: message
    });

    const payload = {
      model: MODEL_NAME,
      messages: conversationHistory,
      stream: false
    };

    const response = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Ollama error:", response.status, text);
      return res.status(500).json({ error: "Error from Ollama", details: text });
    }

    const data = await response.json();
    const assistantMessage = data.message?.content || "";

    conversationHistory.push({
      role: "assistant",
      content: assistantMessage
    });

    res.json({ reply: assistantMessage });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Using Ollama model: ${MODEL_NAME}`);
})
