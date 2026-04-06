/**
 * Queue types for protocol layer.
 */

/**
 * Operations the Intent Graph needs to enqueue follow-up work (e.g. HyDE generation/deletion).
 * Implemented by the intent queue; protocol layer depends only on this interface.
 */
export interface IntentGraphQueue {
  addGenerateHydeJob(data: { intentId: string; userId: string }): Promise<unknown>;
  addDeleteHydeJob(data: { intentId: string }): Promise<unknown>;
}
