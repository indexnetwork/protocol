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
export function shouldEnrichGhostDisplayNameFromParallel(user, enrichedName) {
    if (!user.isGhost)
        return false;
    const trimmed = enrichedName.trim();
    if (!trimmed || trimmed.includes("@"))
        return false;
    const current = user.name.trim();
    if (current === trimmed.toLowerCase())
        return false;
    return true;
}
//# sourceMappingURL=profile.enrichment-display-name.js.map