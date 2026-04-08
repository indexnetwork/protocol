/**
 * Resolves the authenticated MCP identity from an incoming request.
 * Injected into the MCP server factory so the protocol layer
 * stays independent of any specific auth implementation.
 */
export interface McpAuthResolver {
  /**
   * Extracts and validates the authenticated identity from the request.
   * @param request - The incoming HTTP request
   * @returns The authenticated user's UUID and optional agent UUID
   * @throws Error if authentication fails (no token, invalid token, etc.)
   */
  resolveIdentity(request: Request): Promise<{ userId: string; agentId?: string }>;

  /**
   * @deprecated Use resolveIdentity instead.
   */
  resolveUserId(request: Request): Promise<string>;
}
