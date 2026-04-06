/**
 * Resolves the authenticated user ID from an incoming request.
 * Injected into the MCP server factory so the protocol layer
 * stays independent of any specific auth implementation.
 */
export interface McpAuthResolver {
  /**
   * Extracts and validates the authenticated user's ID from the request.
   * @param request - The incoming HTTP request
   * @returns The authenticated user's UUID
   * @throws Error if authentication fails (no token, invalid token, etc.)
   */
  resolveUserId(request: Request): Promise<string>;
}
