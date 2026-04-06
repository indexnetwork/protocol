/** Input for importing a single contact. */
export interface ContactInput {
  name: string;
  email: string;
}

/** Result of adding a single contact. */
export interface ContactResult {
  userId: string;
  isNew: boolean;
  isGhost: boolean;
}

/** Result of importing contacts in bulk. */
export interface ContactImportResult {
  imported: number;
  skipped: number;
  newContacts: number;
  existingContacts: number;
  details: Array<{ email: string; userId: string; isNew: boolean }>;
}

/** Contact with user details, as returned by listContacts. */
export interface ContactEntry {
  userId: string;
  user: { id: string; name: string; email: string; avatar: string | null; isGhost: boolean };
}

/**
 * Contact management operations used by chat tools.
 * Consumers must provide a concrete implementation (e.g. backed by ContactService).
 */
export interface ContactServiceAdapter {
  importContacts(ownerId: string, contacts: ContactInput[]): Promise<ContactImportResult>;
  listContacts(ownerId: string): Promise<ContactEntry[]>;
  addContact(ownerId: string, email: string, options?: { name?: string; restore?: boolean }): Promise<ContactResult>;
  removeContact(ownerId: string, contactUserId: string): Promise<void>;
}
