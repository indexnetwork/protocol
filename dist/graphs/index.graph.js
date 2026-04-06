import { StateGraph, START, END } from "@langchain/langgraph";
import { protocolLogger } from "../support/protocol.logger.js";
import { timed } from "../support/performance.js";
import { IndexGraphState } from "../states/index.state.js";
const logger = protocolLogger("IndexGraphFactory");
/**
 * Factory class to build and compile the Index (CRUD) Graph.
 *
 * Handles create, read, update, and delete operations for indexes.
 * Membership and intent-index assignment operations are handled by
 * separate graphs (IndexMembershipGraph and IntentIndexGraph).
 *
 * Flow:
 * START → routerNode → {createNode | readNode | updateNode | deleteNode} → END
 */
export class IndexGraphFactory {
    constructor(database) {
        this.database = database;
    }
    createGraph() {
        // --- NODE DEFINITIONS ---
        /**
         * Read Node: List indexes the user belongs to and owns.
         */
        const readNode = async (state) => {
            return timed("IndexGraph.read", async () => {
                logger.verbose("Read indexes", { userId: state.userId, indexId: state.indexId, showAll: state.showAll });
                try {
                    const [allMemberships, ownedIndexes, publicIndexesResult] = await Promise.all([
                        this.database.getIndexMemberships(state.userId),
                        this.database.getOwnedIndexes(state.userId),
                        this.database.getPublicIndexesNotJoined(state.userId),
                    ]);
                    // If index-scoped and not showAll, return just that index (no public indexes in scoped view)
                    const scopeToCurrentIndex = state.indexId && !state.showAll;
                    if (scopeToCurrentIndex) {
                        const indexId = state.indexId;
                        const isMember = await this.database.isIndexMember(indexId, state.userId);
                        if (!isMember) {
                            return {
                                readResult: {
                                    memberOf: [],
                                    owns: [],
                                    stats: { memberOfCount: 0, ownsCount: 0, scopeNote: "Index not found or you are not a member." },
                                },
                            };
                        }
                        const membership = allMemberships.find((m) => m.indexId === indexId);
                        const owned = ownedIndexes.find((o) => o.id === indexId);
                        return {
                            readResult: {
                                memberOf: membership
                                    ? [{ indexId: membership.indexId, title: membership.indexTitle, description: membership.indexPrompt, autoAssign: membership.autoAssign, joinedAt: membership.joinedAt }]
                                    : [],
                                owns: owned
                                    ? [{ indexId: owned.id, title: owned.title, description: owned.prompt, memberCount: owned.memberCount, intentCount: owned.intentCount, joinPolicy: owned.permissions.joinPolicy }]
                                    : [],
                                stats: { memberOfCount: membership ? 1 : 0, ownsCount: owned ? 1 : 0, scopeNote: "Showing current index. Use showAll: true for all indexes." },
                            },
                        };
                    }
                    // Include public indexes available to join
                    const publicIndexes = publicIndexesResult.indexes.map((idx) => ({
                        indexId: idx.id,
                        title: idx.title,
                        description: idx.prompt,
                        memberCount: idx.memberCount,
                        owner: idx.owner,
                    }));
                    return {
                        readResult: {
                            memberOf: allMemberships.map((m) => ({ indexId: m.indexId, title: m.indexTitle, description: m.indexPrompt, autoAssign: m.autoAssign, joinedAt: m.joinedAt })),
                            owns: ownedIndexes.map((o) => ({ indexId: o.id, title: o.title, description: o.prompt, memberCount: o.memberCount, intentCount: o.intentCount, joinPolicy: o.permissions.joinPolicy })),
                            publicIndexes,
                            stats: { memberOfCount: allMemberships.length, ownsCount: ownedIndexes.length, publicIndexesCount: publicIndexes.length },
                        },
                    };
                }
                catch (err) {
                    logger.error("Read indexes failed", { error: err });
                    return { error: "Failed to fetch index information." };
                }
            });
        };
        /**
         * Create Node: Create a new index and add user as owner.
         */
        const createNode = async (state) => {
            return timed("IndexGraph.create", async () => {
                logger.verbose("Create index", { userId: state.userId, createInput: state.createInput });
                if (!state.createInput?.title?.trim()) {
                    return { mutationResult: { success: false, error: "Title is required." } };
                }
                let createdIndexId;
                try {
                    const index = await this.database.createIndex({
                        title: state.createInput.title.trim(),
                        prompt: state.createInput.prompt?.trim() || undefined,
                        imageUrl: state.createInput.imageUrl ?? undefined,
                        joinPolicy: state.createInput.joinPolicy,
                    });
                    createdIndexId = index.id;
                    const added = await this.database.addMemberToIndex(index.id, state.userId, 'owner');
                    if (!added.success) {
                        logger.error("addMemberToIndex failed; cleaning up orphaned index", { indexId: index.id });
                        try {
                            await this.database.softDeleteIndex(index.id);
                        }
                        catch { }
                        return { mutationResult: { success: false, error: "Failed to set you as owner. Index was not created." } };
                    }
                    return {
                        mutationResult: {
                            success: true,
                            indexId: index.id,
                            title: index.title,
                            message: `Index "${index.title}" created. You are the owner.`,
                        },
                    };
                }
                catch (err) {
                    logger.error("Create index failed", { error: err });
                    if (createdIndexId) {
                        try {
                            await this.database.softDeleteIndex(createdIndexId);
                        }
                        catch { }
                    }
                    return { mutationResult: { success: false, error: "Failed to create index." } };
                }
            });
        };
        /**
         * Update Node: Update index settings (owner only).
         */
        const updateNode = async (state) => {
            return timed("IndexGraph.update", async () => {
                const indexId = state.indexId;
                logger.verbose("Update index", { userId: state.userId, indexId, updateInput: state.updateInput });
                if (!indexId) {
                    return { mutationResult: { success: false, error: "indexId is required for update." } };
                }
                try {
                    const isOwner = await this.database.isIndexOwner(indexId, state.userId);
                    if (!isOwner) {
                        return { mutationResult: { success: false, error: "You can only modify indexes you own." } };
                    }
                    await this.database.updateIndexSettings(indexId, state.userId, state.updateInput ?? {});
                    return {
                        mutationResult: {
                            success: true,
                            indexId,
                            message: "Index settings updated.",
                        },
                    };
                }
                catch (err) {
                    logger.error("Update index failed", { error: err });
                    return { mutationResult: { success: false, error: "Failed to update index." } };
                }
            });
        };
        /**
         * Delete Node: Soft-delete an index (owner only, sole member).
         */
        const deleteNode = async (state) => {
            return timed("IndexGraph.delete", async () => {
                const indexId = state.indexId;
                logger.verbose("Delete index", { userId: state.userId, indexId });
                if (!indexId) {
                    return { mutationResult: { success: false, error: "indexId is required for delete." } };
                }
                try {
                    const isOwner = await this.database.isIndexOwner(indexId, state.userId);
                    if (!isOwner) {
                        return { mutationResult: { success: false, error: "You can only delete indexes you own." } };
                    }
                    const count = await this.database.getIndexMemberCount(indexId);
                    if (count > 1) {
                        return { mutationResult: { success: false, error: "Cannot delete index with other members. Remove members first." } };
                    }
                    await this.database.softDeleteIndex(indexId);
                    return {
                        mutationResult: {
                            success: true,
                            indexId,
                            message: "Index deleted.",
                        },
                    };
                }
                catch (err) {
                    logger.error("Delete index failed", { error: err });
                    return { mutationResult: { success: false, error: "Failed to delete index." } };
                }
            });
        };
        // --- CONDITIONAL ROUTING ---
        const routeByMode = (state) => {
            switch (state.operationMode) {
                case 'create': return 'create';
                case 'read': return 'read';
                case 'update': return 'update';
                case 'delete': return 'delete_idx';
                default: return 'read';
            }
        };
        // --- GRAPH ASSEMBLY ---
        const workflow = new StateGraph(IndexGraphState)
            .addNode("read", readNode)
            .addNode("create", createNode)
            .addNode("update", updateNode)
            .addNode("delete_idx", deleteNode)
            .addConditionalEdges(START, routeByMode, {
            read: "read",
            create: "create",
            update: "update",
            delete_idx: "delete_idx",
        })
            .addEdge("read", END)
            .addEdge("create", END)
            .addEdge("update", END)
            .addEdge("delete_idx", END);
        return workflow.compile();
    }
}
//# sourceMappingURL=index.graph.js.map