/**
 * Simple performance timing utilities for the protocol library.
 * Standalone — no external dependencies.
 */
let onTiming;
/** Set a global callback for timing events (e.g. for aggregation/logging). */
export function setTimingCallback(cb) {
    onTiming = cb;
}
/**
 * Wraps an async function with timing measurement.
 * Reports duration to the global timing callback if set.
 */
export async function timed(name, fn) {
    const start = performance.now();
    try {
        const result = await fn();
        onTiming?.(name, performance.now() - start);
        return result;
    }
    catch (err) {
        onTiming?.(name, performance.now() - start);
        throw err;
    }
}
/**
 * Method decorator that wraps an async method with timing measurement.
 * Uses `ClassName.methodName` as the timing label.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Timed() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (_target, propertyKey, descriptor) {
        const original = descriptor.value;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptor.value = function (...args) {
            const className = this.constructor.name;
            const name = `${className}.${propertyKey}`;
            return timed(name, () => original.apply(this, args));
        };
    };
}
//# sourceMappingURL=performance.js.map