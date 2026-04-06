/**
 * Protocol-layer logging: call-scoped inputs, outputs, and context for debugging.
 * Use protocolLogger('ComponentName') for the logger, then wrap calls with
 * withCallLogging. All protocol code should log inputs at call start and
 * outputs (or summary) + duration at end.
 */
import { log, sanitizeForLog } from "./log.js";
/** Create a protocol logger for a given source (e.g. "ChatTools", "DiscoverNodes"). */
export function protocolLogger(source) {
    return log.protocol.from(source);
}
/**
 * Wraps an async call with consistent logging: inputs at start, outputs + duration at end,
 * error + duration on failure. All payloads are sanitized (embeddings redacted).
 */
export async function withCallLogging(logger, callName, inputs, fn, options = {}) {
    const { logOutput = true, context = {} } = options;
    const start = Date.now();
    const sanitizedInputs = sanitizeForLog(inputs);
    logger.verbose(`[Call] ${callName} start`, { inputs: sanitizedInputs, ...context });
    try {
        const result = await fn();
        const durationMs = Date.now() - start;
        const outMeta = {
            durationMs,
            ...context,
        };
        if (logOutput) {
            outMeta.output = sanitizeForLog(result);
        }
        logger.verbose(`[Call] ${callName} end`, outMeta);
        return result;
    }
    catch (err) {
        const durationMs = Date.now() - start;
        logger.error(`[Call] ${callName} failed`, {
            error: err,
            durationMs,
            ...context,
        });
        throw err;
    }
}
//# sourceMappingURL=protocol.logger.js.map