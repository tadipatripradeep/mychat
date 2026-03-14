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

// Serve static frontend files
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// API endpoint for chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Body must include non-empty 'messages' array." });
    }

    const payload = {
      model: MODEL_NAME,
      messages,
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

    res.json({ reply: assistantMessage });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Fallback for any other route (so "/" serves index.html)
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Using Ollama model: ${MODEL_NAME}`);
})
