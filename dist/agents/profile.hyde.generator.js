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
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import { protocolLogger } from "../support/protocol.logger";
/**
 * Config
 */
import { config } from "dotenv";
config({ path: '.env.development', override: true });
import { Timed } from "../support/performance";
import { createModel } from "./model.config";
const logger = protocolLogger("HyDEGenerator");
const model = createModel("profileHydeGenerator");
const systemPrompt = `
    You are a Profile Profiler.
    Given a user's profile, imagine a **Hypothetical User Profile** person that would be the best match for the user to accomplish their goals.
    
    Imagine this ideal candidate actually exists. Write a profile for THEM.
    Your output will be used to vector-search a database of real user profiles.

    Structure your response as a natural language Bio/Narrative written in the **Third Person**.
    
    The description should include:
    1. **Context**: Who they are (role, background).
    2. **Skills/lnterests**: What they are good at that complements the user.
    3. **Goals**: What they are trying to achieve that aligns with the user.
    
    **CRITICAL INSTRUCTION - COMPLEMENTARY MATCHING:**
    - Do NOT just look for "similar" people. Look for people who provide what the user NEEDS (Supply/Demand).
    - If the user is a **Founder**, describe an **Investor** or **VC**.
    - If the user is a **Learner**, describe a **Mentor** or **Expert**.
    - If the user is a **Builder**, describe a **Collaborator** or **Co-founder**.
    
    Do NOT describe the Source User. Describe the TARGET Match.
    Do NOT invent a name for the candidate. Refer to them as "The candidate", "They", or "This individual".
    Do NOT include locations.

    PRIVACY: Never include email addresses, phone numbers, physical addresses, government IDs, or other contact identifiers in bio or narrative — even if they appear in the source profile.
`;
const responseFormat = z.object({
    identity: z.object({
        bio: z.string().describe("Professional summary only; no email, phone, physical address, government ID, or other contact identifiers"),
    }),
    narrative: z.object({
        context: z.string().describe("Rich narrative without email, phone, physical address, government ID, or other contact identifiers"),
    }),
    attributes: z.object({
        interests: z.array(z.string()).describe("Inferred or explicit interests"),
        skills: z.array(z.string()).describe("Professional skills"),
    }),
});
export class HydeGenerator {
    constructor() {
        this.model = model.withStructuredOutput(responseFormat, {
            name: "hyde_generator"
        });
    }
    toString(description) {
        const textToEmbed = [
            '# Identity',
            '## Bio', description.identity.bio,
            '# Narrative',
            '## Context', description.narrative.context,
            '# Attributes',
            '## Interests', description.attributes.interests.join(', '),
            '## Skills', description.attributes.skills.join(', ')
        ].join('\n');
        return textToEmbed;
    }
    async invoke(input) {
        logger.verbose("Received input", { inputLength: input?.length });
        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(`Here is the profile for the HyDE Generation:\n${input}`)
        ];
        const result = await this.model.invoke(messages);
        const output = responseFormat.parse(result);
        const textToEmbed = this.toString(output);
        logger.verbose("Generated HyDE profile", {
            skillsCount: output.attributes.skills.length,
            interestsCount: output.attributes.interests.length
        });
        return { output, textToEmbed };
    }
    static asTool() {
        return tool(async (args) => {
            const hydeGenerator = new HydeGenerator();
            return await hydeGenerator.invoke(args.input);
        }, {
            name: 'hydeGenerator',
            description: 'HyDE Generator',
            schema: z.object({
                input: z.string().describe('The profile to generate a HyDE for'),
            })
        });
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HydeGenerator.prototype, "invoke", null);
//# sourceMappingURL=profile.hyde.generator.js.map