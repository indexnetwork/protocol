/**
 * Resolves the authenticated MCP identity from an incoming request.
 * Injected into the MCP server factory so the protocol layer
 * stays independent of any specific auth implementation.
 */
export interface McpAuthResolver {
  /**
   * Extracts and validates the authenticated identity from the request.
   * @param request - The incoming HTTP request
   * @returns The authenticated user's UUID, optional agent UUID, auth method,
   *   and `networkScopeId` if the caller's API key is bound to a network-scoped
   *   agent. When set, the MCP server clamps `indexScope` to that single network
   *   plus the user's personal index — every downstream tool then operates
   *   against that clamped scope.
   *   `isSessionAuth` is true for OAuth/JWT bearer sessions — the agent-registration
   *   gate in the MCP server is skipped for these callers.
   * @throws Error if authentication fails (no token, invalid token, etc.)
   */
  resolveIdentity(request: Request): Promise<{
    userId: string;
    agentId?: string;
    isSessionAuth?: boolean;
    networkScopeId?: string | null;
  }>;

  /**
   * @deprecated Use resolveIdentity instead.
   */
  resolveUserId(request: Request): Promise<string>;
}
