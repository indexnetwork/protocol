import { z } from 'zod';
import { success, error } from './tool.helpers';
import { requestContext } from "../support/request-context";
import { log } from '../support/log';
const logger = log.lib.from('integration.tools');
/**
 * Creates integration tools for the chat agent.
 *
 * Exposes `import_gmail_contacts` which authenticates via the integration adapter,
 * fetches all Gmail contacts (paginated), and imports them as ghost users into the network.
 *
 * @param defineTool - Tool definition helper injected by the tool registry.
 * @param deps - Shared tool dependencies including the integration adapter.
 * @returns An array of tool definitions to register with the chat agent.
 */
export function createIntegrationTools(defineTool, deps) {
    const { integration, integrationImporter } = deps;
    const import_gmail_contacts = defineTool({
        name: 'import_gmail_contacts',
        description: `Import contacts from the user's Gmail/Google account into their network.

If the user hasn't connected their Gmail account yet, returns an auth URL they need to visit first.

After successful import, contacts are added to the user's network as ghost users
(enriched with public profile data) and can be matched in opportunity discovery.

Returns import statistics or an auth URL if authentication is needed.`,
        querySchema: z.object({}),
        handler: async ({ context }) => {
            try {
                const session = await integration.createSession(context.userId);
                const toolkits = await session.toolkits();
                const gmailToolkit = toolkits.items.find(t => t.slug === 'gmail');
                const isConnected = !!gmailToolkit?.connection?.connectedAccount?.id;
                if (!isConnected) {
                    logger.info('Gmail not connected, returning auth URL', { userId: context.userId });
                    const originUrl = requestContext.getStore()?.originUrl;
                    const callbackUrl = originUrl ? `${originUrl}/oauth/callback` : undefined;
                    const authRequest = await session.authorize('gmail', callbackUrl ? { callbackUrl } : undefined);
                    return success({
                        requiresAuth: true,
                        message: 'Please connect your Gmail account to import contacts.',
                        authUrl: authRequest.redirectUrl,
                    });
                }
                const importResult = await integrationImporter.importContacts(context.userId, 'gmail');
                logger.info('Gmail contacts imported', {
                    userId: context.userId,
                    imported: importResult.imported,
                    skipped: importResult.skipped,
                    newContacts: importResult.newContacts,
                    existingContacts: importResult.existingContacts,
                });
                return success({
                    message: importResult.newContacts > 0
                        ? `Imported ${importResult.imported} contacts from Gmail. ${importResult.newContacts} new, ${importResult.existingContacts} already in your network.`
                        : importResult.imported > 0
                            ? `All ${importResult.imported} contacts from Gmail were already in your network. No new contacts added.`
                            : 'No contacts with valid name and email found in your Gmail account.',
                    imported: importResult.imported,
                    newContacts: importResult.newContacts,
                    existingContacts: importResult.existingContacts,
                    skipped: importResult.skipped,
                });
            }
            catch (err) {
                logger.error('import_gmail_contacts failed', {
                    userId: context.userId,
                    error: err instanceof Error ? err.message : String(err),
                });
                return error(`Failed to import Gmail contacts: ${err instanceof Error ? err.message : String(err)}`);
            }
        },
    });
    return [import_gmail_contacts];
}
//# sourceMappingURL=integration.tools.js.map