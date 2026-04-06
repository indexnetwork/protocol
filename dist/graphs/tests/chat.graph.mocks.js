/**
 * Configurable mock database and fixture data for chat graph workflow tests.
 * Use createChatGraphMockDb(config) to get a full ChatGraphCompositeDatabase
 * with controllable profile, intents, index membership, and opportunities.
 */
const noop = async () => undefined;
const noopArray = async () => [];
const noopNull = async () => null;
const noopBool = async () => false;
const defaultOwnedIndex = () => ({
    id: "",
    title: "",
    prompt: null,
    imageUrl: null,
    permissions: {
        joinPolicy: "anyone",
        allowGuestVibeCheck: false,
        invitationLink: null,
    },
    isPersonal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    memberCount: 0,
    intentCount: 0,
    user: { id: "", name: "", avatar: null },
    _count: { members: 0 },
});
/** Build a minimal Opportunity for list_my_opportunities / create_opportunities tests. */
export function mockOpportunity(overrides) {
    const id = overrides.id ?? `opp-${Date.now()}`;
    const networkId = overrides.networkId ?? "idx-1";
    const otherIds = overrides.otherPartyUserIds ?? ["user-alice"];
    const currentUserId = overrides.currentUserId ?? "current-user";
    const actors = overrides.actors ?? [
        { networkId, userId: currentUserId, role: "party" },
        ...otherIds.map((userId) => ({ networkId, userId, role: "party" })),
    ];
    return {
        id,
        detection: {
            source: "opportunity_graph",
            timestamp: new Date().toISOString(),
        },
        actors,
        interpretation: { category: "connection", reasoning: "Match", confidence: 0.8 },
        context: { networkId },
        confidence: "0.8",
        status: overrides.status ?? "latent",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
    };
}
/** Build a minimal IndexedIntentDetails for owner view. */
export function mockIndexedIntent(overrides) {
    return {
        id: overrides.id ?? `intent-${Date.now()}`,
        payload: overrides.payload ?? "Looking for a co-founder",
        summary: null,
        userId: overrides.userId ?? "user-1",
        userName: overrides.userName ?? "Alice",
        createdAt: new Date(),
    };
}
/** Build a minimal ActiveIntent. */
export function mockActiveIntent(overrides) {
    return {
        id: overrides.id ?? `intent-${Date.now()}`,
        payload: overrides.payload ?? "Looking for a technical co-founder",
        summary: null,
        createdAt: new Date(),
    };
}
/** Build a minimal profile fixture. */
export function mockProfile(overrides) {
    const userId = overrides.userId ?? "user-1";
    return {
        id: `profile-${userId}`,
        userId,
        identity: {
            name: overrides.name ?? "Test User",
            bio: "Test bio",
            location: "NYC",
        },
        narrative: { context: "Test context" },
        attributes: { skills: ["TypeScript"], interests: ["AI"] },
        embedding: null,
    };
}
/**
 * Create a ChatGraphCompositeDatabase mock from config.
 * Any method not overridden by config uses a safe noop/default.
 */
export function createChatGraphMockDb(config = {}) {
    const profile = config.profile ?? null;
    const activeIntents = config.activeIntents ?? (() => []);
    const intentsInIndexForMember = config.intentsInIndexForMember ?? (() => []);
    const indexIntentsForOwner = config.indexIntentsForOwner ?? (() => []);
    const opportunitiesForUser = config.opportunitiesForUser ?? (() => []);
    const networkMemberships = config.networkMemberships ?? (() => []);
    const getNetwork = config.getNetwork ?? (() => null);
    const isNetworkMember = config.isNetworkMember ?? (() => false);
    const isIndexOwner = config.isIndexOwner ?? (() => false);
    const getUser = config.getUser ??
        ((userId) => ({ id: userId, name: "Test User", email: "test@example.com" }));
    const ownedIndexes = config.ownedIndexes ?? (() => []);
    return {
        getProfile: async () => (profile ? { ...profile } : null),
        getProfileByUserId: async () => (profile ? { ...profile } : null),
        getActiveIntents: async (userId) => Promise.resolve(activeIntents(userId)).then((f) => (Array.isArray(f) ? f : [])),
        getIntentsInIndexForMember: async (userId, networkId) => Promise.resolve(intentsInIndexForMember(userId, networkId)).then((f) => Array.isArray(f) ? f : []),
        getUser: async (userId) => Promise.resolve(getUser(userId)),
        updateUser: async (userId, data) => ({
            id: userId,
            name: data?.name ?? 'Test User',
            email: 'test@example.com',
            socials: data?.socials ?? null,
            location: data?.location ?? null,
        }),
        saveProfile: noop,
        createIntent: async (data) => ({
            id: `intent-${Date.now()}`,
            payload: data.payload,
            summary: null,
            isIncognito: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: data.userId,
        }),
        updateIntent: noopNull,
        archiveIntent: async () => ({ success: true }),
        getUserIndexIds: async (userId) => {
            const memberships = await Promise.resolve(networkMemberships(userId));
            return Array.isArray(memberships) ? memberships.map((m) => m.networkId) : [];
        },
        getNetworkMemberships: async (userId) => Promise.resolve(networkMemberships(userId)).then((f) => (Array.isArray(f) ? f : [])),
        getNetwork: async (networkId) => Promise.resolve(getNetwork(networkId)),
        getNetworkMembership: async (networkId, userId) => {
            const index = await Promise.resolve(getNetwork(networkId));
            if (!index)
                return null;
            const member = await Promise.resolve(isNetworkMember(networkId, userId));
            return member ? { networkId, networkTitle: index.title, indexPrompt: null, permissions: [] } : null;
        },
        getNetworkWithPermissions: async () => null,
        getIntentForIndexing: noopNull,
        getNetworkMemberContext: noopNull,
        getOpportunitiesForUser: async (userId) => Promise.resolve(opportunitiesForUser(userId)).then((f) => (Array.isArray(f) ? f : [])),
        createOpportunity: async () => mockOpportunity({ currentUserId: "system" }),
        getOpportunity: noopNull,
        opportunityExistsBetweenActors: async () => false,
        getOpportunityBetweenActors: async () => null,
        findOverlappingOpportunities: async () => [],
        updateOpportunityStatus: noopNull,
        getHydeDocument: noopNull,
        getHydeDocumentsForSource: noopArray,
        saveHydeDocument: noop,
        getIntent: noopNull,
        isIntentAssignedToIndex: noopBool,
        assignIntentToNetwork: noop,
        unassignIntentFromIndex: noop,
        getNetworkIdsForIntent: noopArray,
        getOwnedIndexes: async (userId) => Promise.resolve(ownedIndexes(userId)).then((f) => (Array.isArray(f) ? f : [])),
        isIndexOwner: async (networkId, userId) => Promise.resolve(isIndexOwner(networkId, userId)),
        isNetworkMember: async (networkId, userId) => Promise.resolve(isNetworkMember(networkId, userId)),
        getNetworkMembersForOwner: noopArray,
        getNetworkMembersForMember: noopArray,
        getMembersFromUserIndexes: async () => [],
        removeMemberFromIndex: async () => ({ success: true }),
        getNetworkIntentsForOwner: async (networkId, requestingUserId, opts) => Promise.resolve(indexIntentsForOwner(networkId, requestingUserId)).then((f) => Array.isArray(f) ? f : []),
        getNetworkIntentsForMember: async () => [],
        updateIndexSettings: async () => defaultOwnedIndex(),
        softDeleteNetwork: noop,
        deleteProfile: noop,
        createNetwork: async () => defaultOwnedIndex(),
        getNetworkMemberCount: async () => 0,
        addMemberToNetwork: noop,
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// MOCK CHAT SESSION READER & PROTOCOL DEPS
// ═══════════════════════════════════════════════════════════════════════════════
/** Mock ChatSessionReader with stub implementations for graph tests. */
export const mockChatSessionReader = {
    getSessionMessages: async () => [],
};
/**
 * Create a mock ProtocolDeps with stub implementations for all fields.
 * Pass overrides to customise individual deps for specific tests.
 */
export function createMockProtocolDeps(overrides) {
    // NOTE: database, embedder, scraper are intentionally omitted.
    // ChatGraphFactory spreads protocolDeps over {database, embedder, scraper, ...},
    // so including stubs here would overwrite the real mocks passed to the constructor.
    return {
        cache: { get: async () => null, set: async () => { }, delete: async () => false, exists: async () => false, mget: async () => [], deleteByPattern: async () => 0 },
        hydeCache: { get: async () => null, set: async () => { }, delete: async () => false, exists: async () => false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integration: { createSession: async () => ({ toolkits: async () => ({ items: [] }), authorize: async () => ({ redirectUrl: "" }) }), executeToolAction: async () => ({ successful: true }), listConnections: async () => [], getAuthUrl: async () => ({ redirectUrl: "" }), disconnect: async () => ({ success: true }) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        intentQueue: { addGenerateHydeJob: async () => ({}), addDeleteHydeJob: async () => ({}) },
        contactService: { importContacts: async () => ({ imported: 0, skipped: 0, newContacts: 0, existingContacts: 0, details: [] }), listContacts: async () => [], addContact: async () => ({ userId: "", isNew: false, isGhost: false }), removeContact: async () => { } },
        chatSession: { getSessionMessages: async () => [] },
        enricher: { enrichUserProfile: async () => null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        negotiationDatabase: {},
        integrationImporter: { importContacts: async () => ({ imported: 0, skipped: 0, newContacts: 0, existingContacts: 0 }) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createUserDatabase: (db, _userId) => {
            return new Proxy({}, {
                get: (_target, prop) => db[prop] ?? (async () => null),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createSystemDatabase: (db, _userId, _scope) => {
            return new Proxy({}, {
                get: (_target, prop) => db[prop] ?? (async () => null),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            });
        },
        ...overrides,
    };
}
//# sourceMappingURL=chat.graph.mocks.js.map