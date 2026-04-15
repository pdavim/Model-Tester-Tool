import promClient from 'prom-client';

// Create a Registry which registers the metrics
export const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'model-tester-tool'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// --- Custom Metrics ---

export const chatRequestsCounter = new promClient.Counter({
  name: 'chat_requests_total',
  help: 'Total number of chat requests',
  labelNames: ['provider', 'model', 'status'],
});

export const chatStreamBytesCounter = new promClient.Counter({
  name: 'chat_stream_bytes_total',
  help: 'Total bytes streamed from providers',
  labelNames: ['provider', 'model'],
});

export const modelFetchLatencyHistogram = new promClient.Histogram({
  name: 'model_fetch_latency_ms',
  help: 'Latency of fetching model lists from providers in ms',
  labelNames: ['provider'],
  buckets: [100, 300, 500, 1000, 2000, 5000],
});

export const requestDurationHistogram = new promClient.Histogram({
  name: 'request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Register custom metrics
register.registerMetric(chatRequestsCounter);
register.registerMetric(chatStreamBytesCounter);
register.registerMetric(modelFetchLatencyHistogram);
register.registerMetric(requestDurationHistogram);
