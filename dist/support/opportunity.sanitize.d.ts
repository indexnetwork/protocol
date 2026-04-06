/**
 * Strips UUID patterns from user-facing text to prevent internal ID leaks.
 */
export declare function stripUuids(text: string): string;
/**
 * Strips introducer mentions from opportunity summary text.
 * Removes patterns like:
 * - "[Introducer] introduced you to [Counterpart]"
 * - "[Introducer] thinks you should meet [Counterpart]"
 * - "[Introducer] connected you to [Counterpart]"
 * - "[Introducer] suggested you meet [Counterpart]"
 *
 * @param text - The text to clean (personalizedSummary)
 * @param introducerName - Full name of the introducer to strip
 * @returns Text with introducer mentions removed, counterpart preserved
 */
export declare function stripIntroducerMentions(text: string, introducerName: string | undefined): string;
//# sourceMappingURL=opportunity.sanitize.d.ts.map