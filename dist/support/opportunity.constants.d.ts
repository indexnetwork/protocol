/** Max chars for main text in minimal opportunity cards (chat tool payload). Full text shown so cards are not truncated. */
export declare const MINIMAL_MAIN_TEXT_MAX_CHARS = 2000;
/** Hardcoded button labels for opportunity cards (not LLM-generated). */
export declare const PRIMARY_ACTION_LABEL_INTRODUCER = "Good match";
export declare const PRIMARY_ACTION_LABEL_DEFAULT = "Start Chat";
export declare const SECONDARY_ACTION_LABEL = "Skip";
/** Returns the primary action label based on the viewer's role. */
export declare function getPrimaryActionLabel(viewerRole: string): string;
//# sourceMappingURL=opportunity.constants.d.ts.map