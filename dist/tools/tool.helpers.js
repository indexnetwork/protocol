/**
 * Thrown when a requested chat scope is invalid for the authenticated user.
 * Controllers can map this to an HTTP status code.
 */
export class ChatContextAccessError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "ChatContextAccessError";
    }
}
/**
 * Resolve the canonical context used by chat tools and system prompt.
 * This preloads user identity, profile, index memberships, and scoped index role.
 */
export async function resolveChatContext(params) {
    const { database, userId, networkId, sessionId } = params;
    const [user, rawProfile, userNetworks] = await Promise.all([
        database.getUser(userId),
        database.getProfile(userId),
        database.getNetworkMemberships(userId),
    ]);
    // Omit embedding from profile so resolved context stays lean (embedding is for search only).
    let userProfile = null;
    if (rawProfile) {
        const { embedding: _omit, ...rest } = rawProfile;
        userProfile = rest;
    }
    if (!user) {
        throw new ChatContextAccessError("User not found", 404, "USER_NOT_FOUND");
    }
    let scopedIndex = undefined;
    let scopedMembershipRole = undefined;
    let isOwner = false;
    let indexName;
    if (networkId) {
        const [index, isMember, owner] = await Promise.all([
            database.getNetwork(networkId),
            database.isNetworkMember(networkId, userId),
            database.isIndexOwner(networkId, userId),
        ]);
        if (!index) {
            throw new ChatContextAccessError("Index not found", 404, "INDEX_NOT_FOUND");
        }
        if (!isMember) {
            throw new ChatContextAccessError("You are not a member of this index", 403, "INDEX_MEMBERSHIP_REQUIRED");
        }
        let membership = userNetworks.find((m) => m.networkId === index.id);
        if (membership === undefined) {
            membership = (await database.getNetworkMembership(index.id, userId)) ?? undefined;
        }
        scopedIndex = {
            id: index.id,
            title: index.title,
            prompt: membership?.indexPrompt ?? null,
        };
        isOwner = owner;
        indexName = index.title;
        scopedMembershipRole = owner ? "owner" : "member";
    }
    const userName = user.name ?? "Unknown";
    const userEmail = user.email ?? "";
    const hasName = !!user.name?.trim();
    return {
        userId,
        userName,
        userEmail,
        networkId,
        indexName,
        isOwner,
        user,
        userProfile,
        userNetworks,
        scopedIndex,
        scopedMembershipRole,
        isOnboarding: !(user.onboarding?.completedAt),
        hasName,
        ...(sessionId !== undefined ? { sessionId } : {}),
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// TOOL RESULT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
export function success(data) {
    return JSON.stringify({ success: true, data });
}
export function error(message, debugSteps) {
    return JSON.stringify({
        success: false,
        error: message,
        ...(debugSteps?.length ? { debugSteps } : {}),
    });
}
/** Return needsClarification for missing required fields. */
export function needsClarification(params) {
    return JSON.stringify({
        success: false,
        needsClarification: true,
        ...params,
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
/** Matches http/https URLs in text; captures full URL. */
const URL_IN_TEXT_REGEX = /https?:\/\/[^\s"'<>)\]]+/gi;
/**
 * Matches bare domain URLs without protocol (e.g. github.com/foo, www.example.com).
 * Requires at least a SLD.TLD pattern followed by optional path.
 * Negative lookbehind ensures we don't double-match URLs already caught by URL_IN_TEXT_REGEX.
 */
const BARE_URL_REGEX = /(?<!\w:\/\/)(?<![/\w])(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|org|net|io|dev|co|ai|app|xyz|me|info|gg|so|sh|cc|ly|fm|tv|to|tech|design|network|world|edu|gov|mil|int|us|uk|eu|de|fr|ca|au|jp|cn|in|br|nl|se|no|fi|dk|ch|at|be|it|es|pt|pl|cz|ru|kr|tw|hk|sg|nz|za|mx|ar|cl|id|ph|th|vn|my|ie)(?:\/[^\s"'<>)\]]*)?/gi;
/** UUID v4 format: 8-4-4-4-12 hex chars (e.g. c2505011-2e45-426e-81dd-b9abb9b72023) */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Resolves an array of network IDs to their display titles.
 * Skips any IDs that don't resolve (deleted or invalid networks).
 */
export async function resolveIndexNames(database, networkIds) {
    if (networkIds.length === 0)
        return [];
    const results = await Promise.all(networkIds.map(id => database.getNetwork(id)));
    return results.filter(Boolean).map(idx => idx.title);
}
/**
 * Normalize a URL string: if it lacks a protocol, prepend "https://".
 * Returns the normalized URL or null if the result is not a valid URL.
 */
export function normalizeUrl(raw) {
    let url = raw.replace(/[.,;:!?)]+$/, "").trim();
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }
    try {
        new URL(url);
        return url;
    }
    catch {
        return null;
    }
}
/**
 * Extract unique, valid URLs from a string (e.g. user message or details).
 * Handles both full URLs (https://...) and bare domains (github.com/...).
 */
export function extractUrls(text) {
    if (!text || typeof text !== "string")
        return [];
    const seen = new Set();
    const out = [];
    // Pass 1: full protocol URLs
    const fullMatches = text.match(URL_IN_TEXT_REGEX) ?? [];
    for (const raw of fullMatches) {
        const url = normalizeUrl(raw);
        if (url && !seen.has(url)) {
            seen.add(url);
            out.push(url);
        }
    }
    // Pass 2: bare domain URLs (e.g. github.com/foo)
    const bareMatches = text.match(BARE_URL_REGEX) ?? [];
    for (const raw of bareMatches) {
        const url = normalizeUrl(raw);
        if (url && !seen.has(url)) {
            seen.add(url);
            out.push(url);
        }
    }
    return out;
}
//# sourceMappingURL=tool.helpers.js.map