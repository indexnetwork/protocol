export interface TitleGeneratorInput {
    messages: Array<{
        role: string;
        content: string;
    }>;
}
/**
 * Generates a short, descriptive title for a chat session using the first exchange.
 * Only meaningful when there is at least one user message and one assistant message.
 */
export declare class ChatTitleGenerator {
    private model;
    constructor();
    /**
     * Suggests a title from the conversation excerpt.
     * Call only when there is at least one user and one assistant message.
     */
    invoke(input: TitleGeneratorInput): Promise<string>;
}
//# sourceMappingURL=chat.title.generator.d.ts.map