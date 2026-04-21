/**
 * Resolves the authenticated MCP identity from an incoming request.
 * Injected into the MCP server factory so the protocol layer
 * stays independent of any specific auth implementation.
 */
export interface McpAuthResolver {
  /**
   * Extracts and validates the authenticated identity from the request.
   * @param request - The incoming HTTP request
   * @returns The authenticated user's UUID, optional agent UUID, and auth method.
   *   `isSessionAuth` is true for OAuth/JWT bearer sessions — the agent-registration
   *   gate in the MCP server is skipped for these callers.
   * @throws Error if authentication fails (no token, invalid token, etc.)
   */
  resolveIdentity(request: Request): Promise<{ userId: string; agentId?: string; isSessionAuth?: boolean }>;

  /**
   * @deprecated Use resolveIdentity instead.
   */
  resolveUserId(request: Request): Promise<string>;
}
