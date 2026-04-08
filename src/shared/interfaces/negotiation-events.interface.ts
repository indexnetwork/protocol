/**
 * Interfaces for negotiation yield/resume support.
 * Used by the negotiation graph and tools to pause for external agents
 * and resume when they respond or when a timeout fires.
 */

/**
 * Checks whether a user has an active webhook subscription for a given event.
 * Used by the negotiation graph to decide whether to yield for an external agent
 * or run the built-in AI agent.
 */
export interface WebhookLookup {
  hasWebhookForEvent(userId: string, event: string): Promise<boolean>;
}

/**
 * Emits negotiation lifecycle events.
 * The host application wires this to trigger webhook delivery
 * and other side-effects (e.g. notifications).
 */
export interface NegotiationEventEmitter {
  /** Emitted when a negotiation yields and is waiting for an external response. */
  emitTurnReceived(data: {
    negotiationId: string;
    userId: string;
    turnNumber: number;
    counterpartyAction: string;
    counterpartyMessage?: string;
    deadline: string;
  }): void;

  /** Emitted when a negotiation reaches a terminal state (accept/reject/turn-cap). */
  emitCompleted(data: {
    negotiationId: string;
    userId: string;
    outcome: string;
    finalScore?: number;
    turnCount: number;
  }): void;
}

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
