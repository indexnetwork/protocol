import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, it, expect, mock } from "bun:test";

// Mock all concrete adapters/services before importing the module under test
mock.module("../../../../../protocol/src/adapters/cache.adapter", () => ({
  RedisCacheAdapter: class {
    get = mock(async () => null);
    set = mock(async () => {});
    delete = mock(async () => {});
  },
}));

mock.module("../../../../../protocol/src/adapters/integration.adapter", () => ({
  ComposioIntegrationAdapter: class {
    getIntegrationStatus = mock(async () => ({}));
  },
}));

mock.module("../../../../../protocol/src/adapters/database.adapter", () => ({
  chatDatabaseAdapter: { getUser: mock(async () => null) },
  conversationDatabaseAdapter: { getConversation: mock(async () => null) },
  ChatDatabaseAdapter: class {},
  createUserDatabase: mock((_db: unknown, _userId: string) => ({ listIntents: mock(async () => []) })),
  createSystemDatabase: mock((_db: unknown, _userId: string, _scope: string[], _emb?: unknown) => ({
    searchIntents: mock(async () => []),
  })),
}));

mock.module("../../../../../protocol/src/adapters/embedder.adapter", () => ({
  EmbedderAdapter: class {
    embed = mock(async () => []);
  },
}));

mock.module("../../../../../protocol/src/adapters/scraper.adapter", () => ({
  ScraperAdapter: class {
    scrape = mock(async () => ({ title: "", content: "" }));
  },
}));

mock.module("../../../../../protocol/src/queues/intent.queue", () => ({
  intentQueue: {
    add: mock(async () => {}),
    process: mock(() => {}),
  },
}));

mock.module("../../../../../protocol/src/services/chat.service", () => ({
  chatSessionService: {
    getSession: mock(async () => null),
    listMessages: mock(async () => []),
  },
}));

mock.module("../../../../../protocol/src/services/contact.service", () => ({
  contactService: {
    importContacts: mock(async () => ({ imported: 0, skipped: 0, newContacts: 0, existingContacts: 0, details: [] })),
    listContacts: mock(async () => []),
    addContact: mock(async () => ({ userId: "u1", isNew: false, isGhost: false })),
    removeContact: mock(async () => {}),
  },
}));

mock.module("../../../../../protocol/src/services/integration.service", () => ({
  IntegrationService: class {
    importContacts = mock(async () => ({ imported: 0, skipped: 0, newContacts: 0, existingContacts: 0 }));
  },
}));

mock.module("../../../../../protocol/src/lib/parallel/parallel", () => ({
  enrichUserProfile: mock(async () => ({})),
}));

import { createDefaultProtocolDeps } from "../../../../protocol/src/protocol-init.js";

describe("createDefaultProtocolDeps()", () => {
  it("returns an object with all required ProtocolDeps fields", () => {
    const deps = createDefaultProtocolDeps();

    expect(deps).toBeDefined();
    expect(deps.database).toBeDefined();
    expect(deps.embedder).toBeDefined();
    expect(deps.scraper).toBeDefined();
    expect(deps.cache).toBeDefined();
    expect(deps.hydeCache).toBeDefined();
    expect(deps.integration).toBeDefined();
    expect(deps.intentQueue).toBeDefined();
    expect(deps.contactService).toBeDefined();
    expect(deps.chatSession).toBeDefined();
    expect(deps.enricher).toBeDefined();
    expect(deps.negotiationDatabase).toBeDefined();
    expect(deps.integrationImporter).toBeDefined();
    expect(deps.createUserDatabase).toBeDefined();
    expect(deps.createSystemDatabase).toBeDefined();
  });

  it("createUserDatabase is a function", () => {
    const deps = createDefaultProtocolDeps();
    expect(typeof deps.createUserDatabase).toBe("function");
  });

  it("createSystemDatabase is a function", () => {
    const deps = createDefaultProtocolDeps();
    expect(typeof deps.createSystemDatabase).toBe("function");
  });

  it("enricher.enrichUserProfile is a function", () => {
    const deps = createDefaultProtocolDeps();
    expect(typeof deps.enricher.enrichUserProfile).toBe("function");
  });

  it("contactService has importContacts, listContacts, addContact, removeContact methods", () => {
    const deps = createDefaultProtocolDeps();
    expect(typeof deps.contactService.importContacts).toBe("function");
    expect(typeof deps.contactService.listContacts).toBe("function");
    expect(typeof deps.contactService.addContact).toBe("function");
    expect(typeof deps.contactService.removeContact).toBe("function");
  });
});
