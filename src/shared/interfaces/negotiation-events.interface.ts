/**
 * Interfaces for negotiation yield/resume support.
 * Used by the negotiation graph and dispatcher to manage timeouts
 * for external agents that haven't responded yet.
 */

/**
 * Manages delayed timeout jobs for negotiations waiting on external agents.
 * When a negotiation yields, a timeout is enqueued. If the external agent
 * responds before the timeout, the job is cancelled.
 */
export interface NegotiationTimeoutQueue {
  /**
   * Enqueue a delayed timeout job.
   * @param negotiationId - The negotiation task ID
   * @param turnNumber - Current turn number (used to detect stale jobs)
   * @param delayMs - Delay in milliseconds before the timeout fires
   * @returns The BullMQ job ID for cancellation
   */
  enqueueTimeout(negotiationId: string, turnNumber: number, delayMs: number): Promise<string>;

  /**
   * Cancel a pending timeout job for a negotiation.
   * @param negotiationId - The negotiation task ID
   */
  cancelTimeout(negotiationId: string): Promise<void>;
}
