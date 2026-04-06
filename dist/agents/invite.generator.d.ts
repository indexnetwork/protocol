/**
 * Invite Generator Agent
 *
 * Generates contextual, editable invite messages for ghost users.
 * Produces warm, concise messages (~3-5 sentences) referencing why two
 * users were matched, with optional referrer mention.
 */
import { z } from "zod";
declare const InviteInputSchema: z.ZodObject<{
    recipientName: z.ZodString;
    senderName: z.ZodString;
    opportunityInterpretation: z.ZodString;
    senderIntents: z.ZodArray<z.ZodString, "many">;
    recipientIntents: z.ZodArray<z.ZodString, "many">;
    referrerName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    recipientName: string;
    senderName: string;
    opportunityInterpretation: string;
    senderIntents: string[];
    recipientIntents: string[];
    referrerName?: string | undefined;
}, {
    recipientName: string;
    senderName: string;
    opportunityInterpretation: string;
    senderIntents: string[];
    recipientIntents: string[];
    referrerName?: string | undefined;
}>;
declare const InviteOutputSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export type InviteInput = z.infer<typeof InviteInputSchema>;
export type InviteOutput = z.infer<typeof InviteOutputSchema>;
/**
 * Generates a contextual invite message for a ghost user.
 * @param input - Context about sender, recipient, and opportunity
 * @returns Generated invite message text
 */
export declare function generateInviteMessage(input: InviteInput): Promise<InviteOutput>;
export {};
//# sourceMappingURL=invite.generator.d.ts.map