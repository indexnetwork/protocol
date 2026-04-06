/**
 * Protocol-internal logging module.
 *
 * Self-contained — no imports from outside the protocol library.
 * Ships with a minimal console-based default. The host application can
 * call `setLoggerFactory()` at startup to wire in a richer implementation
 * (e.g. the project-wide `log` utility with ANSI colors, context filtering,
 * and embedding redaction).
 */
type LogMethod = (message: string, meta?: Record<string, unknown>) => void;
export type LoggerWithSource = {
    verbose: LogMethod;
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
};
export type LogContext = 'protocol' | 'lib' | 'agent' | 'graph';
export type LogLevel = 'verbose' | 'debug' | 'info' | 'warn' | 'error';
type LoggerFactory = (context: string, source: string) => LoggerWithSource;
type SanitizeFn = (value: unknown) => unknown;
/**
 * Override the logger factory used by all protocol-internal logging.
 * Call this at application startup to wire in your project's logger.
 *
 * @example
 * ```ts
 * import { log, sanitizeForLog } from "./lib/log";
 * import { setLoggerFactory } from "./lib/protocol/support/log";
 *
 * setLoggerFactory(
 *   (context, source) => log.withContext(context as LogContext, source),
 *   sanitizeForLog,
 * );
 * ```
 */
export declare function setLoggerFactory(factory: LoggerFactory, sanitize?: SanitizeFn): void;
/** Sanitize an object for logging (redacts embeddings when host logger is wired in). */
export declare function sanitizeForLog(value: unknown): unknown;
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
export declare const log: {
    protocol: {
        from: (source: string) => LoggerWithSource;
    };
    lib: {
        from: (source: string) => LoggerWithSource;
    };
    agent: {
        from: (source: string) => LoggerWithSource;
    };
    graph: {
        from: (source: string) => LoggerWithSource;
    };
};
export {};
//# sourceMappingURL=log.d.ts.map