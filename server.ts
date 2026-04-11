import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from "node:fs";

async function startServer() {
  const app = express();
  const PORT = 3767;

  app.use(express.json());
  
  // Health check endpoint for Docker/Dokploy
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

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

  // Cache for Hugging Face models
  let hfModelsCache: any[] | null = null;
  let lastHfFetch = 0;
  const HF_CACHE_TTL = 3600000; // 1 hour

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

  // API Route for fetching Hugging Face models
  app.get("/api/hf/models", async (req, res) => {
    const now = Date.now();
    if (hfModelsCache && (now - lastHfFetch < HF_CACHE_TTL)) {
      return res.json(hfModelsCache);
    }

    try {
      // Fetch models tagged with 'conversational' that are available via hf-inference
      const response = await fetch("https://huggingface.co/api/models?pipeline_tag=conversational&inference_provider=all&limit=100&sort=downloads&direction=-1");
      const data = await response.json();
      
      // Map to a consistent format
      const formattedModels = data.map((m: any) => ({
        id: m.id,
        name: m.id.split('/').pop() || m.id,
        description: `Hugging Face model: ${m.id}`,
        created: new Date(m.lastModified).getTime() / 1000,
        architecture: { modality: 'text' },
        provider: 'huggingface'
      }));

      hfModelsCache = formattedModels;
      lastHfFetch = now;
      res.json(formattedModels);
    } catch (error) {
      console.error("Error fetching HF models:", error);
      res.status(500).json({ error: "Failed to fetch HF models" });
    }
  });

  // API Route for Hugging Face Proxy (Modern OpenAI-Compatible)
  app.post("/api/hf/chat", async (req, res) => {
    const { model, messages, hfApiKey, stream, temperature, top_p, max_tokens } = req.body;
    
    if (!hfApiKey) {
      return res.status(400).json({ error: "Hugging Face API Key is required." });
    }

    try {
      // Use the modern v1/chat/completions endpoint
      const response = await fetch(`https://api-inference.huggingface.co/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: max_tokens || 512,
          temperature: temperature || 0.7,
          top_p: top_p || 0.95,
          stream: stream || false
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: "Unknown HF Error", status: response.status };
        }
        
        console.error(`HF API Error (${response.status}):`, errorData);
        return res.status(response.status).json(errorData);
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body?.getReader();
        if (!reader) return res.status(500).json({ error: "Failed to get reader" });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const data = await response.json();
        // Since we're using the v1 endpoint, the response is already OpenAI-compatible
        res.json(data);
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
    // Robust path resolution for production
    const distPath = path.resolve(__dirname, "dist");
    const indexPath = path.join(distPath, "index.html");

    console.log(`[Production] Serving static files from: ${distPath}`);
    
    // Diagnostic check at startup
    if (!fs.existsSync(distPath)) {
      console.error(`[CRITICAL] Static directory missing: ${distPath}`);
    } else if (!fs.existsSync(indexPath)) {
      console.error(`[CRITICAL] index.html missing at: ${indexPath}`);
    } else {
      console.log(`[Production] index.html found. Ready to serve.`);
    }

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Page Not Found - Build assets are missing.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
