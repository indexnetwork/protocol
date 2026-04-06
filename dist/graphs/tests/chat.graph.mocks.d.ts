/**
 * Configurable mock database and fixture data for chat graph workflow tests.
 * Use createChatGraphMockDb(config) to get a full ChatGraphCompositeDatabase
 * with controllable profile, intents, index membership, and opportunities.
 */
import type { ChatGraphCompositeDatabase, ActiveIntent, IndexedIntentDetails, IndexMembership, OwnedIndex, UserRecord, Opportunity, OpportunityStatus } from "../../interfaces/database.interface.js";
import type { ChatSessionReader } from "../../interfaces/chat-session.interface.js";
import type { ProtocolDeps } from "../../tools/tool.helpers.js";
export interface MockProfileFixture {
    id: string;
    userId: string;
    identity: {
        name: string;
        bio: string;
        location: string;
    };
    narrative: {
        context: string;
    };
    attributes: {
        skills: string[];
        interests: string[];
    };
    embedding: number[] | null;
}
export interface ChatGraphMockConfig {
    /** Profile for the session user (null = no profile). */
    profile?: MockProfileFixture | null;
    /** Active intents per userId (global scope). */
    activeIntents?: (userId: string) => ActiveIntent[] | Promise<ActiveIntent[]>;
    /** Intents in index for a member (userId, indexId) -> member's intents in that index. */
    intentsInIndexForMember?: (userId: string, indexId: string) => ActiveIntent[] | Promise<ActiveIntent[]>;
    /** All intents in index (owner view). (indexId, requestingUserId) -> details. */
    indexIntentsForOwner?: (indexId: string, requestingUserId: string) => IndexedIntentDetails[] | Promise<IndexedIntentDetails[]>;
    /** Opportunities for user. */
    opportunitiesForUser?: (userId: string) => Opportunity[] | Promise<Opportunity[]>;
    /** Index memberships for user. */
    indexMemberships?: (userId: string) => IndexMembership[] | Promise<IndexMembership[]>;
    /** Index by id (for scope validation). */
    getIndex?: (indexId: string) => {
        id: string;
        title: string;
    } | null | Promise<{
        id: string;
        title: string;
    } | null>;
    /** (indexId, userId) -> is member. */
    isIndexMember?: (indexId: string, userId: string) => boolean | Promise<boolean>;
    /** (indexId, userId) -> is owner. */
    isIndexOwner?: (indexId: string, userId: string) => boolean | Promise<boolean>;
    /** User record by id. */
    getUser?: (userId: string) => UserRecord | null | Promise<UserRecord | null>;
    /** Owned indexes for user. */
    ownedIndexes?: (userId: string) => OwnedIndex[] | Promise<OwnedIndex[]>;
}
/** Actor shape for opportunity mocks (role determines visibility). */
export type MockOpportunityActor = {
    indexId: string;
    userId: string;
    role: "introducer" | "patient" | "agent" | "peer" | "party";
    intent?: string;
};
/** Build a minimal Opportunity for list_my_opportunities / create_opportunities tests. */
export declare function mockOpportunity(overrides: {
    id?: string;
    status?: OpportunityStatus;
    indexId?: string;
    /** Current user (must be one of the actors so they "have" this opportunity). */
    currentUserId?: string;
    /** Other party user ids (role "party"); tool resolves names via getUser. Ignored if actors is provided. */
    otherPartyUserIds?: string[];
    /** Override actors with specific roles for role-based visibility tests. */
    actors?: MockOpportunityActor[];
}): Opportunity;
/** Build a minimal IndexedIntentDetails for owner view. */
export declare function mockIndexedIntent(overrides: {
    id?: string;
    payload?: string;
    userId?: string;
    userName?: string;
}): IndexedIntentDetails;
/** Build a minimal ActiveIntent. */
export declare function mockActiveIntent(overrides: {
    id?: string;
    payload?: string;
}): ActiveIntent;
/** Build a minimal profile fixture. */
export declare function mockProfile(overrides: {
    userId?: string;
    name?: string;
}): MockProfileFixture;
/**
 * Create a ChatGraphCompositeDatabase mock from config.
 * Any method not overridden by config uses a safe noop/default.
 */
export declare function createChatGraphMockDb(config?: ChatGraphMockConfig): ChatGraphCompositeDatabase;
/** Mock ChatSessionReader with stub implementations for graph tests. */
export declare const mockChatSessionReader: ChatSessionReader;
/**
 * Create a mock ProtocolDeps with stub implementations for all fields.
 * Pass overrides to customise individual deps for specific tests.
 */
export declare function createMockProtocolDeps(overrides?: Partial<ProtocolDeps>): ProtocolDeps;
//# sourceMappingURL=chat.graph.mocks.d.ts.map