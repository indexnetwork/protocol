/**
 * Webhook adapter interface for the protocol layer.
 * Implemented by the host application and injected via ProtocolDeps.
 */
export interface WebhookAdapter {
  create(userId: string, url: string, events: string[], description?: string): Promise<{ id: string; secret: string }>;
  list(userId: string): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    active: boolean;
    description?: string | null;
    failureCount: number;
    createdAt: Date;
  }>>;
  delete(userId: string, webhookId: string): Promise<void>;
  test(userId: string, webhookId: string): Promise<{ success: boolean }>;
  listEvents(): string[];
}
