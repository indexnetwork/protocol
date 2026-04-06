import { z } from "zod";

import { requestContext } from "../support/request-context.js";

import type { DefineTool, ToolDeps } from "./tool.helpers.js";
import { success, error, needsClarification, UUID_REGEX } from "./tool.helpers.js";
import { protocolLogger } from "../support/protocol.logger.js";
import type { EnrichmentResult, ProfileEnricher } from "../interfaces/enrichment.interface.js";

const logger = protocolLogger("ChatTools:Profile");

function isMeaningfulEnrichment(enrichment: EnrichmentResult | null): enrichment is EnrichmentResult {
  return !!enrichment &&
    enrichment.confidentMatch &&
    (
      enrichment.identity.bio.trim().length > 0 ||
      enrichment.narrative.context.trim().length > 0 ||
      enrichment.attributes.skills.length > 0 ||
      enrichment.attributes.interests.length > 0
    );
}

export function createProfileTools(defineTool: DefineTool, deps: ToolDeps) {
  const { userDb, systemDb, database, graphs, enricher } = deps;

  async function enrichFromUserRecord(user: { name?: string | null; email?: string | null; socials?: { linkedin?: string; x?: string; github?: string; websites?: string[] } | null }) {
    return enricher.enrichUserProfile({
      name: user.name || undefined,
      email: user.email || undefined,
      linkedin: user.socials?.linkedin || undefined,
      twitter: user.socials?.x || undefined,
      github: user.socials?.github || undefined,
      websites: user.socials?.websites?.length ? user.socials.websites : undefined,
    });
  }

  const readUserProfiles = defineTool({
    name: "read_user_profiles",
    description:
      "Find or read user profiles. When the user asks to find, look up, or learn about a specific person by name, use `query` — this is the primary way to look up people by name. With `query`: finds members by name (case-insensitive) across the user's indexes (or a specific index if `networkId` also provided). With `userId`: returns that user's profile. With `networkId` alone: returns profiles of all members in that index. In an index-scoped chat, no args returns the current user's profile. Outside an index-scoped chat, at least one parameter is required.",
    querySchema: z.object({
      userId: z.string().optional().describe("Optional user ID to fetch a specific user's profile"),
      networkId: z.string().optional().describe("Optional index ID to fetch profiles of all members in that index"),
      query: z.string().optional().describe("Name to find (case-insensitive substring match). Searches across the user's indexes, or within a specific index if networkId is also provided."),
    }),
    handler: async ({ context, query }) => {
      const effectiveIndexId = query.networkId?.trim() || undefined;
      const targetUserId = query.userId?.trim() || undefined;
      const nameQuery = query.query?.trim() || undefined;

      if (effectiveIndexId && !UUID_REGEX.test(effectiveIndexId)) {
        return error("Invalid network ID format. Use the exact UUID from read_networks.");
      }

      // --- Name search mode: query provided → find members by name ---
      if (nameQuery) {
        const pattern = nameQuery.toLowerCase();
        const MAX_RESULTS = 20;
        // When chat is index-scoped, restrict name search to that index
        const searchIndexId = effectiveIndexId || context.networkId || undefined;

        let candidates: Array<{ userId: string; name: string; avatar: string | null }>;

        if (searchIndexId) {
          // Scoped to a specific index
          if (context.networkId && searchIndexId !== context.networkId) {
            return error(
              context.indexName
                ? `This chat is scoped to ${context.indexName}. You can only look up people in this community.`
                : `This chat is scoped to this index. You can only look up people in this community.`
            );
          }
          const callerIsMember = await systemDb.isNetworkMember(searchIndexId, context.userId);
          if (!callerIsMember) {
            return error("You can only look up people in indexes you are a member of.");
          }
          const members = await systemDb.getIndexMembers(searchIndexId);
          candidates = members.map((m) => ({ userId: m.userId, name: m.name, avatar: m.avatar ?? null }));
        } else {
          // Search across all user's indexes
          candidates = await systemDb.getMembersFromScope();
        }

        logger.verbose("Name search candidates", {
          query: nameQuery,
          pattern,
          candidateCount: candidates.length,
          userId: context.userId,
        });

        // Filter by name (case-insensitive substring), exclude self
        const matched = candidates
          .filter((c) => c.userId !== context.userId && c.name.toLowerCase().includes(pattern))
          .slice(0, MAX_RESULTS);

        if (matched.length === 0) {
          return success({ query: nameQuery, matchCount: 0, profiles: [], message: "No members found matching that name." });
        }

        // Fetch full profiles for matches
        const profiles = await Promise.all(
          matched.map(async (m) => {
            const profile = await systemDb.getProfile(m.userId);
            return {
              userId: m.userId,
              name: m.name,
              hasProfile: !!profile,
              profile: profile
                ? {
                    name: profile.identity.name,
                    bio: profile.identity.bio,
                    location: profile.identity.location,
                    skills: profile.attributes.skills,
                    interests: profile.attributes.interests,
                  }
                : undefined,
            };
          })
        );

        return success({ query: nameQuery, matchCount: profiles.length, profiles });
      }

      // Guard: when chat is NOT index-scoped and no userId/networkId provided, disallow
      if (!effectiveIndexId && !targetUserId && !context.networkId) {
        return error("Please provide a userId, networkId, or query. Outside of an index-scoped chat, read_user_profiles requires at least one of these parameters. To read your own profile, pass your own userId.");
      }

      // --- Mode 3: networkId provided → fetch all member profiles ---
      if (effectiveIndexId) {
        // Strict scope enforcement: when chat is index-scoped, only allow querying that index
        if (context.networkId && effectiveIndexId !== context.networkId) {
          return error(
            context.indexName
              ? `This chat is scoped to ${context.indexName}. You can only read profiles from this community.`
              : `This chat is scoped to this index. You can only read profiles from this community.`
          );
        }

        // Verify the caller is a member of the index they're querying
        const callerIsMember = await systemDb.isNetworkMember(effectiveIndexId, context.userId);
        if (!callerIsMember) {
          return error(
            "You can only read profiles from indexes you are a member of."
          );
        }

        // Use systemDb for cross-user access within shared indexes
        const members = await systemDb.getIndexMembers(effectiveIndexId);
        const profiles = await Promise.all(
          members.map(async (member) => {
            const profile = await systemDb.getProfile(member.userId);
            return {
              userId: member.userId,
              name: member.name,
              hasProfile: !!profile,
              profile: profile
                ? {
                    name: profile.identity.name,
                    bio: profile.identity.bio,
                    location: profile.identity.location,
                    skills: profile.attributes.skills,
                    interests: profile.attributes.interests,
                  }
                : undefined,
            };
          })
        );
        return success({ networkId: effectiveIndexId, memberCount: members.length, profiles });
      }

      // --- Mode 2: userId provided (different user) → fetch single profile directly ---
      if (targetUserId && targetUserId !== context.userId) {
        // Strict scope enforcement: when chat is index-scoped, verify user is in that index
        if (context.networkId) {
          const isInScopedIndex = await systemDb.isNetworkMember(context.networkId, targetUserId);
          if (!isInScopedIndex) {
            return error(
              context.indexName
                ? `This chat is scoped to ${context.indexName}. You can only read profiles of members in this community.`
                : `This chat is scoped to this index. You can only read profiles of members in this community.`
            );
          }
        }

        // Use systemDb for cross-user profile access (requires shared index)
        const profile = await systemDb.getProfile(targetUserId);
        if (profile) {
          return success({
            hasProfile: true,
            profile: {
              name: profile.identity.name,
              bio: profile.identity.bio,
              location: profile.identity.location,
              skills: profile.attributes.skills,
              interests: profile.attributes.interests,
            },
          });
        }
        return success({ hasProfile: false, message: "This user does not have a profile yet." });
      }

      // --- Mode 1: No args / self → use profileGraph query (returns id for updates) ---
      const _readProfileGraphStart = Date.now();
      const _readProfileTraceEmitter = requestContext.getStore()?.traceEmitter;
      _readProfileTraceEmitter?.({ type: "graph_start", name: "profile" });
      const result = await graphs.profile.invoke({
        userId: context.userId,
        operationMode: 'query' as const,
      });
      const _readProfileGraphMs = Date.now() - _readProfileGraphStart;
      _readProfileTraceEmitter?.({ type: "graph_end", name: "profile", durationMs: _readProfileGraphMs });

      if (result.readResult) {
        return success({ ...result.readResult, _graphTimings: [{ name: 'profile', durationMs: _readProfileGraphMs, agents: result.agentTimings ?? [] }] });
      }
      if (result.profile) {
        return success({
          hasProfile: true,
          profile: {
            name: result.profile.identity.name,
            bio: result.profile.identity.bio,
            location: result.profile.identity.location,
            skills: result.profile.attributes.skills,
            interests: result.profile.attributes.interests,
          },
          _graphTimings: [{ name: 'profile', durationMs: _readProfileGraphMs, agents: result.agentTimings ?? [] }],
        });
      }
      return success({
        hasProfile: false,
        message: "You don't have a profile yet. Would you like to create one? You can share your LinkedIn, GitHub, or X/Twitter profile, or just tell me about yourself.",
        _graphTimings: [{ name: 'profile', durationMs: _readProfileGraphMs, agents: result.agentTimings ?? [] }],
      });
    },
  });

  const createUserProfile = defineTool({
    name: "create_user_profile",
    description:
      "Auto-generates (or regenerates) a profile from the user's account data (name, email, social links) via web lookup, or from explicit text when the user provides a short description (e.g. role, skills, location). When the user provides a profile URL in their message, pass it in the matching parameter (e.g. linkedinUrl) so that URL is used for this request, not their saved links. Works whether or not the user already has a profile. Call with no args first; if it returns missing fields, ask the user conversationally for their full name and/or social URLs, then call again with those fields filled in. During onboarding, the first call returns a preview without saving. When the user confirms, call again with confirm=true to save.",
    querySchema: z.object({
      name: z.string().optional().describe("User's full name (first and last), if provided by the user"),
      linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
      githubUrl: z.string().optional().describe("GitHub profile URL"),
      twitterUrl: z.string().optional().describe("X/Twitter profile URL"),
      websites: z.array(z.string()).optional().describe("Personal or portfolio website URLs"),
      location: z.string().optional().describe("User's location (city, country)"),
      bioOrDescription: z.string().optional().describe("Explicit profile text from the user (e.g. 'software engineer, AI/ML, SF Bay Area'); creates or updates profile from this text only, no scraping"),
      confirm: z.boolean().optional().describe("Pass true to save a previously previewed profile during onboarding"),
    }),
    handler: async ({ context, query }) => {
      // Persist user-info fields (name, location, socials) to users table before any branching.
      // This ensures users.name is always updated regardless of which code path runs.
      // Trim all string fields to avoid persisting whitespace-only values.
      const name = query.name?.trim();
      const location = query.location?.trim();
      const linkedinUrl = query.linkedinUrl?.trim();
      const githubUrl = query.githubUrl?.trim();
      const twitterUrl = query.twitterUrl?.trim();
      const websites = query.websites?.map((url) => url.trim()).filter(Boolean);
      const hasSocialsFromQuery = Boolean(linkedinUrl || githubUrl || twitterUrl || websites?.length);
      if (name || location || hasSocialsFromQuery) {
        const socialsUpdate: { linkedin?: string; github?: string; x?: string; websites?: string[] } = {};
        if (linkedinUrl) socialsUpdate.linkedin = linkedinUrl;
        if (githubUrl) socialsUpdate.github = githubUrl;
        if (twitterUrl) socialsUpdate.x = twitterUrl;
        if (websites?.length) socialsUpdate.websites = websites;
        await userDb.updateUser({
          ...(name ? { name } : {}),
          ...(location ? { location } : {}),
          ...(hasSocialsFromQuery ? { socials: socialsUpdate } : {}),
        });
        logger.verbose("Persisted user-info fields to user record", { userId: context.userId });
      }

      const isOnboarding = !(context.user.onboarding?.completedAt);
      if (isOnboarding) {
        const existingProfile = await userDb.getProfile();
        if (existingProfile) {
          return success({
            alreadyExists: true,
            message: "Profile already exists. If the user confirmed it, call complete_onboarding() to finish setup. If they want changes, use create_user_profile(bioOrDescription=\"...\", confirm=true).",
            profile: {
              name: existingProfile.identity.name,
              bio: existingProfile.identity.bio,
              location: existingProfile.identity.location,
              skills: existingProfile.attributes.skills,
              interests: existingProfile.attributes.interests,
            },
          });
        }

        // Preview mode: enrich and persist enrichment results, but don't generate full profile
        if (!query.confirm) {
          try {
            const user = await userDb.getUser();
            const enrichment = user ? await enrichFromUserRecord(user) : null;

            if (isMeaningfulEnrichment(enrichment)) {
              // Persist enrichment data to user record so confirm path has it
              const updatePayload: {
                name?: string;
                intro?: string;
                location?: string;
                socials?: { x?: string; linkedin?: string; github?: string; websites?: string[] };
              } = {};
              // No ghost guard needed: onboarding users are active (non-ghost) and
              // haven't confirmed a name yet — the enriched name is a preview they accept or edit.
              if (enrichment.identity.name?.trim()) {
                updatePayload.name = enrichment.identity.name.trim();
              }
              if (enrichment.identity.bio?.trim()) updatePayload.intro = enrichment.identity.bio.trim();
              if (enrichment.identity.location?.trim()) updatePayload.location = enrichment.identity.location.trim();
              const socials: { x?: string; linkedin?: string; github?: string; websites?: string[] } = {};
              if (enrichment.socials.twitter) socials.x = enrichment.socials.twitter;
              if (enrichment.socials.linkedin) socials.linkedin = enrichment.socials.linkedin;
              if (enrichment.socials.github) socials.github = enrichment.socials.github;
              if (enrichment.socials.websites?.length) socials.websites = enrichment.socials.websites;
              if (Object.keys(socials).length > 0) updatePayload.socials = socials;
              if (Object.keys(updatePayload).length > 0) await userDb.updateUser(updatePayload);

              return success({
                preview: true,
                message: "Profile preview generated. Call create_user_profile(confirm=true) to save.",
                profile: {
                  name: enrichment.identity.name,
                  bio: enrichment.identity.bio,
                  location: enrichment.identity.location,
                  skills: enrichment.attributes.skills,
                  interests: enrichment.attributes.interests,
                },
              });
            }
          } catch (err) {
            logger.warn("Enrichment preview failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          }

          return needsClarification({
            missingFields: ['bio_or_social_urls'],
            message: "I couldn't find enough public info. Could you share a short description of yourself, or a LinkedIn/GitHub/X profile link?",
          });
        }

        // Confirm mode: invoke graph in generate mode (enrichment data already persisted during preview)
        // Do NOT re-run enrichFromUserRecord — the graph's autoGenerateNode handles enrichment
        // from the (now well-populated) user record, avoiding non-deterministic drift.
        try {
          const _confirmGraphStart = Date.now();
          const _confirmTraceEmitter = requestContext.getStore()?.traceEmitter;
          _confirmTraceEmitter?.({ type: "graph_start", name: "profile" });
          const result = await graphs.profile.invoke({
            userId: context.userId,
            operationMode: 'generate' as const,
          });
          const _confirmGraphMs = Date.now() - _confirmGraphStart;
          _confirmTraceEmitter?.({ type: "graph_end", name: "profile", durationMs: _confirmGraphMs });

          if (result.error) return error(result.error);
          if (result.profile) {
            return success({
              created: true,
              message: "Profile saved.",
              profile: {
                name: result.profile.identity.name,
                bio: result.profile.identity.bio,
                location: result.profile.identity.location,
                skills: result.profile.attributes.skills,
                interests: result.profile.attributes.interests,
              },
              _graphTimings: [{ name: 'profile', durationMs: _confirmGraphMs, agents: result.agentTimings ?? [] }],
            });
          }
        } catch (err) {
          logger.warn("Profile generation on confirm failed, falling back to full graph", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
        // Fallback: graph invocation failed on confirm, fall through to full graph invocation
      }

      const hasBioOrDescription = !!query.bioOrDescription?.trim();

      if (hasBioOrDescription) {
        // Create/update profile from user's explicit text only; do not persist to user record
        // Include name and location in the input if provided so the ProfileGenerator can use them
        const inputParts: string[] = [];
        if (name) inputParts.push(`Name: ${name}`);
        if (location) inputParts.push(`Location: ${location}`);
        inputParts.push(query.bioOrDescription!.trim());
        const profileInput = inputParts.join('\n');
        
        const _bioProfileGraphStart = Date.now();
        const _bioProfileTraceEmitter = requestContext.getStore()?.traceEmitter;
        _bioProfileTraceEmitter?.({ type: "graph_start", name: "profile" });
        const result = await graphs.profile.invoke({
          userId: context.userId,
          operationMode: 'write' as const,
          input: profileInput,
          forceUpdate: true,
        });
        const _bioProfileGraphMs = Date.now() - _bioProfileGraphStart;
        _bioProfileTraceEmitter?.({ type: "graph_end", name: "profile", durationMs: _bioProfileGraphMs });
        if (result.error) {
          return error(result.error);
        }
        if (result.profile) {
          return success({
            created: true,
            message: "Profile created/updated with the information you provided.",
            profile: {
              name: result.profile.identity.name,
              bio: result.profile.identity.bio,
              location: result.profile.identity.location,
              skills: result.profile.attributes.skills,
              interests: result.profile.attributes.interests,
            },
            _graphTimings: [{ name: 'profile', durationMs: _bioProfileGraphMs, agents: result.agentTimings ?? [] }],
          });
        }
        return success({
          created: true,
          message: "Profile created/updated with the information you provided.",
          _graphTimings: [{ name: 'profile', durationMs: _bioProfileGraphMs, agents: result.agentTimings ?? [] }],
        });
      }

      // Invoke profile graph in generate mode (uses enrichUserProfile Chat API)
      const _generateProfileGraphStart = Date.now();
      const _generateProfileTraceEmitter = requestContext.getStore()?.traceEmitter;
      _generateProfileTraceEmitter?.({ type: "graph_start", name: "profile" });
      const result = await graphs.profile.invoke({
        userId: context.userId,
        operationMode: 'generate' as const,
        forceUpdate: true,
      });
      const _generateProfileGraphMs = Date.now() - _generateProfileGraphStart;
      _generateProfileTraceEmitter?.({ type: "graph_end", name: "profile", durationMs: _generateProfileGraphMs });

      // If user info is insufficient, ask conversationally
      if (result.needsUserInfo) {
        return needsClarification({
          missingFields: result.missingUserInfo || ['social_urls', 'full_name'],
          message: "I need a bit more information to create your profile. Could you share your full name and any social links (LinkedIn, GitHub, or X/Twitter)?",
        });
      }

      if (result.error) {
        return error(result.error);
      }

      if (result.profile) {
        return success({
          created: true,
          message: "Profile generated from your account data.",
          profile: {
            name: result.profile.identity.name,
            bio: result.profile.identity.bio,
            location: result.profile.identity.location,
            skills: result.profile.attributes.skills,
            interests: result.profile.attributes.interests,
          },
          _graphTimings: [{ name: 'profile', durationMs: _generateProfileGraphMs, agents: result.agentTimings ?? [] }],
        });
      }

      return error("Failed to create profile. Please try again.");
    },
  });

  const updateUserProfile = defineTool({
    name: "update_user_profile",
    description:
      "Updates the user's existing profile. For the current user's profile, profileId can be omitted and the tool will use their profile. Use ONE call per request with all changes in action (and details if needed). For profile URLs call scrape_url first, then pass scraped content in details.",
    querySchema: z.object({
      profileId: z.string().optional().describe("Optional profile id from read_user_profiles; omit for current user's profile"),
      action: z.string().describe("What to do: one or more changes, e.g. 'update bio to X', 'add Python to skills'"),
      details: z.string().optional().describe("Additional context or pasted content"),
    }),
    handler: async ({ context, query }) => {
      // Use profileGraph query mode to validate profile existence and get id
      const _updateQueryProfileGraphStart = Date.now();
      const _updateQueryProfileTraceEmitter = requestContext.getStore()?.traceEmitter;
      _updateQueryProfileTraceEmitter?.({ type: "graph_start", name: "profile" });
      const queryResult = await graphs.profile.invoke({ userId: context.userId, operationMode: 'query' as const });
      const _updateQueryProfileGraphMs = Date.now() - _updateQueryProfileGraphStart;
      _updateQueryProfileTraceEmitter?.({ type: "graph_end", name: "profile", durationMs: _updateQueryProfileGraphMs });
      if (!queryResult.readResult?.hasProfile && !queryResult.profile) {
        return error("You don't have a profile yet. Use create_user_profile first.");
      }
      const existingProfileId = queryResult.readResult?.profile?.id;
      const providedProfileId = query.profileId?.trim();
      if (providedProfileId && existingProfileId && providedProfileId !== existingProfileId) {
        return error("Invalid profileId. Use the profile id from read_user_profiles.");
      }

      const inputForProfile = [query.action, query.details].filter(Boolean).join("\n") || (query.details ?? query.action);
      if (!inputForProfile.trim()) {
        return error("Please specify what to update (e.g. action: 'update bio to X').");
      }

      // Execute update directly
      const _updateWriteProfileGraphStart = Date.now();
      const _updateWriteProfileTraceEmitter = requestContext.getStore()?.traceEmitter;
      _updateWriteProfileTraceEmitter?.({ type: "graph_start", name: "profile" });
      const _writeResult = await graphs.profile.invoke({
        userId: context.userId,
        operationMode: "write",
        input: inputForProfile,
        forceUpdate: true,
      });
      const _updateWriteProfileGraphMs = Date.now() - _updateWriteProfileGraphStart;
      _updateWriteProfileTraceEmitter?.({ type: "graph_end", name: "profile", durationMs: _updateWriteProfileGraphMs });
      if (_writeResult.error) {
        return error(_writeResult.error);
      }
      return success({
        message: "Profile updated.",
        _graphTimings: [
          { name: 'profile', durationMs: _updateQueryProfileGraphMs, agents: queryResult.agentTimings ?? [] },
          { name: 'profile', durationMs: _updateWriteProfileGraphMs, agents: _writeResult.agentTimings ?? [] },
        ],
      });
    },
  });

  const completeOnboarding = defineTool({
    name: "complete_onboarding",
    description:
      "Marks onboarding as complete. Call this ONLY after the user has explicitly confirmed their profile is correct. Do NOT call this until the user says 'yes', 'looks good', 'that's right', or similar confirmation.",
    querySchema: z.object({}),
    handler: async ({ context }) => {
      const currentOnboarding = context.user.onboarding ?? {};
      if (currentOnboarding.completedAt) {
        logger.verbose("Onboarding already completed, skipping", { userId: context.userId });
        return success({ message: "Onboarding already completed." });
      }
      await userDb.updateUser({
        onboarding: {
          ...currentOnboarding,
          completedAt: new Date().toISOString(),
        },
      });

      const autoJoinIds = (process.env.AUTO_JOIN_INDEX_IDS ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      for (const networkId of autoJoinIds) {
        try {
          await database.addMemberToNetwork(networkId, context.userId, 'member');
        } catch (err) {
          logger.warn('Auto-join network failed (non-fatal)', { networkId, userId: context.userId, error: err instanceof Error ? err.message : String(err) });
        }
      }

      logger.info("Onboarding completed", { userId: context.userId, autoJoinedNetworks: autoJoinIds.length });
      return success({ message: "Onboarding complete." });
    },
  });

  return [readUserProfiles, createUserProfile, updateUserProfile, completeOnboarding] as const;
}
