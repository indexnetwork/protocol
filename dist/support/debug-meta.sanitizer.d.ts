/**
 * Sanitizes objects for inclusion in chat debug meta.
 * Strips embeddings, truncates long strings, and handles circular refs.
 */
/** Exported for tests that assert on circular-ref placeholder. */
export declare const SANITIZATION_ERROR_PLACEHOLDER = "[sanitization error]";
/**
 * Sanitizes an object for safe inclusion in debug meta.
 * - Replaces embedding/vector keys and long number arrays with placeholders.
 * - Truncates strings over maxStringLength.
 * - On circular reference or error, returns a placeholder string.
 *
 * @param obj - Value to sanitize (object, array, or primitive)
 * @param maxStringLength - Max string length before truncation (default 2048)
 * @returns Sanitized copy or "[sanitization error]" on failure
 */
export declare function sanitizeForDebugMeta(obj: unknown, maxStringLength?: number): unknown;
//# sourceMappingURL=debug-meta.sanitizer.d.ts.map