# @indexnetwork/protocol

The agent orchestration layer for Index Network. Implements LangGraph-based workflows for intent processing, opportunity discovery, and chat — decoupled from any specific infrastructure via adapter injection.

## Install

```bash
npm install @indexnetwork/protocol
```

## Setup

### 1. Configure the LLM

Call `configureProtocol` once at startup before creating any tools or graphs:

```typescript
import { configureProtocol } from "@indexnetwork/protocol";

configureProtocol({
  apiKey: process.env.OPENROUTER_API_KEY,
  chatModel: "google/gemini-2.5-flash",       // optional — has a default
  chatReasoningEffort: "low",                  // optional: minimal | low | medium | high | xhigh
});
```

### 2. Implement the adapters

The package defines interfaces — your application provides the concrete implementations:

| Interface | Responsibility |
|---|---|
| `ChatGraphCompositeDatabase` | Core data access (users, intents, indexes, opportunities) |
| `Embedder` | Vector embeddings for semantic search |
| `Scraper` | Web content extraction |
| `Cache` / `HydeCache` | Result caching |
| `IntegrationAdapter` | OAuth and external tool actions |
| `ContactServiceAdapter` | Contact management |
| `IntentGraphQueue` | Background intent processing queue |
| `ChatSessionReader` | Load conversation history |
| `ProfileEnricher` | Enrich profiles from external sources |
| `NegotiationDatabase` | Negotiation state persistence |

All interfaces are exported from the package root — import them with `import type { ... } from "@indexnetwork/protocol"`.

### 3. Create tools

Pass your adapter implementations to `createChatTools` to get a set of LangChain-compatible tools bound to a user session:

```typescript
import { createChatTools } from "@indexnetwork/protocol";

const tools = await createChatTools({
  userId: "user-uuid",
  sessionId: "chat-session-id",
  indexId: "optional-index-uuid",   // scope tools to a specific index
  database,
  embedder,
  scraper,
  cache,
  hydeCache,
  integration,
  intentQueue,
  contactService,
  chatSession,
  enricher,
  negotiationDatabase,
  integrationImporter,
  createUserDatabase,
  createSystemDatabase,
});

// tools is an array of LangChain Tool objects ready to bind to an agent
```

## Graphs

For direct graph invocation (bypassing the tool layer), factory classes are exported for each workflow:

```typescript
import { ChatGraphFactory, IntentGraphFactory, OpportunityGraphFactory } from "@indexnetwork/protocol";
```

Each factory exposes a `.createGraph()` method that returns a compiled LangGraph ready for `.invoke()`.

## MCP server

To expose tools over the Model Context Protocol:

```typescript
import { createMcpServer } from "@indexnetwork/protocol";

const server = createMcpServer(
  deps,
  (req) => resolveUserIdFromRequest(req),
  { create: (userId, scope) => createScopedDeps(userId, scope) }
);
```

## Publishing

Publishing is handled via CI:

```bash
# dev pushes publish an rc prerelease
git push <remote> dev

# main pushes publish the stable release if the package version is new
git push <remote> main
```

`dev` publishes prerelease versions derived from `package.json` using npm's `rc` tag, for example `0.4.0-rc.123.1`. `main` publishes the base version from `package.json` to `latest`.

Or publish manually from `packages/protocol/`:

```bash
npm publish --access public
```
