/**
 * Lucide icon catalog for home view section headings.
 * Icon names are kebab-case for use with lucide-react DynamicIcon (name prop).
 * Used by home graph LLM to pick an icon per dynamic section.
 */
/** Default icon when LLM returns invalid or missing icon name. */
export const DEFAULT_HOME_SECTION_ICON = 'hourglass';
/** Allowed icon names for home sections (subset of Lucide icons). */
export const HOME_SECTION_ICON_NAMES = [
    'hourglass',
    'telescope',
    'route',
    'bot',
    'user',
    'users',
    'message-circle',
    'sparkles',
    'handshake',
    'target',
    'zap',
    'lightbulb',
    'compass',
    'globe',
    'heart',
    'star',
    'trending-up',
    'briefcase',
    'rocket',
    'search',
    'filter',
    'list',
    'layout-grid',
    'inbox',
    'send',
    'mail',
    'calendar',
    'clock',
    'timer',
    'flag',
    'bookmark',
    'link',
    'share-2',
    'thumbs-up',
    'award',
    'graduation-cap',
    'building-2',
    'network',
    'git-branch',
    'code',
    'palette',
    'pen-tool',
    'folder',
    'file-text',
    'bar-chart',
    'pie-chart',
    'activity',
    'arrow-right',
    'chevron-right',
    'circle-dot',
    'circle-user',
    'user-plus',
    'user-check',
    'users-round',
    'hand',
    'hand-metal',
    'megaphone',
    'bell',
    'eye',
    'eye-off',
    'lock',
    'unlock',
    'shield',
    'shield-check',
];
const ALLOWED_SET = new Set(HOME_SECTION_ICON_NAMES);
/**
 * Normalize icon name: lowercase, strip spaces (allow kebab-case from LLM).
 */
export function normalizeIconName(name) {
    if (name == null || typeof name !== 'string')
        return DEFAULT_HOME_SECTION_ICON;
    const normalized = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized)
        return DEFAULT_HOME_SECTION_ICON;
    return normalized;
}
/**
 * Validate and return an allowed icon name; fallback to default if unknown.
 */
export function resolveHomeSectionIcon(name) {
    const normalized = normalizeIconName(name);
    return ALLOWED_SET.has(normalized) ? normalized : DEFAULT_HOME_SECTION_ICON;
}
/**
 * Return a formatted list of icon names for LLM prompts (comma-separated, truncated if needed).
 */
export function getIconNamesForPrompt(maxItems = 60) {
    const list = HOME_SECTION_ICON_NAMES.slice(0, maxItems);
    return list.join(', ');
}
//# sourceMappingURL=lucide.icon-catalog.js.map