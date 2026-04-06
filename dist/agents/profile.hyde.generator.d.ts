import { z } from "zod/v4";
export declare class HydeGenerator {
    private model;
    constructor();
    private toString;
    invoke(input: string): Promise<{
        output: {
            identity: {
                bio: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                interests: string[];
                skills: string[];
            };
        };
        textToEmbed: string;
    }>;
    static asTool(): import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        input: z.ZodString;
    }, z.core.$strip>, {
        input: string;
    }, {
        input: string;
    }, {
        output: {
            identity: {
                bio: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                interests: string[];
                skills: string[];
            };
        };
        textToEmbed: string;
    }, unknown, "hydeGenerator">;
}
//# sourceMappingURL=profile.hyde.generator.d.ts.map