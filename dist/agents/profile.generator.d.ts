import { z } from "zod/v4";
declare const responseFormat: z.ZodObject<{
    identity: z.ZodObject<{
        name: z.ZodString;
        bio: z.ZodString;
        location: z.ZodString;
    }, z.core.$strip>;
    narrative: z.ZodObject<{
        context: z.ZodString;
    }, z.core.$strip>;
    attributes: z.ZodObject<{
        interests: z.ZodArray<z.ZodString>;
        skills: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
type Profile = z.infer<typeof responseFormat>;
export type ProfileDocument = Profile & {
    userId: string;
    embedding: number[] | number[][] | null;
};
export declare class ProfileGenerator {
    private model;
    constructor();
    private toString;
    invoke(input: string): Promise<{
        output: {
            identity: {
                name: string;
                bio: string;
                location: string;
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
                name: string;
                bio: string;
                location: string;
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
    }, unknown, "profileGenerator">;
}
export {};
//# sourceMappingURL=profile.generator.d.ts.map