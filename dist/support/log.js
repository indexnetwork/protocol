/**
 * Protocol-internal logging module.
 *
 * Self-contained — no imports from outside the protocol library.
 * Ships with a minimal console-based default. The host application can
 * call `setLoggerFactory()` at startup to wire in a richer implementation
 * (e.g. the project-wide `log` utility with ANSI colors, context filtering,
 * and embedding redaction).
 */
// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════
function defaultCreateLogger(_context, source) {
    const prefix = `[${source}]`;
    return {
        verbose: (msg, meta) => console.debug(prefix, msg, ...(meta ? [meta] : [])),
        debug: (msg, meta) => console.debug(prefix, msg, ...(meta ? [meta] : [])),
        info: (msg, meta) => console.info(prefix, msg, ...(meta ? [meta] : [])),
        warn: (msg, meta) => console.warn(prefix, msg, ...(meta ? [meta] : [])),
        error: (msg, meta) => console.error(prefix, msg, ...(meta ? [meta] : [])),
    };
}
function defaultSanitize(value) {
    return value;
}
let createLoggerFn = defaultCreateLogger;
let sanitizeFn = defaultSanitize;
/**
 * Override the logger factory used by all protocol-internal logging.
 * Call this at application startup to wire in your project's logger.
 *
 * @example
 * ```ts
 * import { log, sanitizeForLog } from "./lib/log.js";
 * import { setLoggerFactory } from "./lib/protocol/support/log.js";
 *
 * setLoggerFactory(
 *   (context, source) => log.withContext(context as LogContext, source),
 *   sanitizeForLog,
 * );
 * ```
 */
export function setLoggerFactory(factory, sanitize) {
    createLoggerFn = factory;
    if (sanitize)
        sanitizeFn = sanitize;
}
// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════
/** Sanitize an object for logging (redacts embeddings when host logger is wired in). */
export function sanitizeForLog(value) {
    return sanitizeFn(value);
}
function lazyContext(context) {
    return {
        from: (source) => createLoggerFn(context, source),
    };
}
/**
 * Logger with pre-bound context. Usage:
 * ```ts
 * const logger = log.protocol.from('MyComponent');
 * logger.info('started');
 * ```
 *
 * Logger creation is deferred to call time so `setLoggerFactory()` can be
 * called at app startup and all subsequent `.from()` calls use the new factory.
 */
export const log = {
    protocol: lazyContext('protocol'),
    lib: lazyContext('lib'),
    agent: lazyContext('agent'),
    graph: lazyContext('graph'),
};
//# sourceMappingURL=log.js.map