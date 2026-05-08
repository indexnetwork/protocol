/**
 * Kind of connect link being minted. Determines the action endpoint the short
 * URL eventually redirects to (per-status: pending+introducer ->
 * approve_introduction, accepted -> outreach, otherwise -> connect).
 */
export type ConnectLinkKind = 'connect' | 'approve_introduction' | 'outreach';

/**
 * Mints (or reuses) a short link for the given recipient and kind, snapshotting
 * the greeting onto the link record. Returns the full public URL.
 */
export interface MintConnectLink {
  (args: {
    userId: string;
    opportunityId: string;
    kind: ConnectLinkKind;
    greeting?: string | null;
  }): Promise<{ url: string }>;
}
