import { Annotation } from "@langchain/langgraph";

/**
 * Index Graph State.
 * Handles CRUD operations for indexes (communities).
 *
 * Flow:
 * START → routerNode → {createNode | readNode | updateNode | deleteNode} → END
 */
export const IndexGraphState = Annotation.Root({
  // --- Core Inputs (from ChatGraph via ToolContext) ---

  /** User performing the action. Always required. */
  userId: Annotation<string>,

  /** Target index ID. Required for read/update/delete. From ChatGraph or tool arg. */
  indexId: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  /** Operation mode. */
  operationMode: Annotation<'create' | 'read' | 'update' | 'delete'>({
    reducer: (curr, next) => next ?? curr,
    default: () => 'read' as const,
  }),

  // --- Mode-Specific Inputs ---

  /** For create mode: index creation data. */
  createInput: Annotation<{
    title: string;
    prompt?: string;
    imageUrl?: string | null;
    joinPolicy?: 'anyone' | 'invite_only';
  } | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  /** For update mode: fields to update. */
  updateInput: Annotation<{
    title?: string;
    prompt?: string | null;
    imageUrl?: string | null;
    joinPolicy?: 'anyone' | 'invite_only';
    allowGuestVibeCheck?: boolean;
  } | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  /** When true and index-scoped, read returns all user indexes (not just scoped one). */
  showAll: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  // --- Outputs ---

  /** Output for read mode. */
  readResult: Annotation<{
    memberOf: Array<{
      indexId: string;
      title: string;
      description: string | null;
      autoAssign: boolean;
      joinedAt: Date;
    }>;
    owns: Array<{
      indexId: string;
      title: string;
      description: string | null;
      memberCount: number;
      intentCount: number;
      joinPolicy: string;
    }>;
    publicIndexes?: Array<{
      indexId: string;
      title: string;
      description: string | null;
      memberCount: number;
      owner: { name: string; avatar: string | null } | null;
    }>;
    stats: {
      memberOfCount: number;
      ownsCount: number;
      publicIndexesCount?: number;
      scopeNote?: string;
    };
  } | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  /** Output for create/update/delete modes. */
  mutationResult: Annotation<{
    success: boolean;
    indexId?: string;
    title?: string;
    message?: string;
    error?: string;
  } | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  /** Error message if graph could not complete. */
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});
