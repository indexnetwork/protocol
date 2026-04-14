export interface ChatSessionSummary {
  sessionId: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: Array<{ role: string; content: string; createdAt: Date }>;
}

export interface ChatSessionReader {
  getSessionMessages(
    sessionId: string,
    limit?: number,
  ): Promise<Array<{ role: string; content: string }>>;
  listSessions(userId: string, limit?: number): Promise<ChatSessionSummary[]>;
  getSession(
    userId: string,
    sessionId: string,
    messageLimit?: number,
  ): Promise<ChatSessionDetail | null>;
}
