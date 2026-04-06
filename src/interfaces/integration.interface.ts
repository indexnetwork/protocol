import type { StructuredToolInterface } from '@langchain/core/tools';

/**
 * Session for interacting with an external integration platform.
 * Provides access to tools, OAuth authorization, and toolkit discovery.
 */
export interface IntegrationSession {
  tools(): Promise<StructuredToolInterface[]>;
  authorize(toolkit: string): Promise<{ redirectUrl: string; waitForConnection(timeout?: number): Promise<unknown> }>;
  toolkits(): Promise<{ items: Array<{ slug: string; name: string; connection?: { connectedAccount?: { id: string } } }> }>;
}

/** Options for creating an integration session. */
export interface IntegrationSessionOptions {
  manageConnections?: boolean | { callbackUrl?: string };
  /** Toolkit slug → auth config ID mapping to pin existing auth configs. */
  authConfigs?: Record<string, string>;
}

/** Response from executing a tool action on the integration platform. */
export interface ToolActionResponse {
  successful: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/** A connected integration account for a user. */
export interface IntegrationConnection {
  id: string;
  toolkit: string;
  status: string;
  createdAt: string;
}

/**
 * Adapter for external integration platforms (OAuth sessions, tool execution).
 *
 * @remarks
 * Implementations wrap a specific platform SDK (e.g. Composio) and expose
 * a platform-agnostic API for creating user sessions and executing tool actions.
 */
export interface IntegrationAdapter {
  /**
   * Create an authenticated session for a user.
   * @param userId - User ID for the session
   * @param options - Session configuration (e.g. connection management)
   * @returns A session object for interacting with the platform
   */
  createSession(userId: string, options?: IntegrationSessionOptions): Promise<IntegrationSession>;

  /**
   * Execute a named tool action on behalf of a user.
   * @param slug - Tool action identifier (e.g. 'GMAIL_GET_CONTACTS')
   * @param userId - User to execute the action for
   * @param args - Arguments to pass to the tool action
   * @returns The tool execution response
   */
  executeToolAction(slug: string, userId: string, args: Record<string, unknown>): Promise<ToolActionResponse>;

  /**
   * List all connected accounts for a user.
   * @param userId - User to list connections for
   * @returns Array of connected integration accounts
   */
  listConnections(userId: string): Promise<IntegrationConnection[]>;

  /**
   * Get an OAuth authorization URL to connect a toolkit.
   * @param userId - User to authorize
   * @param toolkit - Toolkit slug (e.g. 'gmail')
   * @param callbackUrl - URL to redirect to after OAuth
   * @returns The redirect URL for OAuth
   */
  getAuthUrl(userId: string, toolkit: string, callbackUrl?: string): Promise<{ redirectUrl: string }>;

  /**
   * Disconnect (delete) a connected account.
   * @param connectedAccountId - The connected account ID to remove
   */
  disconnect(connectedAccountId: string): Promise<{ success: boolean }>;
}
