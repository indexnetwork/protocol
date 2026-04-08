import { z } from 'zod';
import type { DefineTool, ToolDeps } from '../shared/agent/tool.helpers.js';
import { success, error } from '../shared/agent/tool.helpers.js';

/**
 * Creates webhook management tools for the chat agent.
 * Enables registering, listing, deleting, and testing webhook subscriptions.
 */
export function createWebhookTools(defineTool: DefineTool, deps: ToolDeps) {
  const { webhook } = deps;

  const register_webhook = defineTool({
    name: 'register_webhook',
    description:
      'Register a webhook URL to receive push notifications when events occur. ' +
      'The webhook will receive HTTP POST requests with a JSON payload signed with HMAC-SHA256. ' +
      'Use list_webhook_events to discover available event names before registering.',
    querySchema: z.object({
      url: z.string().describe('The HTTPS URL to receive webhook POST requests'),
      events: z.array(z.string()).describe('Array of event names to subscribe to (e.g. ["opportunity.created"])'),
      description: z.string().optional().describe('Optional human-readable description of this webhook'),
    }),
    handler: async ({ context, query }) => {
      if (!webhook) {
        return error('Webhook functionality is not available');
      }
      try {
        const result = await webhook.create(context.userId, query.url, query.events, query.description);
        return success({
          message: 'Webhook registered successfully. Save the secret for verifying signatures.',
          id: result.id,
          secret: result.secret,
        });
      } catch (err) {
        return error(`Failed to register webhook: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const list_webhooks = defineTool({
    name: 'list_webhooks',
    description:
      "List all webhooks registered by the authenticated user. " +
      "Secrets are masked for security (only last 4 characters shown).",
    querySchema: z.object({}),
    handler: async ({ context }) => {
      if (!webhook) {
        return error('Webhook functionality is not available');
      }
      try {
        const webhooks = await webhook.list(context.userId);
        return success({
          count: webhooks.length,
          webhooks: webhooks.map(w => ({
            id: w.id,
            url: w.url,
            events: w.events,
            active: w.active,
            description: w.description,
            failureCount: w.failureCount,
            createdAt: w.createdAt,
          })),
        });
      } catch (err) {
        return error(`Failed to list webhooks: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const delete_webhook = defineTool({
    name: 'delete_webhook',
    description: 'Delete a webhook registration by its ID. Only the owner can delete their webhooks.',
    querySchema: z.object({
      webhookId: z.string().describe('The ID of the webhook to delete'),
    }),
    handler: async ({ context, query }) => {
      if (!webhook) {
        return error('Webhook functionality is not available');
      }
      try {
        await webhook.delete(context.userId, query.webhookId);
        return success({ message: 'Webhook deleted successfully' });
      } catch (err) {
        return error(`Failed to delete webhook: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const test_webhook = defineTool({
    name: 'test_webhook',
    description:
      'Send a test payload to a webhook URL to verify it is working correctly. ' +
      'The test delivery is enqueued and processed asynchronously.',
    querySchema: z.object({
      webhookId: z.string().describe('The ID of the webhook to test'),
    }),
    handler: async ({ context, query }) => {
      if (!webhook) {
        return error('Webhook functionality is not available');
      }
      try {
        const result = await webhook.test(context.userId, query.webhookId);
        return success({
          message: 'Test webhook delivery enqueued. Check your endpoint for the test payload.',
          success: result.success,
        });
      } catch (err) {
        return error(`Failed to test webhook: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const list_webhook_events = defineTool({
    name: 'list_webhook_events',
    description:
      'List all available webhook event names that can be subscribed to. ' +
      'Use these event names when registering a webhook with register_webhook.',
    querySchema: z.object({}),
    handler: async () => {
      if (!webhook) {
        return error('Webhook functionality is not available');
      }
      try {
        const events = webhook.listEvents();
        return success({ events });
      } catch (err) {
        return error(`Failed to list webhook events: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  return [register_webhook, list_webhooks, delete_webhook, test_webhook, list_webhook_events];
}
