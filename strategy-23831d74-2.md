## 📚 Executive Summary  

The **Model‑Tester‑Tool** is a Node/Express + WebSocket service that forwards user prompts to third‑party LLM providers (OpenRouter, HuggingFace) and streams the results back to the browser. The audit uncovered **critical security gaps, reliability weaknesses, performance bottlenecks and architectural debt** that together jeopardise production‑grade operation.  

The plan below follows an **Agile + Event‑Modeling** approach:

* **User Stories** describe the *AS‑IS* problem and the desired *TO‑BE* state.  
* **Acceptance Criteria** are concrete, testable conditions.  
* **Story Points** (1 = tiny, 8 = large) give an estimate for sprint planning.  
* **Event‑Model** tables show the commands, events and read‑models that each major flow will employ once the refactor is complete.  

All remediation work is expressed as **tasks** that can be imported directly into the audit platform’s backlog (see the `<tasks>` block at the end).  

---  

## 1️⃣ Event‑Model Overview  

| Domain | Command | Event(s) Emitted | Read‑Model(s) Updated |
|--------|---------|------------------|-----------------------|
| **Authentication** | `AuthenticateCommand(requestHeaders, wsHandshake?)` | `UserAuthenticated(userId, scopes)`, `AuthenticationFailed(reason)` | `AuthSessionReadModel` (stores active JWT → user mapping, expiry) |
| **Chat (HTTP)** | `StartChatCommand(payload, abortSignal?)` | `ChatStarted`, `ChatChunkReceived`, `ChatCompleted`, `ChatFailed` | `ChatSessionReadModel` (status, timestamps, token usage) |
| **Chat (WebSocket)** | `WsChatMessageCommand(ws, payload, abortSignal?)` | `WsChatMessageReceived`, `WsChatChunkSent`, `WsChatCompleted`, `WsChatRateLimited`, `WsChatAborted` | `WsChatReadModel` (per‑socket counters, last‑seq) |
| **Rate‑Limiting** | `CheckRateLimitCommand(userId, bucket)` | `RateLimitPassed`, `RateLimitExceeded` | `RateLimitReadModel` (shared Redis counters) |
| **Provider Discovery** | `RefreshProvidersCommand()` | `ProvidersRefreshed(providerList)` | `ProviderCatalogReadModel` (cached provider metadata) |
| **Observability** | `CollectMetricsCommand()` | `MetricsCollected(metricSnapshot)` | `MetricsReadModel` (Prometheus exposition) |
| **Error Handling** | `LogErrorCommand(error, context)` | `ErrorLogged` | `ErrorLogReadModel` (elastic index) |

*All commands are dispatched by the Express route handlers or the WebSocket gateway. Events are emitted via a **domain event bus** (Node EventEmitter or a lightweight in‑process broker) and persisted as structured JSON in Winston logs (and optionally in Redis for real‑time dashboards).*

---  

## 2️⃣ Detailed Findings, User Stories & Remediation  

> **Formatting rule:** each issue appears as a **User Story** → **Acceptance Criteria** → **Root Cause / Impact** → **Recommended Fix** → **Story Points** → **Event‑Model Impact**.  

### 2.1 Security  

#### 🔐 1 – **Missing Authentication & Authorization (Critical)**
**User Story**  
*As a security auditor, I need every inbound API request (REST and WebSocket) to be authenticated and authorized so that only verified users can invoke LLM providers and consume streaming data.*

**Acceptance Criteria**  
1. All `/api/*` routes reject unauthenticated calls with **401** and log the attempt.  
2. WebSocket hand‑shake validates a JWT (or API‑Key) and rejects the upgrade with **401** if invalid.  
3. Tokens are verified against a trusted JWKS endpoint (Auth0/Keycloak) or an HMAC secret; scopes are checked per‑endpoint (`chat:read`, `chat:write`).  
4. Successful authentication creates an **AuthSessionReadModel** entry containing `userId`, `scopes`, and `expiresAt`.  
5. Every subsequent domain command includes `userId` and is audited with the request‑ID.

**Root‑Cause / Impact**  
The current codebase contains **no auth middleware**; anyone can hit `/api/chat` or open unlimited WebSocket connections.  This enables quota‑drain attacks, cost overruns and data‑privacy violations (OWASP A01 – Broken Access Control).  

**Recommended Fix**  
1. Implement `authMiddleware.ts` that extracts `Authorization: Bearer <jwt>` and validates it with `jsonwebtoken` (supporting JWKS auto‑refresh).  
2. Register the middleware globally after the request‑ID middleware.  
3. For WebSocket, parse the token from the query string (`?token=`) or `Sec-WebSocket-Protocol` header, verify it, and store `ws.userId`.  
4. Create a `requireScope(scope)` higher‑order function for route‑level checks.  
5. Emit `UserAuthenticated` / `AuthenticationFailed` events; update `AuthSessionReadModel`.  
6. Add unit‑/integration tests for happy‑path, expired token, missing token and insufficient scope.

**Story Points**: 5  

**Event‑Model Impact**: Adds `AuthenticateCommand` → `UserAuthenticated` / `AuthenticationFailed` events; introduces `AuthSessionReadModel`.

---

#### 🔐 2 – **Improper Secrets Management (High)**
**User Story**  
*As a DevSecOps engineer, I need provider API keys to live only on the server side and never be accepted from the client, preventing credential leakage and unauthorized quota use.*

**Acceptance Criteria**  
1. The public `ChatPayload` schema **does not contain** any fields for `openRouterKey` or `hfApiKey`.  
2. Server code obtains provider credentials **exclusively** via a `SecretsProvider` that reads from `process.env` (validated by `dotenv-safe`).  
3. All logs redact any field whose key matches `*key*` or `*secret*`.  
4. ESLint rule `no-restricted-globals` blocks usage of `process.env.OPENROUTER_API_KEY` etc. inside the `src/` (frontend) folder.  
5. CI fails if the rule is violated.

**Root‑Cause / Impact**  
Clients can supply arbitrary keys, thereby bypassing quota enforcement and exposing privileged credentials. Logging sometimes prints the whole request body, leaking keys to log storage.

**Recommended Fix**  
1. Remove the optional key fields from `MessageSchema` / `ChatPayloadSchema`.  
2. Add a `SecretsProvider` class:  

   ```ts
   class SecretsProvider {
     static openRouterKey = process.env.OPENROUTER_API_KEY!;
     static huggingFaceKey = process.env.HF_API_KEY!;
   }
   ```  

3. Refactor `ChatService` to inject these values into provider adapters.  
4. Implement `redactSensitive(obj)` and plug it into the global error logger.  
5. Add ESLint config:  

   ```json
   "no-restricted-syntax": [
     "error",
     {
       "selector": "MemberExpression[object.name='process'][property.name='env']",
       "message": "Access to process.env is restricted to server code only."
     }
   ]
   ```

**Story Points**: 3  

**Event‑Model Impact**: No new events, but `ChatStarted` now carries a server‑derived `providerKey` (redacted) for audit.

---

#### 🔐 3 – **Unvalidated Image URLs (Medium)**
**User Story**  
*As a security reviewer, I need any `image_url` supplied by the user to be validated against a whitelist of domains, preventing SSRF and downstream XSS.*

**Acceptance Criteria**  
1. `image_url` must be a well‑formed `https://` URL.  
2. Hostname must belong to an approved list (e.g., `i.imgur.com`, `cdn.myapp.com`).  
3. Validation occurs in the Zod schema; failures produce a `400` with a clear error message.  
4. Provider adapters re‑check the whitelist before issuing outbound HTTP calls (defense‑in‑depth).  
5. Unit tests cover at least five allowed and five disallowed hosts.

**Root‑Cause / Impact**  
A raw URL is forwarded to external providers without checks, opening SSRF to internal IP ranges and enabling malicious data‑URIs that could later be rendered unsanitised.

**Recommended Fix**  
- Extend `MessageSchema`:

  ```ts
  const AllowedHosts = ['i.imgur.com', 'cdn.myapp.com'];
  const ImageUrlSchema = z.object({
    url: z.string()
      .url()
      .refine(v => AllowedHosts.some(h => new URL(v).hostname.endsWith(h)),
        { message: 'Image URL host not allowed' })
  });
  ```

- Add verification in each adapter (`if (!isAllowed(url)) throw new ValidationError`).  
- Write comprehensive tests.

**Story Points**: 2  

**Event‑Model Impact**: `ChatStarted` now includes a validated `imageUrls` array; no new events.

---

#### 🔐 4 – **Missing Content‑Security‑Policy (Medium)**
**User Story**  
*As a front‑end security engineer, I need every HTTP response to include a strict CSP header so that any malicious model output cannot execute in the browser.*

**Acceptance Criteria**  
1. All responses contain a `Content‑Security‑Policy` header matching the production policy (default‑src `'self'`, script‑src `'self'` + hash‑based whitelists, img‑src `'self' data:`).  
2. CSP can be overridden only via an explicit `DISABLE_CSP=true` env flag for local development.  
3. A `/csp-violation` endpoint receives violation reports and logs them as `ErrorLogged`.  
4. Tests assert the header presence on at least three distinct routes.

**Root‑Cause / Impact**  
Helmet is loaded but CSP is disabled, leaving the client vulnerable to XSS if a model returns malicious markup.

**Recommended Fix**  
- Configure Helmet with a full CSP object (see code snippet in the audit).  
- Add the violation endpoint and wire it to Winston.  
- Include CSP in the `MetricsReadModel` for observability.

**Story Points**: 2  

**Event‑Model Impact**: `ErrorLogged` may now be emitted for CSP violations.

---

### 2.2 Reliability & Performance  

#### ⚡ 5 – **Inconsistent Rate‑Limiting (High)**
**User Story**  
*As a reliability engineer, I need HTTP and WebSocket traffic to share a single Redis‑backed rate‑limit so that a client cannot bypass limits by switching protocols.*

**Acceptance Criteria**  
1. A unified `RateLimiterService` uses Redis keys of the form `rate_limit:{userId}:{bucket}`.  
2. Limits are configurable via `RATE_LIMIT_CHAT=100/15m` and `RATE_LIMIT_WS_CHAT=200/15m`.  
3. Exceeding the limit returns **429** (HTTP) or a structured WS error (`{type:'error',code:429,…}`).  
4. The service supplies a `Retry‑After` header (or `retryAfterMs` field) based on the Redis TTL.  
5. Integration tests simulate concurrent HTTP+WS calls from the same user and verify a shared quota.

**Root‑Cause / Impact**  
HTTP uses a Redis sliding‑window limiter, while WS uses an in‑memory per‑socket counter. Attackers can open many sockets to exhaust provider quotas.

**Recommended Fix**  
1. Build `RateLimiterService` with atomic Lua scripts for accurate sliding‑window counting.  
2. Replace local `messageCounts` map in `WebSocketGateway` with a call to the service.  
3. Refactor `apiRateLimiter` middleware to delegate to the same service.  
4. Add metric gauges (`rate_limit_current`, `rate_limit_remaining`) to Prometheus.

**Story Points**: 4  

**Event‑Model Impact**: `CheckRateLimitCommand` → `RateLimitPassed` / `RateLimitExceeded`; `RateLimitReadModel` is updated.

---

#### ⚡ 6 – **Missing Back‑Pressure / Cancellation (Medium)**
**User Story**  
*As a performance engineer, I need the server to abort downstream provider requests when the client aborts (HTTP `close` or WS disconnect), freeing resources immediately.*

**Acceptance Criteria**  
1. `ChatService.handleChat` accepts an optional `{ signal?: AbortSignal }`.  
2. Provider adapters pass this signal to `fetch(url, { signal })`.  
3. `req.on('close')` and `ws.on('close')` invoke `abortController.abort()`.  
4. No pending network sockets remain after a client disconnect; process metrics show zero dangling requests.  
5. Tests simulate an abort and confirm the fetch promise rejects with `AbortError`.

**Root‑Cause / Impact**  
The current `AbortController` is instantiated but never wired to the downstream request, causing resource leakage under churn.

**Recommended Fix**  
- Extend the service signature and propagate the signal.  
- Update both HTTP route and WebSocket handler to create and bind the controller.  
- Log abort events as `WsChatAborted` or `ChatFailed` with reason `ClientAbort`.

**Story Points**: 3  

**Event‑Model Impact**: New `WsChatAborted` / `ChatFailed` events carrying `reason: 'ClientAbort'`.

---

#### ⚡ 7 – **Inefficient Provider Orchestration (High)**
**User Story**  
*As a software architect, I need `ChatService` to be a pure orchestrator that delegates provider calls to thin adapters, enabling clean separation, easier testing and OCP compliance.*

**Acceptance Criteria**  
1. `ChatService` contains **no** direct `fetch` or provider‑specific URLs.  
2. A `ProviderFactory` resolves a normalized model identifier to an implementation of `IProvider`.  
3. Adding a new provider requires only a new adapter class and registration; no modifications to `ChatService`.  
4. Unit tests mock `IProvider` and verify that `ChatService.handleChat` forwards the payload unchanged and propagates errors.  
5. Code coverage of `ChatService` reaches **100 %** (only orchestration logic).

**Root‑Cause / Impact**  
Mixing orchestration and provider specifics creates a God class, hampers testability, and makes future extensions risky.

**Recommended Fix**  
- Define `IProvider` interface.  
- Refactor existing OpenRouter and HuggingFace logic into `OpenRouterAdapter` and `HuggingFaceAdapter`.  
- Implement `ProviderFactory.getProvider(model: string): IProvider`.  
- Update route/WS handlers to call `chatService.handleChat(payload, {signal})`.  
- Write adapter unit tests covering success, provider error, and abort handling.

**Story Points**: 5  

**Event‑Model Impact**: `StartChatCommand` now triggers `ChatStarted` → provider‑specific `ChatChunkReceived` events emitted by the adapter (still captured by the same read model).

---

### 2.3 Observability & Logging  

#### 📈 8 – **Unstructured Logs & Missing Correlation IDs (Medium)**
**User Story**  
*As an SRE, I need every log entry to be JSON‑structured and to contain the request‑ID so that traces can be correlated across HTTP, WebSocket and background jobs.*

**Acceptance Criteria**  
1. Winston is configured with `format.combine(timestamp(), json())`.  
2. A helper `getRequestId()` reads the value set by `requestIdMiddleware` (AsyncLocalStorage).  
3. All logger methods (`info`, `error`, `warn`, `debug`) automatically inject `{ requestId }`.  
4. Log rotation uses `winston-daily-rotate-file` with a 14‑day retention policy.  
5. An integration test sends a request, captures the log output, and asserts the same `X‑Request‑Id` appears in the JSON line.

**Root‑Cause / Impact**  
Current logs are a mixture of plain strings and occasional JSON; many entries lack the request identifier, making root‑cause analysis in production extremely difficult.

**Recommended Fix**  
- Refactor `src/infra/Logging.ts` as described.  
- Replace direct `logger.*` calls with the new wrapper (import path unchanged).  
- Add a daily‑rotate transport.  
- Add unit test confirming request‑ID propagation for both HTTP and WS.

**Story Points**: 2  

**Event‑Model Impact**: `ErrorLogged` and other events now carry `requestId` metadata.

---

### 2.4 Missing Features / Documentation  

#### 📖 9 – **README Lacks Security & Deployment Guidance (Low)**
**User Story**  
*As a new maintainer, I need the repository’s README to contain clear sections on secret handling, TLS termination, Helm‑chart hardening and monitoring so that we can ship a production‑ready, secure deployment from day one.*

**Acceptance Criteria**  
1. Add **Security**, **TLS**, and **Helm Hardening** sections.  
2. List every required environment variable, recommended secret‑rotation cadence, and sample Kubernetes Secret manifest.  
3. Provide a minimal Helm chart (or Kustomize overlay) that sets `runAsNonRoot`, `readOnlyRootFilesystem`, resource limits, and a restrictive `NetworkPolicy`.  
4. Include links to OWASP ASVS, CNCF hardening guides, and a checklist for CI pipelines.  
5. Run `markdownlint` as part of CI and ensure the doc passes without warnings.

**Root‑Cause / Impact**  
The current README only covers a quick‑start, leading to insecure default deployments (plain HTTP, secrets baked into Docker env files, no network restrictions).

**Recommended Fix**  
- Expand the README with the above sections and sample manifests.  
- Add the helm chart under `deploy/helm/`.  
- Update CI to lint markdown.

**Story Points**: 1  

**Event‑Model Impact**: None.

---

## 3️⃣ Consolidated Task List  

The table below can be copied verbatim into the audit platform’s backlog.  Every entry contains **title**, **description** (multi‑paragraph, as above), **priority**, **category**, **story points**, and **acceptance criteria**.  

```json
<tasks>
[
  {
    "title": "Implement Authentication & Authorization Middleware",
    "description": "Add a global auth middleware that validates JWTs (or API‑Keys) on every HTTP request and on the WebSocket handshake.  The middleware extracts the token, verifies it against a JWKS endpoint or HMAC secret, checks for required scopes, and creates an AuthSessionReadModel entry.  Unauthorized attempts are logged with request‑ID and responded with 401/403.  The solution includes a reusable `requireScope` helper, a `/csp-violation` endpoint for reporting, and full unit/integration test coverage.",
    "priority": "critical",
    "category": "security",
    "storyPoints": 5,
    "acceptanceCriteria": [
      "All /api/* endpoints require a valid Bearer token and return 401/403 appropriately.",
      "WebSocket handshake fails with 401 when token is missing or invalid.",
      "AuthSessionReadModel stores userId, scopes, and expiry.",
      "Authentication failures are logged with requestId, IP and redacted token fingerprint.",
      "Tests cover happy‑path, missing token, expired token, insufficient scopes."
    ]
  },
  {
    "title": "Remove API Keys from Client Payload & Enforce Server‑Side Secrets",
    "description": "Delete `openRouterKey` and `hfApiKey` fields from the public Zod schema.  Introduce a `SecretsProvider` that reads the keys from environment variables validated by `dotenv-safe`.  Implement a redaction utility that strips any key‑like fields from logs.  Enforce via an ESLint rule that server‑only secrets are never imported into the front‑end folder, causing CI to fail on violations.",
    "priority": "high",
    "category": "security",
    "storyPoints": 3,
    "acceptanceCriteria": [
      "ChatPayload schema no longer accepts client‑supplied provider keys.",
      "Provider adapters read credentials only through SecretsProvider.",
      "Any log that contains a key field shows ***REDACTED***.",
      "ESLint blocks usage of process.env.* keys inside src/**/*.tsx.",
      "Tests verify that a payload containing openRouterKey is ignored."
    ]
  },
  {
    "title": "Validate & Sanitize Image URLs in Chat Messages",
    "description": "Extend the Zod schema for `image_url` with a whitelist of allowed hostnames and enforce HTTPS.  Add a defensive check inside each provider adapter before making outbound calls.  Provide comprehensive unit tests for allowed and blocked domains.",
    "priority": "medium",
    "category": "security",
    "storyPoints": 2,
    "acceptanceCriteria": [
      "Only URLs whose hostname matches an entry in the allowed list pass validation.",
      "Invalid URLs cause a 400 response with a clear error message.",
      "Adapters double‑check the whitelist before issuing HTTP calls.",
      "Test suite includes ≥5 positive and ≥5 negative cases."
    ]
  },
  {
    "title": "Enforce Strict Content‑Security‑Policy via Helmet",
    "description": "Configure Helmet with a production‑grade CSP (default‑src 'self', script‑src 'self' + hash whitelists, img‑src 'self' data:, connect‑src wss:).  Allow disabling only via an explicit env flag for local debugging.  Add a `/csp-violation` endpoint that records violations in the ErrorLogReadModel.  Verify through integration tests that the header is present on multiple routes.",
    "priority": "medium",
    "category": "security",
    "storyPoints": 2,
    "acceptanceCriteria": [
      "Every response includes a CSP header matching the configured directives.",
      "CSP can be turned off only with DISABLE_CSP=true.",
      "Violation reports are ingested and logged.",
      "Tests assert header presence on at least three routes."
    ]
  },
  {
    "title": "Unify Rate Limiting Across HTTP and WebSocket",
    "description": "Create a shared RateLimiterService backed by Redis that implements atomic sliding‑window counting via Lua script.  Refactor both the Express `apiRateLimiter` middleware and the WebSocket message handler to call this service.  Use a unified key schema `rate_limit:{userId}:{bucket}` and expose `Retry-After` information.  Add integration tests that exercise concurrent HTTP + WS usage from the same user.",
    "priority": "high",
    "category": "bug",
    "storyPoints": 4,
    "acceptanceCriteria": [
      "Both HTTP and WS limits are enforced against the same Redis counters.",
      "Exceeding limits returns 429 (HTTP) or WS error payload with code 429.",
      "Retry‑After header (or retryAfterMs) reflects remaining window.",
      "Load test confirms shared quota prevents provider over‑use.",
      "Unit tests cover Redis failure fallback, bucket reset, mixed protocol usage."
    ]
  },
  {
    "title": "Propagate AbortSignal to Provider Calls",
    "description": "Extend the ChatService API to accept an AbortSignal and forward it to every provider adapter's fetch call.  In the HTTP route handler and WebSocket gateway, create an AbortController, bind `req.on('close')` / `ws.on('close')` to `abort()`, and pass the signal downstream.  Ensure aborts are logged as debug events and do not leave dangling sockets.",
    "priority": "medium",
    "category": "bug",
    "storyPoints": 3,
    "acceptanceCriteria": [
      "Provider HTTP requests are cancelled when the originating client disconnects.",
      "No pending network sockets remain after a client abort.",
      "Log entry `Provider request aborted` includes requestId.",
      "Unit tests simulate an abort and verify fetch rejects with AbortError."
    ]
  },
  {
    "title": "Refactor ChatService to Follow SOLID / Clean Architecture",
    "description": "Define an `IProvider` interface and move all provider‑specific HTTP logic into thin adapter classes (`OpenRouterAdapter`, `HuggingFaceAdapter`).  Implement a `ProviderFactory` that returns the correct adapter based on a normalized model identifier.  Reduce `ChatService` to orchestration only (validation, logging, delegating to the factory).  Add unit tests that mock the interface and guarantee 100 % coverage of the orchestrator.",
    "priority": "high",
    "category": "architecture",
    "storyPoints": 5,
    "acceptanceCriteria": [
      "ChatService contains no direct fetch calls.",
      "A new provider can be added without changing ChatService.",
      "All existing integration tests continue to pass.",
      "ChatService coverage reaches 100 %.",
      "No lint warnings introduced during refactor."
    ]
  },
  {
    "title": "Add Unit Tests for Core Middleware",
    "description": "Create Vitest + Supertest suites for `requestIdMiddleware`, `errorHandler` and `apiRateLimiter`.  Tests must cover presence/creation of request IDs, handling of generic errors, Zod validation errors, custom HttpError objects, and proper 429 responses with Retry‑After.  Enforce ≥90 % line coverage for each middleware file and fail the CI pipeline if the threshold is not met.",
    "priority": "medium",
    "category": "feature",
    "storyPoints": 3,
    "acceptanceCriteria": [
      "All three middleware modules have dedicated test suites.",
      "Coverage ≥90 % for each file.",
      "Tests verify success, missing headers, rate‑limit breach and Zod errors.",
      "CI fails when coverage drops below the threshold."
    ]
  },
  {
    "title": "Structure JSON‑Logs with Correlation IDs",
    "description": "Reconfigure Winston to emit JSON (`format.combine(timestamp(), json())`) and create a wrapper logger that automatically injects the current requestId (from AsyncLocalStorage).  Add daily‑rotate file transport with a 14‑day retention policy.  Verify via an integration test that a request’s X‑Request‑Id appears in the JSON log line for both HTTP and WebSocket paths.",
    "priority": "medium",
    "category": "architecture",
    "storyPoints": 2,
    "acceptanceCriteria": [
      "All log lines are valid JSON.",
      "Every entry includes `requestId` matching the inbound request.",
      "Log files rotate daily and are deleted after 14 days.",
      "Test asserts requestId presence on HTTP and WS logs."
    ]
  },
  {
    "title": "Extend README with Security & Deployment Hardening",
    "description": "Add comprehensive sections on secret handling, TLS termination, Helm chart with PodSecurityContext, NetworkPolicy, resource limits, and monitoring.  Include a checklist for CI/CD security gates and links to OWASP ASVS and CNCF hardening guides.  Enforce markdown linting in CI.",
    "priority": "low",
    "category": "feature",
    "storyPoints": 1,
    "acceptanceCriteria": [
      "README contains Security, TLS, and Helm Hardening sections.",
      "All added links point to up‑to‑date external resources.",
      "Markdown lint passes without warnings.",
      "A reviewer can deploy a production‑grade instance following the guide."
    ]
  }
]
</tasks>
```