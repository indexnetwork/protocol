# Agent Implementation Template

This document provides a guide for implementing agents within the protocol. It is based on patterns established in `ProfileGenerator` and `HydeGenerator`.

---

## File Structure

Agents are organized by domain under `./agents/[domain]/`. Each agent should have:
- `[name].generator.ts` — Main implementation
- `[name].generator.spec.ts` — Test file
- `README.md` _(optional)_ — Documentation for complex agents

---

## Implementation Order

Follow this canonical order within your agent file:

1. **Imports**
2. **Config** (env loading, model instantiation)
3. **System Prompt** (const)
4. **Response Schema** (Zod)
5. **Type Definitions** (derived from schema)
6. **Class Definition**

---

## Code Template

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import { log } from "../../../log";
import { Database } from "../../interfaces/database.interface";
import { Embedder } from "../../interfaces/embedder.interface";

/**
 * Config
 */
import { config } from "dotenv";
config({ path: '.env.development', override: true });

const model = new ChatOpenAI({
  model: 'google/gemini-2.5-flash',
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY
  }
});

// ──────────────────────────────────────────────────────────────
// 1. SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────

const systemPrompt = `
    You are a [Role].
    [Detailed instructions for the agent's behavior]
    
    Output Rules:
    1. [Rule 1]
    2. [Rule 2]
`;

// ──────────────────────────────────────────────────────────────
// 2. RESPONSE SCHEMA (Zod)
// ──────────────────────────────────────────────────────────────

const responseFormat = z.object({
  field: z.string().describe("Description of the field"),
  nested: z.object({
    subfield: z.array(z.string()).describe("Description")
  })
});

// ──────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ──────────────────────────────────────────────────────────────

type ResponseType = z.infer<typeof responseFormat>;
export type DocumentType = ResponseType & { id: string; embedding: number[] };

// ──────────────────────────────────────────────────────────────
// 4. CLASS DEFINITION
// ──────────────────────────────────────────────────────────────

export class MyAgent {
  private model: any;
  private database: Database;
  private embedder: Embedder;

  constructor(database: Database, embedder: Embedder) {
    this.model = model.withStructuredOutput(responseFormat, {
      name: "my_agent"
    });
    this.database = database;
    this.embedder = embedder;
  }

  /**
   * Converts the structured response into an embeddable string.
   * Used for generating vector embeddings.
   */
  private toString(output: ResponseType): string {
    return [
      '# Section',
      output.field,
      '## Subsection',
      output.nested.subfield.join(', ')
    ].join('\n');
  }

  /**
   * Main entry point. Invokes the agent with input and returns structured output.
   * @param input - Raw input data for the agent
   * @param entityId - ID of the entity being processed
   */
  public async invoke(input: string, entityId: string) {
    log.info('[MyAgent.invoke] Received input', { input });
    
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Here is the input:\n${input}`)
    ];
    const result = await this.model.invoke(messages);
    const output = responseFormat.parse(result);
    
    const textToEmbed = this.toString(output);
    const embedding = await this.embedder.generate(textToEmbed);
    
    await this.saveToDatabase({ ...output, id: entityId, embedding });
    
    log.info('[MyAgent.invoke] Successfully processed', { output });
    return { output, textToEmbed };
  }

  /**
   * Persists the generated output to the database.
   * Handles upsert logic internally.
   */
  private async saveToDatabase(document: DocumentType) {
    const exists = await this.database.exists<DocumentType>(
      'collection_name',
      { filter: { id: document.id } }
    );
    
    if (exists) {
      await this.database.update<DocumentType>('collection_name', {
        filter: { id: document.id },
        data: document
      });
    } else {
      await this.database.create<DocumentType>('collection_name', {
        data: document
      });
    }
  }

  /**
   * Factory method to expose the agent as a LangChain tool.
   * Useful for composing agents into larger graphs.
   */
  public static asTool(database: Database, embedder: Embedder) {
    return tool(
      async (args: { input: string; entityId: string }) => {
        const agent = new MyAgent(database, embedder);
        return await agent.invoke(args.input, args.entityId);
      },
      {
        name: 'myAgent',
        description: 'Description of what this agent does',
        schema: z.object({
          input: z.string().describe('The input data'),
          entityId: z.string().describe('The entity ID to process')
        })
      }
    );
  }
}
```

---

## Key Patterns

### 1. Structured Output via Zod
Always use `z.object()` with `.describe()` on each field. This ensures the LLM understands what to return.

### 2. `toString()` for Embeddings
Implement a private `toString()` method to serialize structured output into a markdown-like string suitable for embedding generation.

### 3. Dependency Injection
Agents receive `Database` and `Embedder` via constructor. **Never import `db` directly** — this keeps agents testable and decoupled.

### 4. `asTool()` Static Factory
Expose agents as LangChain tools via a static `asTool()` method. This enables composition into larger agent graphs.

### 5. Logging
Use `log.info()` at the start and end of `invoke()` for traceability.

---

## Test File Template

```typescript
/**
 * Load environment variables
 */
import { config } from "dotenv";
config({ path: '.env.development', override: true });

/**
 * Imports
 */
import { MyAgent } from "./my-agent.generator";
import { beforeEach, describe, expect, it } from "bun:test";

describe('My Agent', () => {
  let agent: MyAgent;

  beforeEach(() => {
    // Instantiate with mocks or real dependencies
    agent = new MyAgent();
  });

  it('should process input correctly', async () => {
    const result = await agent.invoke('test input', 'test-id');
    
    expect(result.output.field).toBeDefined();
    expect(result.textToEmbed).toBeTruthy();
  }, 60000); // LLM calls need extended timeout
});
```

---

## Checklist

- [ ] System prompt is at the top, after config
- [ ] Zod schema with `.describe()` on all fields
- [ ] Type aliases derived via `z.infer<>`
- [ ] `toString()` method for embedding serialization
- [ ] `invoke()` is the public entry point
- [ ] `saveToDatabase()` is private
- [ ] `asTool()` static factory for graph composition
- [ ] Spec file with extended timeout (60s)
- [ ] JSDoc comments on public methods
