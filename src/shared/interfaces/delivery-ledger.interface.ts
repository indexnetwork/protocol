/**
 * Delivery ledger interface for committing opportunity delivery rows.
 * Implementations live in src/adapters (e.g. database adapter).
 */

export interface DeliveryLedger {
  /**
   * Write a committed delivery row for an opportunity.
   * Returns 'confirmed' on first delivery, 'already_delivered' if previously committed.
   *
   * @param trigger - Which dispatch path produced this delivery: 'ambient' for
   *                  real-time critical alerts (≤3/day target), 'digest' for the
   *                  daily sweep of everything ambient passed on.
   */
  confirmOpportunityDelivery(params: {
    opportunityId: string;
    userId: string;
    agentId: string | null;
    trigger: 'ambient' | 'digest';
  }): Promise<'confirmed' | 'already_delivered'>;
}
