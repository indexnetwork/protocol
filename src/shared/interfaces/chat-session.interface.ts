/**
 * Minimal interface for reading chat session messages.
 * Used by ChatGraphFactory to load conversation history.
 */
export interface ChatSessionReader {
  getSessionMessages(sessionId: string, limit?: number): Promise<Array<{
    role: string;
    content: string;
  }>>;
}
