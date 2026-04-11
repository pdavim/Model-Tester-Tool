import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for OpenRouter Proxy
  app.post("/api/chat", async (req, res) => {
    const { stream, openRouterKey, ...body } = req.body;
    const apiKey = openRouterKey || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: "OpenRouter API Key is required. Please set it in Settings." });
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "OpenRouter Model Tester",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...body, stream: stream || false })
      });

      if (stream) {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body?.getReader();
        if (!reader) {
          return res.status(500).json({ error: "Failed to get reader from OpenRouter response" });
        }

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const data = await response.json();
        res.status(response.status).json(data);
      }
    } catch (error) {
      console.error("Error proxying to OpenRouter:", error);
      res.status(500).json({ error: "Failed to connect to OpenRouter" });
    }
  });

  // API Route for fetching models (optional but nice)
  app.get("/api/models", async (req, res) => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // API Route for Hugging Face Proxy
  app.post("/api/hf/chat", async (req, res) => {
    const { model, messages, hfApiKey, stream } = req.body;
    
    if (!hfApiKey) {
      return res.status(400).json({ error: "Hugging Face API Key is required." });
    }

    try {
      // Convert messages to HF format (usually a single prompt or specific format)
      // For simplicity, we'll use the last message as the prompt or join them
      const prompt = messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\nAssistant:';

      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: req.body.max_tokens || 512,
            temperature: req.body.temperature || 0.7,
            top_p: req.body.top_p || 0.95,
            return_full_text: false
          },
          stream: stream || false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json({ error });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body?.getReader();
        if (!reader) return res.status(500).json({ error: "Failed to get reader" });

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // HF stream format is slightly different, but for a simple proxy we can just pass it through
          // and handle it on the frontend if needed. 
          // Actually, HF returns JSON chunks in the stream.
          res.write(value);
        }
        res.end();
      } else {
        const data = await response.json();
        // Normalize HF response to look like OpenAI/OpenRouter for the frontend
        const content = Array.isArray(data) ? data[0].generated_text : data.generated_text;
        res.json({
          choices: [{
            message: {
              role: "assistant",
              content: content || "No response from model"
            }
          }],
          usage: { total_tokens: 0 } // HF doesn't always return usage in this format
        });
      }
    } catch (error) {
      console.error("Error proxying to Hugging Face:", error);
      res.status(500).json({ error: "Failed to connect to Hugging Face" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
