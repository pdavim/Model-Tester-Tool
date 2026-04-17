import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Shared, Infra, and Config
import { config } from './src/config/env';
import { Logger, logStream } from './src/infra/Logging';
import { requestIdMiddleware } from './src/api/middleware/requestId';
import { authenticate } from './src/api/middleware/authMiddleware';
import { apiRateLimiter } from './src/api/middleware/rateLimiter';
import { errorHandler } from './src/api/middleware/errorHandler';

// Routes
import chatRoutes from './src/api/routes/chat.routes';
import modelRoutes from './src/api/routes/model.routes';
import metaRoutes from './src/api/routes/meta.routes';
import { WebSocketGateway } from './src/api/gateways/WebSocketGateway';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = config.PORT;

  // 0. Global Settings
  app.set('trust proxy', 1);

  // 1. Core Middlewares

  app.use(requestIdMiddleware);
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logStream }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // 2. Security Middlewares
  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // Removed 'unsafe-inline' and 'unsafe-eval'
        connectSrc: ["'self'", "https://openrouter.ai", "https://huggingface.co", "https://*.huggingface.co", "wss://*"],
        imgSrc: ["'self'", "data:", "*.innovaive.com"], // Whitelisted hosts
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        reportUri: '/api/csp-violation', // Added violation reporting
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CSP Violation reporting endpoint
  app.post('/api/csp-violation', (req, res) => {
    Logger.warn('CSP Violation:', req.body);
    res.status(204).end();
  });

  // 3. API Routes
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Model Tester API',
        version: '1.4.0',
        description: 'Hardened API for LLM Benchmarking',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      servers: [{ url: `http://localhost:${PORT}` }],
    },
    apis: ['./src/api/routes/*.ts', './server.ts'],
  };
  const specs = swaggerJsdoc(swaggerOptions);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

  app.use('/api', metaRoutes); // /health, /metrics
  
  // Protected Routes
  app.use('/api', authenticate); 
  app.use('/api', apiRateLimiter); 
  app.use('/api', chatRoutes); 
  app.use('/api', modelRoutes); 

/**
 * Legacy Hugging Face inference. Sanitized (keys from server only).
 */
app.post('/api/hf/inference', async (req, res, next) => {
  try {
    const { InferenceClient } = await import('@huggingface/inference');
    const { model, inputs, parameters } = req.body;
    const key = config.HF_KEY;
      if (!key) return res.status(500).json({ error: 'HF API Key not configured on server' });
      
      const client = new InferenceClient(key);
      const result = await client.request({ model, inputs, parameters });

      if (result instanceof Blob) {
        const arrayBuffer = await result.arrayBuffer();
        res.setHeader('Content-Type', result.type);
        res.send(Buffer.from(arrayBuffer));
      } else {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  });

  // 4. Static Serving & Frontend
  if (config.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');

    Logger.info(`[Production] Serving static files from: ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      Logger.error(`[CRITICAL] Static directory missing: ${distPath}`);
    }
  }

  // 5. Global Error Handler
  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    Logger.info(`Server running on http://localhost:${PORT}`);
    Logger.info(`Swagger UI available at http://localhost:${PORT}/api/docs`);
  });

  // Initialize WebSocket Gateway
  new WebSocketGateway(server);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
