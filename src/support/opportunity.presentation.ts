/**
 * Pure presentation layer for opportunities.
 * Generates title, description, and CTA based on viewer context — no DB access.
 */

import type { Opportunity } from '../interfaces/database.interface';

export interface OpportunityPresentation {
  title: string;
  description: string;
  callToAction: string;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar: string | null;
}

/**
 * Generate presentation copy for an opportunity based on viewer context.
 * Pure function — no side effects, no database access.
 */
export function presentOpportunity(
  opp: Opportunity,
  viewerId: string,
  otherPartyInfo: UserInfo,
  introducerInfo: UserInfo | null,
  format: 'card' | 'email' | 'notification'
): OpportunityPresentation {
  const myActor = opp.actors.find((a) => a.userId === viewerId);
  const introducer = opp.actors.find((a) => a.role === 'introducer');

  if (!myActor) {
    throw new Error('Viewer is not an actor in this opportunity');
  }

  const otherName = otherPartyInfo.name;
  let title: string;
  let description: string;
  let descriptionIsReasoning = false;

  switch (myActor.role) {
    case 'agent':
      title = `You can help ${otherName}`;
      description = `Based on your expertise, ${otherName} might benefit from connecting with you.`;
      break;
    case 'patient':
      title = `${otherName} might be able to help you`;
      description = `${otherName} has skills that align with what you're looking for.`;
      break;
    case 'peer':
      title = `Potential collaboration with ${otherName}`;
      description = `You and ${otherName} have complementary interests.`;
      break;
    case 'mentee':
      title = `${otherName} could mentor you`;
      description = `${otherName} has experience that could help guide your journey.`;
      break;
    case 'mentor':
      title = `${otherName} is looking for guidance`;
      description = `Your expertise could help ${otherName} on their path.`;
      break;
    case 'founder':
      title = `${otherName} might be interested in your venture`;
      description = `${otherName}'s investment focus aligns with what you're building.`;
      break;
    case 'investor':
      title = `${otherName} is building something interesting`;
      description = `${otherName}'s venture might fit your investment thesis.`;
      break;
    case 'party':
    default:
      if (introducer && introducerInfo) {
        title = `${introducerInfo.name} thinks you should meet ${otherName}`;
        description = opp.interpretation.reasoning;
        descriptionIsReasoning = true;
      } else {
        title = `Opportunity with ${otherName}`;
        description = opp.interpretation.reasoning;
        descriptionIsReasoning = true;
      }
      break;
  }

  if (!descriptionIsReasoning) {
    description += `\n\n${opp.interpretation.reasoning}`;
  }

  if (format === 'notification') {
    description =
      description.length > 100 ? description.slice(0, 97) + '...' : description;
  }

  return {
    title,
    description,
    callToAction: 'View Opportunity',
  };
}
