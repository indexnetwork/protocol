/**
 * Protocol-layer logging: call-scoped inputs, outputs, and context for debugging.
 * Use protocolLogger('ComponentName') for the logger, then wrap calls with
 * withCallLogging. All protocol code should log inputs at call start and
 * outputs (or summary) + duration at end.
 */
import type { LoggerWithSource } from "./log";
export type { LoggerWithSource };
/** Create a protocol logger for a given source (e.g. "ChatTools", "DiscoverNodes"). */
export declare function protocolLogger(source: string): LoggerWithSource;
export interface CallLogOptions {
    /** Log full output on success (default: true). Set false for very large payloads. */
    logOutput?: boolean;
    /** Extra context to include in both start and end (e.g. userId, indexId). */
    context?: Record<string, unknown>;
}
/**
 * Wraps an async call with consistent logging: inputs at start, outputs + duration at end,
 * error + duration on failure. All payloads are sanitized (embeddings redacted).
 */
export declare function withCallLogging<T>(logger: LoggerWithSource, callName: string, inputs: Record<string, unknown>, fn: () => Promise<T>, options?: CallLogOptions): Promise<T>;
//# sourceMappingURL=protocol.logger.d.ts.map