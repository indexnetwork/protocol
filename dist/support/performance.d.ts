/**
 * Simple performance timing utilities for the protocol library.
 * Standalone — no external dependencies.
 */
type TimingCallback = (name: string, durationMs: number) => void;
/** Set a global callback for timing events (e.g. for aggregation/logging). */
export declare function setTimingCallback(cb: TimingCallback | undefined): void;
/**
 * Wraps an async function with timing measurement.
 * Reports duration to the global timing callback if set.
 */
export declare function timed<T>(name: string, fn: () => Promise<T>): Promise<T>;
/**
 * Method decorator that wraps an async method with timing measurement.
 * Uses `ClassName.methodName` as the timing label.
 */
export declare function Timed(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export {};
//# sourceMappingURL=performance.d.ts.map