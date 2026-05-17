import type { Question } from "../shared/schemas/question.schema.js";
import type { ChatMessageWriter } from "../shared/interfaces/chat-message-writer.interface.js";
import { protocolLogger } from "../shared/observability/protocol.logger.js";
import { buildElicitationCreate, flattenChoice } from "./elicitation.builder.js";

const logger = protocolLogger("McpElicitation");

export type ElicitResultLike =
  | { action: "accept"; content?: { choice?: unknown } }
  | { action: "decline" }
  | { action: "cancel" };

export type ElicitInputFn = (
  params: ReturnType<typeof buildElicitationCreate>,
) => Promise<ElicitResultLike>;

export interface DispatchElicitationsParams {
  userId: string;
  questions: Question[];
  elicitInput: ElicitInputFn;
  chatMessageWriter: ChatMessageWriter | undefined;
}

/**
 * Sequentially dispatches one `elicitation/create` per question. On accept,
 * flattens the choice and posts it via the ChatMessageWriter. `cancel` breaks
 * the loop; `decline` is a no-op. A transport throw breaks the loop with a
 * warning. An addUserMessage throw logs and continues (doesn't halt the loop).
 * Empty `questions` is a no-op.
 *
 * Caller is responsible for the capability check — this function only knows
 * how to dispatch.
 */
export async function dispatchElicitations({
  userId,
  questions,
  elicitInput,
  chatMessageWriter,
}: DispatchElicitationsParams): Promise<void> {
  if (questions.length === 0) return;

  if (!chatMessageWriter) {
    // Misconfiguration: composition root forgot to wire the writer. We still
    // proceed with elicitations so the user isn't silently left hanging, but
    // surface the gap once at loop start so it's visible in protocol logs.
    logger.warn("chat_message_writer_absent_responses_will_drop", {
      userId,
      questionCount: questions.length,
    });
  }

  for (const question of questions) {
    const elicitation = buildElicitationCreate(question);
    let reply: ElicitResultLike;
    try {
      reply = await elicitInput(elicitation);
    } catch (err) {
      logger.warn("elicitation_failed", {
        title: question.title,
        error: err instanceof Error ? err.message : String(err),
      });
      break;
    }

    if (reply.action === "cancel") break;
    if (reply.action === "decline") continue;

    const flat = flattenChoice(question, reply.content?.choice);
    if (flat === null) continue;
    if (!chatMessageWriter) continue;

    try {
      const writeResult = await chatMessageWriter.addUserMessage(userId, flat);
      if (writeResult === null) {
        // User has no chat session — the accepted answer is dropped here.
        // Day-one behavior: log and continue. Future iterations may surface
        // the answer back through the tool result envelope for clients to
        // resurface, but that's out of scope for this slice.
        logger.warn("chat_message_write_skipped_no_session", {
          userId,
          title: question.title,
        });
      }
    } catch (err) {
      logger.warn("chat_message_write_failed", {
        title: question.title,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
