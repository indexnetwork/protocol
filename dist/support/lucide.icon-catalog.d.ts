/**
 * Lucide icon catalog for home view section headings.
 * Icon names are kebab-case for use with lucide-react DynamicIcon (name prop).
 * Used by home graph LLM to pick an icon per dynamic section.
 */
/** Default icon when LLM returns invalid or missing icon name. */
export declare const DEFAULT_HOME_SECTION_ICON = "hourglass";
/** Allowed icon names for home sections (subset of Lucide icons). */
export declare const HOME_SECTION_ICON_NAMES: readonly string[];
/**
 * Normalize icon name: lowercase, strip spaces (allow kebab-case from LLM).
 */
export declare function normalizeIconName(name: string | undefined | null): string;
/**
 * Validate and return an allowed icon name; fallback to default if unknown.
 */
export declare function resolveHomeSectionIcon(name: string | undefined | null): string;
/**
 * Return a formatted list of icon names for LLM prompts (comma-separated, truncated if needed).
 */
export declare function getIconNamesForPrompt(maxItems?: number): string;
//# sourceMappingURL=lucide.icon-catalog.d.ts.map