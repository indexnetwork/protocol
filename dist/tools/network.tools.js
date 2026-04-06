import { z } from "zod";
import { requestContext } from "../support/request-context.js";
import { success, error, UUID_REGEX } from "./tool.helpers.js";
export function createNetworkTools(defineTool, deps) {
    const { graphs, userDb, systemDb } = deps;
    const readIndexes = defineTool({
        name: "read_networks",
        description: "Lists indexes the user is a member of and indexes they own. Optional userId (omit for current user). When chat is index-scoped, returns only that index.",
        querySchema: z.object({
            userId: z.string().optional().describe("Omit for current user."),
        }),
        handler: async ({ context, query }) => {
            if (query.userId && query.userId.trim() !== context.userId) {
                return error("You can only list your own indexes. Omit userId to see the current user's indexes.");
            }
            const _readIndexGraphStart = Date.now();
            const _readIndexTraceEmitter = requestContext.getStore()?.traceEmitter;
            _readIndexTraceEmitter?.({ type: "graph_start", name: "index" });
            const result = await graphs.index.invoke({
                userId: context.userId,
                networkId: context.networkId || undefined,
                operationMode: 'read',
                showAll: false, // Never allow bypass - strict scope enforcement
            });
            const _readIndexGraphMs = Date.now() - _readIndexGraphStart;
            _readIndexTraceEmitter?.({ type: "graph_end", name: "index", durationMs: _readIndexGraphMs });
            if (result.error) {
                return error(result.error);
            }
            if (result.readResult) {
                // When scoped, add clear metadata so model knows results are limited
                if (context.networkId) {
                    return success({
                        ...result.readResult,
                        _scopeRestriction: {
                            isScoped: true,
                            scopedToIndex: context.indexName ?? context.networkId,
                            message: `Results are limited to "${context.indexName ?? 'this index'}" because this chat is scoped to that community. The user may belong to other communities not shown here.`,
                        },
                        _graphTimings: [{ name: 'index', durationMs: _readIndexGraphMs, agents: result.agentTimings ?? [] }],
                    });
                }
                return success({ ...result.readResult, _graphTimings: [{ name: 'index', durationMs: _readIndexGraphMs, agents: result.agentTimings ?? [] }] });
            }
            return error("Failed to fetch index information.");
        },
    });
    const readIndexMemberships = defineTool({
        name: "read_network_memberships",
        description: "Reads index membership data. Two modes: (1) Pass networkId to list all members of that index (returns userId, name, avatar, permissions, intentCount, joinedAt). (2) Pass userId (or omit for current user) to list all indexes that user belongs to (returns networkId, networkTitle, permissions, joinedAt). Pass both to check whether a specific user is in a specific index. When chat is index-scoped, only that index can be queried.",
        querySchema: z.object({
            networkId: z.string().optional().describe("Index UUID — when provided, lists members of this index."),
            userId: z.string().optional().describe("User ID — when provided, lists that user's index memberships. Omit to default to current user."),
        }),
        handler: async ({ context, query }) => {
            const networkId = query.networkId?.trim() || undefined;
            const userId = query.userId?.trim() || undefined;
            if (networkId && !UUID_REGEX.test(networkId)) {
                return error("Invalid index ID format. Use the exact UUID from read_networks.");
            }
            // Mode 1: list members of an index
            if (networkId && !userId) {
                // Enforce strict scope: when chat is index-scoped, only allow querying that index
                if (context.networkId && networkId !== context.networkId) {
                    return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only query members of this index.`);
                }
                const _readMembersGraphStart = Date.now();
                const _readMembersTraceEmitter = requestContext.getStore()?.traceEmitter;
                _readMembersTraceEmitter?.({ type: "graph_start", name: "network_membership" });
                const result = await graphs.networkMembership.invoke({
                    userId: context.userId,
                    networkId,
                    operationMode: 'read',
                });
                const _readMembersGraphMs = Date.now() - _readMembersGraphStart;
                _readMembersTraceEmitter?.({ type: "graph_end", name: "network_membership", durationMs: _readMembersGraphMs });
                if (result.error) {
                    return error(result.error);
                }
                if (result.readResult) {
                    return success({ ...result.readResult, _graphTimings: [{ name: 'network_membership', durationMs: _readMembersGraphMs, agents: result.agentTimings ?? [] }] });
                }
                return error("Failed to fetch index members.");
            }
            // Mode 2: list a user's memberships (indexes they belong to)
            const targetUserId = userId || context.userId;
            // Use userDb for own memberships, but systemDb access is implicit through shared index scope
            let memberships;
            if (targetUserId !== context.userId) {
                // Cross-user access: systemDb will validate shared index membership
                const callerMemberships = await userDb.getNetworkMemberships();
                if (networkId) {
                    // Strict scope enforcement: when chat is index-scoped, only allow querying that index
                    if (context.networkId && networkId !== context.networkId) {
                        return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only query membership in this community.`);
                    }
                    const callerInIndex = callerMemberships.some((m) => m.networkId === networkId);
                    if (!callerInIndex) {
                        return error("Unauthorized: you can only view another user's membership in an index you belong to. Provide your own userId or omit userId for your memberships.");
                    }
                    // Check if target user is in the index (systemDb validates scope)
                    const isMember = await systemDb.isNetworkMember(networkId, targetUserId);
                    if (isMember) {
                        return success({ isMember: true, userId: targetUserId, networkId });
                    }
                    return success({ isMember: false, userId: targetUserId, networkId, message: "User is not a member of this index." });
                }
                else {
                    // Strict scope enforcement: when chat is index-scoped, only check the scoped index
                    if (context.networkId) {
                        const isMember = await systemDb.isNetworkMember(context.networkId, targetUserId);
                        if (isMember) {
                            return success({
                                isMember: true,
                                userId: targetUserId,
                                networkId: context.networkId,
                                _scopeRestriction: {
                                    isScoped: true,
                                    scopedToIndex: context.indexName ?? context.networkId,
                                    message: `This chat is scoped to "${context.indexName ?? 'this index'}". Only membership in this community is shown.`,
                                },
                            });
                        }
                        return success({
                            isMember: false,
                            userId: targetUserId,
                            networkId: context.networkId,
                            message: "User is not a member of this community.",
                            _scopeRestriction: {
                                isScoped: true,
                                scopedToIndex: context.indexName ?? context.networkId,
                                message: `This chat is scoped to "${context.indexName ?? 'this index'}". Only membership in this community was checked.`,
                            },
                        });
                    }
                    // Unscoped chat: show overlap with shared indexes (intersection of caller and target memberships)
                    const sharedIndexes = [];
                    for (const m of callerMemberships) {
                        if (await systemDb.isNetworkMember(m.networkId, targetUserId)) {
                            sharedIndexes.push(m);
                        }
                    }
                    if (sharedIndexes.length === 0) {
                        return error("Unauthorized: you can only view another user's memberships if you share at least one index, or request your own memberships.");
                    }
                    // Return only the indexes that are shared
                    return success({
                        userId: targetUserId,
                        count: sharedIndexes.length,
                        memberships: sharedIndexes.map((m) => ({
                            networkId: m.networkId,
                            networkTitle: m.networkTitle,
                        })),
                        note: "Only showing shared indexes.",
                    });
                }
            }
            else {
                // Own memberships - use userDb
                memberships = await userDb.getNetworkMemberships();
                // Strict scope enforcement: when chat is index-scoped, only return the scoped index membership
                if (context.networkId && !networkId) {
                    memberships = memberships.filter((m) => m.networkId === context.networkId);
                }
            }
            // If both networkId and userId: filter to that specific membership
            if (networkId) {
                // Strict scope enforcement: when chat is index-scoped, only allow querying that index
                if (context.networkId && networkId !== context.networkId) {
                    return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only query membership in this community.`);
                }
                const callerMemberships = await userDb.getNetworkMemberships();
                const callerInIndex = targetUserId === context.userId ||
                    callerMemberships.some((m) => m.networkId === networkId);
                if (!callerInIndex) {
                    return error("Unauthorized: you can only view membership in an index you belong to.");
                }
                const match = memberships.find((m) => m.networkId === networkId);
                if (!match) {
                    return success({ isMember: false, userId: targetUserId, networkId, message: "User is not a member of this index." });
                }
                return success({
                    isMember: true,
                    userId: targetUserId,
                    networkId,
                    networkTitle: match.networkTitle,
                    permissions: match.permissions,
                    joinedAt: match.joinedAt,
                });
            }
            // When scoped, add clear metadata so model knows results are limited
            if (context.networkId && targetUserId === context.userId) {
                return success({
                    userId: targetUserId,
                    count: memberships.length,
                    memberships: memberships.map((m) => ({
                        networkId: m.networkId,
                        networkTitle: m.networkTitle,
                        permissions: m.permissions,
                        joinedAt: m.joinedAt,
                    })),
                    _scopeRestriction: {
                        isScoped: true,
                        scopedToIndex: context.indexName ?? context.networkId,
                        message: `Results are limited to "${context.indexName ?? 'this index'}" because this chat is scoped to that community. The user may belong to other communities not shown here.`,
                    },
                });
            }
            return success({
                userId: targetUserId,
                count: memberships.length,
                memberships: memberships.map((m) => ({
                    networkId: m.networkId,
                    networkTitle: m.networkTitle,
                    permissions: m.permissions,
                    joinedAt: m.joinedAt,
                })),
            });
        },
    });
    const updateNetworkSettingsSchema = z.object({
        title: z.string().optional(),
        prompt: z.string().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        joinPolicy: z.enum(['anyone', 'invite_only']).optional(),
        allowGuestVibeCheck: z.boolean().optional(),
    }).strict();
    const updateNetwork = defineTool({
        name: "update_network",
        description: "Updates an index (owner only). Pass networkId or omit when index-scoped.",
        querySchema: z.object({
            networkId: z.string().optional().describe("Index UUID; defaults to current index when scoped."),
            settings: updateNetworkSettingsSchema.describe("Fields to update: title?, prompt?, imageUrl?, joinPolicy?, allowGuestVibeCheck?"),
        }),
        handler: async ({ context, query }) => {
            const effectiveIndexId = (query.networkId?.trim() || context.networkId) ?? null;
            if (!effectiveIndexId || !UUID_REGEX.test(effectiveIndexId)) {
                return error("Valid networkId required.");
            }
            // Strict scope enforcement: when chat is index-scoped, only allow updating that index
            if (context.networkId && effectiveIndexId !== context.networkId) {
                return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only update this community's settings.`);
            }
            const _updateNetworkGraphStart = Date.now();
            const _updateNetworkTraceEmitter = requestContext.getStore()?.traceEmitter;
            _updateNetworkTraceEmitter?.({ type: "graph_start", name: "index" });
            const result = await graphs.index.invoke({
                userId: context.userId,
                networkId: effectiveIndexId,
                operationMode: 'update',
                updateInput: query.settings,
            });
            const _updateNetworkGraphMs = Date.now() - _updateNetworkGraphStart;
            _updateNetworkTraceEmitter?.({ type: "graph_end", name: "index", durationMs: _updateNetworkGraphMs });
            if (result.mutationResult && !result.mutationResult.success) {
                return error(result.mutationResult.error || "Failed to update index.");
            }
            return success({ message: "Index updated.", settings: Object.keys(query.settings), _graphTimings: [{ name: 'index', durationMs: _updateNetworkGraphMs, agents: result.agentTimings ?? [] }] });
        },
    });
    const createNetwork = defineTool({
        name: "create_network",
        description: "Creates a new index (community). You become the owner. Pass title; optional prompt, imageUrl, and joinPolicy ('anyone' | 'invite_only').",
        querySchema: z.object({
            title: z.string().describe("Display name of the index"),
            prompt: z.string().optional().describe("What the community is about"),
            imageUrl: z.string().url().optional().describe("URL of the index image (optional)"),
            joinPolicy: z.enum(['anyone', 'invite_only']).optional().describe("Who can join; default invite_only"),
        }),
        handler: async ({ context, query }) => {
            if (!query.title?.trim()) {
                return error("Title is required.");
            }
            const _createNetworkGraphStart = Date.now();
            const _createNetworkTraceEmitter = requestContext.getStore()?.traceEmitter;
            _createNetworkTraceEmitter?.({ type: "graph_start", name: "index" });
            const result = await graphs.index.invoke({
                userId: context.userId,
                operationMode: 'create',
                createInput: {
                    title: query.title.trim(),
                    prompt: query.prompt?.trim() || undefined,
                    imageUrl: query.imageUrl || undefined,
                    joinPolicy: query.joinPolicy,
                },
            });
            const _createNetworkGraphMs = Date.now() - _createNetworkGraphStart;
            _createNetworkTraceEmitter?.({ type: "graph_end", name: "index", durationMs: _createNetworkGraphMs });
            if (result.mutationResult) {
                if (result.mutationResult.success) {
                    return success({
                        created: true,
                        networkId: result.mutationResult.networkId,
                        title: result.mutationResult.title,
                        message: result.mutationResult.message,
                        _graphTimings: [{ name: 'index', durationMs: _createNetworkGraphMs, agents: result.agentTimings ?? [] }],
                    });
                }
                return error(result.mutationResult.error || "Failed to create index.");
            }
            return error("Failed to create index.");
        },
    });
    const deleteNetwork = defineTool({
        name: "delete_network",
        description: "Deletes an index (owner only, must be sole member). When chat is index-scoped, can only delete that index.",
        querySchema: z.object({
            networkId: z.string().optional().describe("Index UUID from read_networks. Defaults to current index when scoped."),
        }),
        handler: async ({ context, query }) => {
            const networkId = query.networkId?.trim() || context.networkId;
            if (!networkId || !UUID_REGEX.test(networkId)) {
                return error("Valid networkId required.");
            }
            // Strict scope enforcement: when chat is index-scoped, only allow deleting that index
            if (context.networkId && networkId !== context.networkId) {
                return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only delete this community.`);
            }
            const _deleteNetworkGraphStart = Date.now();
            const _deleteNetworkTraceEmitter = requestContext.getStore()?.traceEmitter;
            _deleteNetworkTraceEmitter?.({ type: "graph_start", name: "index" });
            const result = await graphs.index.invoke({
                userId: context.userId,
                networkId,
                operationMode: 'delete',
            });
            const _deleteNetworkGraphMs = Date.now() - _deleteNetworkGraphStart;
            _deleteNetworkTraceEmitter?.({ type: "graph_end", name: "index", durationMs: _deleteNetworkGraphMs });
            if (result.mutationResult && !result.mutationResult.success) {
                return error(result.mutationResult.error || "Failed to delete index.");
            }
            return success({ message: "Index deleted.", _graphTimings: [{ name: 'index', durationMs: _deleteNetworkGraphMs, agents: result.agentTimings ?? [] }] });
        },
    });
    const createNetworkMembership = defineTool({
        name: "create_network_membership",
        description: "Adds a user as a member of an index. Omit userId to join the index yourself (self-join works only for public indexes with joinPolicy 'anyone'). For invite_only indexes only the owner can add members.",
        querySchema: z.object({
            userId: z.string().optional().describe("User ID to add as a member. Omit to join the index yourself."),
            networkId: z.string().optional().describe("Index UUID from read_networks. Defaults to current index when scoped."),
        }),
        handler: async ({ context, query }) => {
            const networkId = query.networkId?.trim() || context.networkId;
            const targetUserId = query.userId?.trim() || context.userId;
            if (!networkId || !UUID_REGEX.test(networkId)) {
                return error("Invalid index ID format. Use the exact UUID from read_networks.");
            }
            // Strict scope enforcement: when chat is index-scoped, only allow adding to that index
            if (context.networkId && networkId !== context.networkId) {
                return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only add members to this community.`);
            }
            const _createMembershipGraphStart = Date.now();
            const _createMembershipTraceEmitter = requestContext.getStore()?.traceEmitter;
            _createMembershipTraceEmitter?.({ type: "graph_start", name: "network_membership" });
            const result = await graphs.networkMembership.invoke({
                userId: context.userId,
                networkId,
                targetUserId,
                operationMode: 'create',
            });
            const _createMembershipGraphMs = Date.now() - _createMembershipGraphStart;
            _createMembershipTraceEmitter?.({ type: "graph_end", name: "network_membership", durationMs: _createMembershipGraphMs });
            if (result.mutationResult) {
                if (result.mutationResult.success) {
                    const alreadyMember = result.mutationResult.message?.includes("already");
                    return success({
                        created: !alreadyMember,
                        message: result.mutationResult.message,
                        _graphTimings: [{ name: 'network_membership', durationMs: _createMembershipGraphMs, agents: result.agentTimings ?? [] }],
                    });
                }
                return error(result.mutationResult.error || "Failed to add member.");
            }
            return error("Failed to add member.");
        },
    });
    const deleteNetworkMembership = defineTool({
        name: "delete_network_membership",
        description: "Removes a user from an index. Only the index owner can remove members. Cannot remove the owner themselves.",
        querySchema: z.object({
            userId: z.string().describe("User ID to remove from the index"),
            networkId: z.string().optional().describe("Index UUID. Defaults to current index when scoped."),
        }),
        handler: async ({ context, query }) => {
            const networkId = query.networkId?.trim() || context.networkId;
            const targetUserId = query.userId?.trim();
            if (!networkId || !UUID_REGEX.test(networkId)) {
                return error("Valid networkId required. Use the exact UUID from read_networks.");
            }
            if (!targetUserId) {
                return error("userId is required.");
            }
            // Strict scope enforcement: when chat is index-scoped, only allow that index
            if (context.networkId && networkId !== context.networkId) {
                return error(`This chat is scoped to ${context.indexName ?? 'this index'}. You can only manage members of this community.`);
            }
            const _deleteMembershipGraphStart = Date.now();
            const _deleteMembershipTraceEmitter = requestContext.getStore()?.traceEmitter;
            _deleteMembershipTraceEmitter?.({ type: "graph_start", name: "network_membership" });
            const result = await graphs.networkMembership.invoke({
                userId: context.userId,
                networkId,
                targetUserId,
                operationMode: 'delete',
            });
            const _deleteMembershipGraphMs = Date.now() - _deleteMembershipGraphStart;
            _deleteMembershipTraceEmitter?.({ type: "graph_end", name: "network_membership", durationMs: _deleteMembershipGraphMs });
            if (result.mutationResult) {
                if (result.mutationResult.success) {
                    return success({
                        removed: true,
                        message: result.mutationResult.message,
                        _graphTimings: [{ name: 'network_membership', durationMs: _deleteMembershipGraphMs, agents: result.agentTimings ?? [] }],
                    });
                }
                return error(result.mutationResult.error || "Failed to remove member.");
            }
            return error("Failed to remove member.");
        },
    });
    return [readIndexes, readIndexMemberships, updateNetwork, createNetwork, deleteNetwork, createNetworkMembership, deleteNetworkMembership];
}
//# sourceMappingURL=network.tools.js.map