import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import express from "express";
import path from "path";
import helmet from "helmet";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from "node:fs";
import { InferenceClient } from "@huggingface/inference";

async function startServer() {
  const app = express();
  const PORT = 3767;

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite & dynamic AI execution
        connectSrc: ["'self'", "https://openrouter.ai", "https://huggingface.co", "https://*.huggingface.co"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow external media
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Health check endpoint for Docker/Dokploy
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API Route for OpenRouter Proxy
  app.post("/api/chat", async (req, res) => {
    const { 
      model, 
      messages, 
      temperature, 
      top_p, 
      max_tokens, 
      stream, 
      openRouterKey 
    } = req.body;
    
    const apiKey = openRouterKey;
    
    if (!apiKey) {
      return res.status(401).json({ error: "OpenRouter API Key is required. Please set it in Settings." });
    }

    try {
      const payload = {
        model,
        messages,
        temperature,
        top_p,
        max_tokens,
        stream: stream || false
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "OpenRouter Model Tester",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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
      const hfKey = process.env.OPENROUTER_API_KEY;
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: hfKey ? { "Authorization": `Bearer ${hfKey}` } : {}
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // API Route for fetching Hugging Face models
  app.get("/api/hf/models", async (req, res) => {
    const { search } = req.query;
    const now = Date.now();

    // Only cache the default (no search) results
    if (!search && hfModelsCache && (now - lastHfFetch < HF_CACHE_TTL)) {
      return res.json(hfModelsCache);
    }

    try {
      console.log(`[HF Discovery] Fetching models (search: ${search || 'none'})`);
      const hfKey = req.headers['x-hf-key'] as string || process.env.HF_KEY;
      const authHeader = hfKey ? { "Authorization": `Bearer ${hfKey}` } : {};

      if (search) {
        // Dynamic search on HF Hub - Broadened search (removed inference_provider restriction)
        const searchUrl = `https://huggingface.co/api/models?search=${encodeURIComponent(search as string)}&limit=100&sort=downloads&direction=-1`;
        console.log(`[HF Discovery] Search URL: ${searchUrl}`);
        const response = await fetch(searchUrl, { headers: authHeader });
        const data = await response.json();
        console.log(`[HF Discovery] Found ${data.length} models for query "${search}"`);
        
        const searchResults = data.map((m: any) => ({
          id: m.id,
          name: m.id.split('/').pop() || m.id,
          description: `Hugging Face model: ${m.id}`,
          created: new Date(m.lastModified).getTime() / 1000,
          pipeline_tag: m.pipeline_tag,
          pricing: { prompt: "0", completion: "0" },
          architecture: { 
            modality: m.pipeline_tag?.includes('audio') ? 'audio' : 
                      m.pipeline_tag?.includes('video') ? 'video' : 
                      m.pipeline_tag?.includes('image') ? 'image' : 'text' 
          },
          provider: 'huggingface'
        }));

        return res.json(searchResults);
      }

      // Default: Fetch popular models across key tags
      const PIPELINE_TAGS = [
        'conversational',
        'text-generation',
        'text-to-speech',
        'text-to-video',
        'feature-extraction',
        'summarization',
        'translation',
        'text-to-image'
      ];

      const allModelsPromises = PIPELINE_TAGS.map(async (tag) => {
        try {
          // Broadened tag discovery: Remove inference_provider restriction to ensure more models appear
          const response = await fetch(`https://huggingface.co/api/models?pipeline_tag=${tag}&limit=50&sort=downloads&direction=-1`, {
            headers: authHeader
          });
          const data = await response.json();
          return data.map((m: any) => ({
            id: m.id,
            name: m.id.split('/').pop() || m.id,
            description: `Hugging Face model: ${m.id}`,
            created: new Date(m.lastModified).getTime() / 1000,
            pipeline_tag: tag,
            pricing: { prompt: "0", completion: "0" },
            architecture: { 
              modality: tag.includes('audio') ? 'audio' : tag.includes('video') ? 'video' : tag.includes('image') ? 'image' : 'text' 
            },
            provider: 'huggingface'
          }));
        } catch (e) {
          console.error(`Error fetching models for tag ${tag}:`, e);
          return [];
        }
      });

      const results = await Promise.all(allModelsPromises);
      const flattenedModels = results.flat();
      
      // Deduplicate by ID
      const uniqueModels = Array.from(new Map(flattenedModels.map(m => [m.id, m])).values());
      console.log(`[HF Discovery] Discovery complete. Total unique models: ${uniqueModels.length}`);

      hfModelsCache = uniqueModels;
      lastHfFetch = now;
      res.json(uniqueModels);
    } catch (error) {
      console.error("Error fetching HF models:", error);
      res.status(500).json({ error: "Failed to fetch HF models" });
    }
  });

  // API Route for Generic Hugging Face Inference (Supports blobs/non-chat)
  app.post("/api/hf/inference", async (req, res) => {
    const { model, inputs, hfApiKey, parameters } = req.body;
    
    if (!hfApiKey) {
      return res.status(400).json({ error: "Hugging Face API Key is required." });
    }

    try {
      const client = new InferenceClient(hfApiKey);
      
      const result = await client.request({
        model,
        inputs,
        parameters,
      });

      if (result instanceof Blob) {
        const arrayBuffer = await result.arrayBuffer();
        res.setHeader("Content-Type", result.type);
        res.send(Buffer.from(arrayBuffer));
      } else {
        res.json(result);
      }
    } catch (error: any) {
      console.error("Error in HF inference:", error);
      const statusCode = error.status || 500;
      res.status(statusCode).json({ error: error.message || "Failed to connect to Hugging Face Inference" });
    }
  });

  // API Route for Hugging Face Proxy (Modern OpenAI-Compatible with Fallback)
  app.post("/api/hf/chat", async (req, res) => {
    const { 
      model, 
      messages, 
      hfApiKey, 
      stream, 
      temperature, 
      top_p, 
      max_tokens 
    } = req.body;
    
    if (!hfApiKey) {
      return res.status(400).json({ error: "Hugging Face API Key is required." });
    }

    const client = new InferenceClient(hfApiKey);

    const tryChatCompletion = async (isFallback = false) => {
      // If we are in fallback, we target the model specific endpoint directly
      // but still use the chatCompletion API if the library handles it.
      // However, usually we fallback to the model endpoint if the router fails.
      
      if (stream) {
        if (!isFallback) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
        }

        const chatStream = client.chatCompletionStream({
          model,
          messages,
          max_tokens: max_tokens || 512,
          temperature: temperature || 0.7,
          top_p: top_p || 0.95,
        });

        for await (const chunk of chatStream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const response = await client.chatCompletion({
          model,
          messages,
          max_tokens: max_tokens || 512,
          temperature: temperature || 0.7,
          top_p: top_p || 0.95,
        });
        res.json(response);
      }
    };

    try {
      // Primary attempt: Use optimized Inference Router
      await tryChatCompletion(false);
    } catch (primaryError: any) {
      console.warn(`[HF Proxy] Primary (Router) failed for ${model}:`, primaryError.message);
      
      try {
        // Fallback attempt: Use standard Model specific endpoint
        // NOTE: Standard endpoint might have different support, but InferenceClient handles normalization
        await tryChatCompletion(true);
      } catch (fallbackError: any) {
        console.error(`[HF Proxy] Fallback failed for ${model}:`, fallbackError.message);
        
        const errorMsg = fallbackError.message || primaryError.message || "";
        if (errorMsg.includes("not a chat model")) {
          return res.status(400).json({ 
            error: { 
              message: `The model '${model}' does not support the Chat Completions API. Please use an '-Instruct' or '-Chat' variant, or use the Generic Inference API for base models.` 
            } 
          });
        }

        res.status(fallbackError.status || 500).json({ 
          error: { message: `HF API Error: ${errorMsg}` } 
        });
      }
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
