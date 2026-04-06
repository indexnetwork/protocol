/**
 * Decides whether to set {@link users.name} from Parallel `enrichment.identity.name` for ghost users.
 * @remarks Real users (Google login, etc.) are never touched. Ghost users always get
 * their name enriched when Parallel returns a non-empty name that isn't an email.
 */
/**
 * @param user - Current user row (must include `email`, `name`, `isGhost`)
 * @param enrichedName - `enrichment.identity.name` from Parallel (may be untrimmed)
 * @returns True if `users.name` should be updated to the enriched full name
 */
export declare function shouldEnrichGhostDisplayNameFromParallel(user: {
    name: string;
    email: string;
    isGhost?: boolean | null;
}, enrichedName: string): boolean;
//# sourceMappingURL=profile.enrichment-display-name.d.ts.map