import { z } from "zod";
import { success, error, normalizeUrl } from "./tool.helpers.js";
export function createUtilityTools(defineTool, deps) {
    const { scraper } = deps;
    const scrapeUrl = defineTool({
        name: "scrape_url",
        description: "Extracts text content from a URL (articles, profiles, documentation, etc.). Use this to read web pages, LinkedIn/GitHub profiles, or any public web content. The URL does not need http:// or https:// — bare domains like github.com/user/repo work fine. Pass 'objective' when you know the downstream use: e.g. 'User wants to create an intent from this link (project/repo).' or 'User wants to update their profile from this page.' — this returns content better suited for that use.",
        querySchema: z.object({
            url: z.string().describe("The URL to scrape (protocol optional — e.g. 'github.com/user/repo' is fine)"),
            objective: z.string().optional().describe("Optional: why we're scraping. E.g. 'User wants to create an intent from this link' or 'User wants to update their profile from this page'. Omit for generic extraction."),
        }),
        handler: async ({ context: _context, query }) => {
            const normalizedUrl = normalizeUrl(query.url);
            if (!normalizedUrl) {
                return error("Invalid URL format. Please provide a valid URL (e.g. 'github.com/user/repo' or 'https://example.com').");
            }
            const content = await scraper.extractUrlContent(normalizedUrl, {
                objective: query.objective?.trim() || undefined,
            });
            if (!content) {
                return error("Couldn't extract content from that URL. It may be blocked, require login, or have no extractable text.");
            }
            const truncatedContent = content.length > 10000
                ? content.substring(0, 10000) + "\n\n[Content truncated...]"
                : content;
            return success({
                url: normalizedUrl,
                contentLength: content.length,
                content: truncatedContent,
            });
        },
    });
    const readDocs = defineTool({
        name: "read_docs",
        description: "Returns the protocol's business logic documentation: entity model, intent lifecycle, opportunity lifecycle, discovery mechanics, and key workflows. Call this when you need to understand how the system works or explain it to the user.",
        querySchema: z.object({
            topic: z.string().optional().describe("Optional: narrow to a specific topic (e.g. 'opportunities', 'intents', 'indexes', 'profiles', 'discovery')."),
        }),
        handler: async ({ context: _context, query }) => {
            const topic = query.topic?.trim().toLowerCase();
            const sections = {
                entities: `## Entity Model

- **Users**: People on the platform. Authenticated via session (Better Auth).
- **Profiles**: A user's identity — bio, skills, interests, location, social links. Generated from account data or social URLs. Has a vector embedding for semantic matching.
- **Indexes**: Communities or groups. Each has a title, optional prompt (purpose description), and a join policy (anyone or invite_only). Users join indexes as members; the creator is the owner.
- **Index Members**: Junction between Users and Indexes. Tracks permissions, join date, auto-assign setting, and optional member prompt.
- **Intents**: What a user is looking for — wants, needs, and priorities. Each has a description (payload), summary, confidence score, and vector embedding. Intents belong to a user but are linked to indexes via IntentIndexes (many-to-many).
- **IntentIndexes**: Junction between Intents and Indexes. An intent can be in multiple indexes. When an intent is created, it is evaluated against index prompts and linked to relevant ones.
- **Opportunities**: Discovered connections between users based on intent overlap. Have roles (introducer, patient, agent, peer), status lifecycle, reasoning, and presentation data.
- **HyDE Documents**: Hypothetical Document Embeddings — generated synthetic documents used for semantic retrieval of intents and profiles`,
                intents: `## Intent Lifecycle

1. **Creation**: User describes what they're looking for. The IntentClarifier checks if it's specific enough — vague intents get a refinement suggestion before persisting.
2. **Inference**: The intent graph extracts structured intents from free text. It can infer multiple intents from a single input and reconcile with existing ones (update if similar, create if new).
3. **Semantic Governance**: Each intent gets a confidence score, semantic entropy measure, speech act type (commissive, directive, assertive), referential anchor, and felicity conditions (sincerity, authority).
4. **Index Assignment**: After creation, the intent is evaluated against all indexes the user belongs to (using the index prompt as criteria). It's automatically linked to matching indexes via IntentIndexes.
5. **Discovery**: Creating an intent triggers background opportunity detection — the system looks for other users in shared indexes whose intents complement this one.
6. **Update/Archive**: Intents can be updated (re-processed through the graph) or archived (soft delete).`,
                opportunities: `## Opportunity Lifecycle

1. **Detection**: The opportunity graph finds users whose intents semantically complement each other within shared indexes. Uses HyDE embeddings for retrieval and an evaluator agent for scoring.
2. **Roles**: Each opportunity assigns roles — introducer (who triggered it), patient (seeker), agent (helper), or peer (mutual). The current user's role determines what they see.
3. **Status Flow**: latent (draft) → pending (sent) → accepted/rejected/expired. Users see "draft", "sent", "connected" in natural language.
4. **Visibility**: Role-based. The introducer sees the draft first. After sending, the next person in the reveal chain sees it. Not all parties see all details at every stage.
5. **Presentation**: Each opportunity gets a personalized summary, suggested action, and reasoning — generated by an LLM presenter agent.
6. **Two Modes**:
   - **Discovery**: System finds matches for the user's intents in an index (or all indexes). Triggered by create_intent or create_opportunities with searchQuery.
   - **Introduction**: A user introduces two specific people. The system gathers both profiles and intents from shared indexes and creates the opportunity.`,
                indexes: `## Index Mechanics

- Indexes are communities where members share what they're looking for.
- Each index has a **prompt** that describes its purpose (e.g. "AI/ML co-founders in Berlin"). This prompt is used by the intent indexer agent to evaluate whether an intent belongs.
- **Join policy**: "anyone" (open) or "invite_only" (owner adds members).
- Members can see all intents in the index (not just their own).
- The **auto-assign** setting on a membership means new intents by that user are automatically evaluated against the index.
- Index owners can update settings, add/remove members, and delete the index (if sole member).`,
                profiles: `## Profile System

- Profiles are auto-generated from user account data (name, email, social links).
- Can be enriched by scraping LinkedIn, GitHub, Twitter, or personal websites.
- The profile graph generates a structured identity (bio, skills, interests, location), narrative context, and attributes.
- Profiles have vector embeddings used for semantic matching in opportunity detection.
- HyDE (Hypothetical Document Embedding) generates synthetic documents from profiles for better retrieval: Mirror (self-description), Reciprocal (what they'd look for), and Neighborhood (related community context).`,
                discovery: `## Discovery Mechanics

- Discovery runs when an intent is created (automatic) or when create_opportunities is called explicitly.
- The opportunity graph pipeline: Preparation (gather context) → Scope (determine indexes) → Discovery (semantic matching of intents) → Evaluation (LLM scores relevance) → Ranking → Persist.
- Semantic matching uses HyDE embeddings to find candidate intents that complement the source intent.
- The evaluator agent scores each match on relevance, complementarity, and actionability.
- Results are persisted as opportunities with appropriate roles and presentation.
- Background processing: after intent creation, a queue job continues looking for matches asynchronously.`,
            };
            if (topic) {
                const matched = Object.entries(sections).find(([key]) => key.includes(topic) || topic.includes(key));
                if (matched) {
                    return success({ topic: matched[0], content: matched[1] });
                }
                // If topic not found, return all
            }
            const fullDoc = Object.values(sections).join("\n\n");
            return success({ content: fullDoc });
        },
    });
    return [scrapeUrl, readDocs];
}
//# sourceMappingURL=utility.tools.js.map