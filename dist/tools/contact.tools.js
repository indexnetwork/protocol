import { z } from 'zod';
import { success, error } from './tool.helpers.js';
/**
 * Creates contact management tools for the chat agent.
 * Enables importing, listing, and managing the user's network.
 */
export function createContactTools(defineTool, deps) {
    const { contactService } = deps;
    const import_contacts = defineTool({
        name: 'import_contacts',
        description: `Import contacts into the user's network from any integration or manual input.

Each contact needs a name and email. Contacts without existing accounts become "ghost users"
that are enriched with public profile data and can be matched in opportunity discovery.

Returns import statistics including how many were imported, skipped, and how many new ghost users were created.`,
        querySchema: z.object({
            contacts: z.array(z.object({
                name: z.string().describe('Contact name'),
                email: z.string().describe('Contact email address'),
            })).describe('Array of contacts to import'),
        }),
        handler: async ({ context, query }) => {
            try {
                const result = await contactService.importContacts(context.userId, query.contacts);
                return success({
                    message: `Imported ${result.imported} contacts to your network.`,
                    imported: result.imported,
                    skipped: result.skipped,
                    newContacts: result.newContacts,
                    existingContacts: result.existingContacts,
                });
            }
            catch (err) {
                return error(`Failed to import contacts: ${err instanceof Error ? err.message : String(err)}`);
            }
        },
    });
    const list_contacts = defineTool({
        name: 'list_contacts',
        description: `List the user's network contacts. Returns all contacts with their details.
Each contact includes userId, name, email, avatar, and isGhost flag.
Ghost users (contacts without accounts) are marked with isGhost: true.
Use the userId field with read_user_profiles to look up a contact's full profile.`,
        querySchema: z.object({
            limit: z.number().optional().describe('Maximum number of contacts to return (default: all)'),
        }),
        handler: async ({ context, query }) => {
            try {
                let contacts = await contactService.listContacts(context.userId);
                if (query.limit && query.limit > 0) {
                    contacts = contacts.slice(0, query.limit);
                }
                return success({
                    count: contacts.length,
                    contacts: contacts.map(c => ({
                        userId: c.userId,
                        name: c.user.name,
                        email: c.user.email,
                        avatar: c.user.avatar,
                        isGhost: c.user.isGhost,
                    })),
                });
            }
            catch (err) {
                return error(`Failed to list contacts: ${err instanceof Error ? err.message : String(err)}`);
            }
        },
    });
    const add_contact = defineTool({
        name: 'add_contact',
        description: `Manually add a single contact to the user's network by email.
Use this when the user wants to add a specific person to their network.
If no account exists for that email, a ghost user is created and enriched with public data.`,
        querySchema: z.object({
            email: z.string().describe('Email address of the contact to add'),
            name: z.string().optional().describe('Name of the contact (optional, will use email prefix if not provided)'),
        }),
        handler: async ({ context, query }) => {
            try {
                const result = await contactService.addContact(context.userId, query.email, { name: query.name, restore: true });
                return success({
                    added: true,
                    message: result.isNew
                        ? `Added ${query.name || query.email} to your network. Their profile is being enriched.`
                        : `Added ${query.name || query.email} to your network.`,
                    userId: result.userId,
                    isNewGhost: result.isNew,
                });
            }
            catch (err) {
                return error(`Failed to add contact: ${err instanceof Error ? err.message : String(err)}`);
            }
        },
    });
    const remove_contact = defineTool({
        name: 'remove_contact',
        description: `Remove a contact from the user's network.
Use the contact's userId from list_contacts. This removes the contact relationship.`,
        querySchema: z.object({
            contactUserId: z.string().describe('The user ID of the contact to remove (from list_contacts)'),
        }),
        handler: async ({ context, query }) => {
            try {
                await contactService.removeContact(context.userId, query.contactUserId);
                return success({ removed: true, message: 'Contact removed from your network.' });
            }
            catch (err) {
                return error(`Failed to remove contact: ${err instanceof Error ? err.message : String(err)}`);
            }
        },
    });
    return [import_contacts, list_contacts, add_contact, remove_contact];
}
//# sourceMappingURL=contact.tools.js.map