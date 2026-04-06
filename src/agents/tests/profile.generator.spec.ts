/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { ProfileGenerator } from "../profile.generator";
import { beforeEach, describe, expect, it } from "bun:test";
import { searchUser } from "../../../parallel/parallel";

describe('Profile Generator', () => {
  let profileGenerator: ProfileGenerator;

  beforeEach(() => {
    profileGenerator = new ProfileGenerator();
  })

  it('should generate a profile', async () => {
    let parallelResult;
    try {
      parallelResult = await searchUser({
        objective: `
        Find information about the person named Seref Yarar.
        This is their LinkedIn profile page: https://www.linkedin.com/in/serefyarar/
        This is their email address: seref@index.network
        This is their GitHub profile page: https://github.com/serefyarar
        This is their Twitter profile page: https://x.com/hyperseref
      `,
      });
    } catch (e) {
      console.error(e);
      return;
    }

    try {
      const result = await profileGenerator.invoke(JSON.stringify(parallelResult.results.map((r) => ({ title: r.title, content: r.excerpts.join('\n') })), null, 2));
      expect(!!result.output.identity.bio).toBe(true);
      expect(!!result.output.identity.location).toBe(true);
      expect(!!result.output.identity.name).toBe(true);
      expect(!!result.output.attributes.interests.length).toBe(true);
      expect(!!result.output.attributes.skills.length).toBe(true);
      expect(!!result.output.narrative.context).toBe(true);
      expect(!!result.textToEmbed).toBe(true);
    } catch (e) {
      throw e;
    }
  }, 60000);
})