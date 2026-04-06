var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { log } from "../support/log.js";
import { Timed } from "../support/performance.js";
import { createModel } from "./model.config.js";
const logger = log.lib.from("ChatTitleGenerator");
const SYSTEM_PROMPT = `You suggest a very short title for a chat conversation.

Rules:
- Reply with ONLY the title, no quotes or punctuation.
- Maximum 6 words.
- If the conversation is just greetings (hi, hello, hey, thanks) or has no clear topic yet, reply with exactly: New chat
- Otherwise summarize the main topic or intent in a few words.`;
/**
 * Generates a short, descriptive title for a chat session using the first exchange.
 * Only meaningful when there is at least one user message and one assistant message.
 */
export class ChatTitleGenerator {
    constructor() {
        this.model = createModel("chatTitleGenerator");
    }
    /**
     * Suggests a title from the conversation excerpt.
     * Call only when there is at least one user and one assistant message.
     */
    async invoke(input) {
        const { messages } = input;
        if (messages.length === 0)
            return "New chat";
        const excerpt = messages
            .slice(0, 6)
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 200)}`)
            .join("\n");
        try {
            const response = await this.model.invoke([
                new SystemMessage(SYSTEM_PROMPT),
                new HumanMessage(`Conversation:\n${excerpt}\n\nSuggested title:`),
            ]);
            const text = typeof response.content === "string" ? response.content : String(response.content ?? "").trim();
            const title = text.slice(0, 80).trim() || "New chat";
            logger.verbose("[ChatTitleGenerator.invoke] Title generated", { titleLength: title.length });
            return title;
        }
        catch (error) {
            logger.warn("[ChatTitleGenerator.invoke] Failed to generate title", {
                error: error instanceof Error ? error.message : String(error),
            });
            return "New chat";
        }
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatTitleGenerator.prototype, "invoke", null);
//# sourceMappingURL=chat.title.generator.js.map