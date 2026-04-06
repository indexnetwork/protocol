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
import { config } from "dotenv";
import { Timed } from "../support/performance";
import { createModel } from "./model.config";
config({ path: '.env.development', override: true });
const logger = protocolLogger("ProfileGenerator");
const model = createModel("profileGenerator");
const systemPrompt = `
    You are an expert profiler. Your task is to synthesize a structured User Profile from raw data or user requests.

    When given EXISTING PROFILE + USER REQUEST: Apply the request to the existing profile. Add, update, or remove skills and interests as the user asks. Preserve everything else. Output the full updated profile.

    When given raw data only: Infer name, bio, location, narrative.context, and extract skills and interests.

    PRIVACY: identity.bio and narrative.context are public-facing. Never include email addresses, phone numbers, physical addresses, government IDs, or other contact identifiers — even if they appear in the raw data. Describe the person professionally; do not embed ways to contact them.
`;
const responseFormat = z.object({
    identity: z.object({
        name: z.string().describe("The user's full name"),
        bio: z.string().describe("Professional summary (2-3 sentences) only; no email, phone, physical address, government ID, or other contact identifiers"),
        location: z.string().describe("Inferred location (City, Country) or 'Remote'"),
    }),
    narrative: z.object({
        context: z.string().describe("Rich narrative without email, phone, physical address, government ID, or other contact identifiers"),
    }),
    attributes: z.object({
        interests: z.array(z.string()).describe("Inferred or explicit interests"),
        skills: z.array(z.string()).describe("Professional skills"),
    }),
});
export class ProfileGenerator {
    constructor() {
        this.model = model.withStructuredOutput(responseFormat, {
            name: "profile_generator"
        });
    }
    toString(profile) {
        const textToEmbed = [
            '# Identity',
            '## Name', profile.identity.name,
            '## Bio', profile.identity.bio,
            '## Location', profile.identity.location,
            '# Narrative',
            '## Context', profile.narrative.context,
            '# Attributes',
            '## Interests', profile.attributes.interests.join(', '),
            '## Skills', profile.attributes.skills.join(', ')
        ].join('\n');
        return textToEmbed;
    }
    async invoke(input) {
        logger.verbose("Received input", { inputLength: input?.length });
        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(`Here is the raw data:\n${input}`)
        ];
        const result = await this.model.invoke(messages);
        const output = responseFormat.parse(result);
        const textToEmbed = this.toString(output);
        logger.verbose("Generated profile", {
            skillsCount: output.attributes.skills.length,
            interestsCount: output.attributes.interests.length
        });
        return { output, textToEmbed };
    }
    static asTool() {
        return tool(async (args) => {
            const profileGenerator = new ProfileGenerator();
            return await profileGenerator.invoke(args.input);
        }, {
            name: 'profileGenerator',
            description: 'Profile Generator',
            schema: z.object({
                input: z.string().describe('Raw data scraped from the web (via Parallel.ai)'),
            })
        });
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProfileGenerator.prototype, "invoke", null);
//# sourceMappingURL=profile.generator.js.map