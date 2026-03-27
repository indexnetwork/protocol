/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, it } from "bun:test";
import { z } from "zod";
import { runScenario, defineScenario, expectSmartest } from "../../../smartest.js";
import { OpportunityEvaluator, type EvaluatorInput, type EvaluatorEntity } from "../opportunity.evaluator.js";

const DISCOVERER_ID = 'user-founder-alice';

const sourceEntity: EvaluatorEntity = {
  userId: DISCOVERER_ID,
  profile: {
    name: '(source user)',
    bio: 'Serial founder building an AI-native developer tools startup. Previously founded two SaaS companies (acquired).',
    location: 'San Francisco, CA',
    interests: ['artificial intelligence', 'developer tools', 'open source'],
    skills: ['product strategy', 'fundraising', 'go-to-market'],
    context: 'Looking for a technical co-founder with deep ML/AI expertise to lead the engineering team.',
  },
  intents: [
    { intentId: 'i-1', payload: 'Looking for an AI/ML co-founder with production LLM experience to build our core inference engine.' },
    { intentId: 'i-2', payload: 'Seeking a CTO-level technical partner with a track record in developer tooling or infrastructure.' },
  ],
  networkId: 'idx-ai-founders',
};

// Stress test: 25 candidates from completely unrelated domains.
// None are engineers, investors, co-founders, advisors, or mentors.
// Expected result: zero or near-zero matches from both bundle and parallel modes.
const candidates: EvaluatorEntity[] = [
  {
    userId: 'user-chef',
    profile: { name: 'Pierre Dubois', bio: 'Executive chef running three Michelin-starred restaurants in Paris and New York.', interests: ['fine dining', 'culinary arts', 'fermentation'], skills: ['menu design', 'kitchen management', 'food sourcing'], context: 'Expanding into a fourth restaurant location in Tokyo.' },
    intents: [{ intentId: 'c-1', payload: 'Looking for a commercial kitchen space to lease in Tokyo for a new restaurant opening.' }],
    networkId: 'idx-ai-founders', ragScore: 12, matchedVia: 'mirror',
  },
  {
    userId: 'user-yoga',
    profile: { name: 'Amara Osei', bio: 'Certified yoga instructor and studio owner. Runs a community wellness studio in Brooklyn.', interests: ['yoga', 'mindfulness', 'holistic health', 'community building'], skills: ['teaching', 'breathwork', 'retreat facilitation', 'studio management'], context: 'Growing the studio membership and launching online classes.' },
    intents: [{ intentId: 'c-2', payload: 'Seeking a videographer to produce online yoga class content for a subscription platform.' }],
    networkId: 'idx-ai-founders', ragScore: 8, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-musician',
    profile: { name: 'Kai Nakamura', bio: 'Jazz pianist and composer. Performs internationally and has released four studio albums.', interests: ['jazz', 'music theory', 'live performance', 'music production'], skills: ['piano', 'composition', 'improvisation', 'music arrangement'], context: 'Working on a new album blending jazz and electronic music.' },
    intents: [{ intentId: 'c-3', payload: 'Looking for a record label or independent distributor for a new jazz-electronic fusion album.' }],
    networkId: 'idx-ai-founders', ragScore: 6, matchedVia: 'mirror',
  },
  {
    userId: 'user-realtor',
    profile: { name: 'Sandra Bloom', bio: 'Licensed real estate agent specializing in luxury residential properties in Miami and the Florida Keys.', interests: ['real estate', 'interior design', 'waterfront properties'], skills: ['property valuation', 'negotiation', 'staging', 'client relations'], context: 'Expanding her client base into the Latin American luxury market.' },
    intents: [{ intentId: 'c-4', payload: 'Seeking high-net-worth clients from Latin America interested in luxury Miami waterfront properties.' }],
    networkId: 'idx-ai-founders', ragScore: 10, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-therapist',
    profile: { name: 'Dr. Nadia Russo', bio: 'Licensed clinical psychologist specializing in trauma-informed therapy and EMDR. Private practice in Chicago.', interests: ['trauma therapy', 'EMDR', 'somatic healing', 'mental health advocacy'], skills: ['CBT', 'EMDR', 'group therapy', 'clinical assessment'], context: 'Writing a book on trauma recovery and running weekend therapy retreats.' },
    intents: [{ intentId: 'c-5', payload: 'Looking for a co-author with publishing experience to write a book on trauma-informed approaches.' }],
    networkId: 'idx-ai-founders', ragScore: 9, matchedVia: 'mirror',
  },
  {
    userId: 'user-farmer',
    profile: { name: 'Tom Okafor', bio: 'Third-generation farmer running a 400-acre regenerative farm in rural Ohio. Specializes in heirloom grains and pasture-raised livestock.', interests: ['regenerative agriculture', 'soil health', 'farm-to-table', 'sustainable food systems'], skills: ['crop rotation', 'livestock management', 'soil science', 'farm equipment'], context: 'Exploring direct-to-consumer sales channels to reduce reliance on commodity markets.' },
    intents: [{ intentId: 'c-6', payload: 'Seeking a distribution partner or CSA platform to sell heirloom grain and meat boxes directly to consumers in major cities.' }],
    networkId: 'idx-ai-founders', ragScore: 7, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-journalist',
    profile: { name: 'Helena Voss', bio: 'Investigative journalist and author. Covers geopolitics and financial crime for a major European newspaper.', interests: ['investigative journalism', 'geopolitics', 'financial crime', 'press freedom'], skills: ['investigative research', 'source cultivation', 'long-form writing', 'data journalism'], context: 'Finishing a two-year investigation into offshore money flows in Southeast Asia.' },
    intents: [{ intentId: 'c-7', payload: 'Looking for a legal team experienced in press freedom and source protection to support a sensitive investigative series.' }],
    networkId: 'idx-ai-founders', ragScore: 11, matchedVia: 'mirror',
  },
  {
    userId: 'user-nurse',
    profile: { name: 'Grace Mensah', bio: 'ICU nurse with 12 years of critical care experience at a Level 1 trauma center. Passionate about nursing education.', interests: ['critical care', 'nursing education', 'patient advocacy', 'healthcare equity'], skills: ['critical care nursing', 'ventilator management', 'ACLS', 'preceptorship'], context: 'Developing a peer mentorship program for new ICU nurses.' },
    intents: [{ intentId: 'c-8', payload: 'Seeking funding or a nonprofit partner to scale a peer mentorship program for early-career ICU nurses.' }],
    networkId: 'idx-ai-founders', ragScore: 8, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-lawyer',
    profile: { name: 'Marcus Adeyemi', bio: 'Partner at a boutique immigration law firm. Specializes in employment-based visas and international talent mobility.', interests: ['immigration law', 'international talent', 'cross-border employment', 'policy advocacy'], skills: ['immigration law', 'visa applications', 'employment law', 'policy analysis'], context: 'Growing the firm\'s presence among high-growth tech companies seeking O-1 and EB-1 visas.' },
    intents: [{ intentId: 'c-9', payload: 'Looking to partner with HR leaders and startup founders who need immigration support for international hires.' }],
    networkId: 'idx-ai-founders', ragScore: 14, matchedVia: 'mirror',
  },
  {
    userId: 'user-architect',
    profile: { name: 'Sofia Brandt', bio: 'Licensed architect and urban designer. Principal at a studio known for sustainable mixed-use buildings in Scandinavia.', interests: ['sustainable architecture', 'urban design', 'passive house', 'biophilic design'], skills: ['AutoCAD', 'Revit', 'structural design', 'LEED certification', 'project management'], context: 'Pitching a large mixed-use sustainable development project in Copenhagen.' },
    intents: [{ intentId: 'c-10', payload: 'Seeking a developer partner for a 200-unit passive house mixed-use project in Copenhagen.' }],
    networkId: 'idx-ai-founders', ragScore: 9, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-teacher',
    profile: { name: 'James Obi', bio: 'High school biology and chemistry teacher. Passionate about science education and curriculum design.', interests: ['science education', 'curriculum development', 'mentoring students', 'STEM access'], skills: ['teaching', 'curriculum design', 'lab instruction', 'student mentorship'], context: 'Building an after-school STEM program for underserved communities.' },
    intents: [{ intentId: 'c-11', payload: 'Looking for corporate sponsors and STEM organizations to fund and expand an after-school science program.' }],
    networkId: 'idx-ai-founders', ragScore: 7, matchedVia: 'mirror',
  },
  {
    userId: 'user-vet',
    profile: { name: 'Dr. Camille Petit', bio: 'Large animal veterinarian with a practice serving horse farms and cattle ranches in rural Montana.', interests: ['equine medicine', 'livestock health', 'rural veterinary care', 'animal welfare'], skills: ['equine surgery', 'herd health management', 'diagnostics', 'farm calls'], context: 'Looking to expand the practice and hire an associate veterinarian.' },
    intents: [{ intentId: 'c-12', payload: 'Seeking an experienced equine or large animal veterinarian to join a rural Montana practice as an associate.' }],
    networkId: 'idx-ai-founders', ragScore: 6, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-travel-blogger',
    profile: { name: 'Lena Johansson', bio: 'Travel blogger and photographer with 800k followers. Focuses on slow travel and off-the-beaten-path destinations.', interests: ['slow travel', 'travel photography', 'storytelling', 'sustainable tourism'], skills: ['photography', 'content creation', 'SEO', 'brand partnerships', 'video editing'], context: 'Monetizing the blog through a travel planning membership and photography workshops.' },
    intents: [{ intentId: 'c-13', payload: 'Looking for sustainable tour operators in Southeast Asia to partner with for curated itineraries.' }],
    networkId: 'idx-ai-founders', ragScore: 8, matchedVia: 'mirror',
  },
  {
    userId: 'user-novelist',
    profile: { name: 'Rafael Torres', bio: 'Science fiction novelist with four published novels. Two have been optioned for TV adaptation.', interests: ['science fiction', 'speculative fiction', 'screenwriting', 'world-building'], skills: ['fiction writing', 'world-building', 'screenwriting', 'character development'], context: 'Writing a new novel and working with a showrunner on adapting one of his earlier works.' },
    intents: [{ intentId: 'c-14', payload: 'Looking for a literary agent to represent a new science fiction trilogy with cross-media potential.' }],
    networkId: 'idx-ai-founders', ragScore: 7, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-marine-biologist',
    profile: { name: 'Dr. Yuki Hayashi', bio: 'Marine biologist specializing in coral reef ecosystems and climate change impacts. Field research in the Pacific and Indian Oceans.', interests: ['coral reef ecology', 'climate science', 'ocean conservation', 'marine biodiversity'], skills: ['field research', 'dive operations', 'ecological modeling', 'grant writing', 'scientific publishing'], context: 'Leading a 3-year coral restoration project in the Maldives.' },
    intents: [{ intentId: 'c-15', payload: 'Seeking NGO or government partners to fund a coral reef restoration and monitoring program in the Maldives.' }],
    networkId: 'idx-ai-founders', ragScore: 6, matchedVia: 'mirror',
  },
  {
    userId: 'user-sommelier',
    profile: { name: 'Antoine Leclerc', bio: 'Master sommelier and wine educator. Consults for Michelin-starred restaurants and runs private wine education programs.', interests: ['wine', 'viticulture', 'fine dining', 'natural wine'], skills: ['wine pairing', 'cellar management', 'sensory evaluation', 'wine education'], context: 'Launching a premium online wine education platform for enthusiasts and professionals.' },
    intents: [{ intentId: 'c-16', payload: 'Seeking a technology partner to build a subscription-based wine education and tasting platform.' }],
    networkId: 'idx-ai-founders', ragScore: 10, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-film-director',
    profile: { name: 'Nia Okonkwo', bio: 'Independent film director known for documentary and narrative films exploring African diaspora identity. Sundance alum.', interests: ['filmmaking', 'documentary', 'African diaspora', 'visual storytelling'], skills: ['directing', 'screenwriting', 'cinematography', 'post-production', 'festival strategy'], context: 'In pre-production on a feature documentary about Afrobeat music history.' },
    intents: [{ intentId: 'c-17', payload: 'Looking for a music rights clearance attorney and an archival footage researcher for a documentary film project.' }],
    networkId: 'idx-ai-founders', ragScore: 7, matchedVia: 'mirror',
  },
  {
    userId: 'user-landscape-artist',
    profile: { name: 'Chen Wei', bio: 'Landscape painter and installation artist. Work exhibited at galleries in Shanghai, London, and New York.', interests: ['landscape painting', 'installation art', 'ink wash painting', 'nature and memory'], skills: ['oil painting', 'watercolor', 'installation design', 'art residency experience'], context: 'Preparing for a major solo exhibition at a New York gallery.' },
    intents: [{ intentId: 'c-18', payload: 'Seeking a gallery or curator in New York to host a solo exhibition of large-scale landscape paintings.' }],
    networkId: 'idx-ai-founders', ragScore: 5, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-social-worker',
    profile: { name: 'Amina Diallo', bio: 'Licensed clinical social worker specializing in youth homelessness and housing insecurity in Los Angeles.', interests: ['youth homelessness', 'housing policy', 'trauma-informed care', 'community organizing'], skills: ['case management', 'crisis intervention', 'grant writing', 'community outreach'], context: 'Running a transitional housing program for homeless youth and advocating for policy change.' },
    intents: [{ intentId: 'c-19', payload: 'Seeking foundation grants and housing nonprofit partners to expand transitional housing for homeless youth in LA.' }],
    networkId: 'idx-ai-founders', ragScore: 6, matchedVia: 'mirror',
  },
  {
    userId: 'user-sculptor',
    profile: { name: 'Björn Lindqvist', bio: 'Public sculptor working with steel, stone, and reclaimed materials. Commissions for public art installations across Europe.', interests: ['public art', 'sculpture', 'materials science', 'urban environments'], skills: ['metalworking', 'stone carving', 'installation logistics', 'public art procurement'], context: 'Bidding for a major public art commission in Stockholm city center.' },
    intents: [{ intentId: 'c-20', payload: 'Looking for a structural engineering collaborator for a large-scale outdoor steel sculpture installation.' }],
    networkId: 'idx-ai-founders', ragScore: 5, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-personal-trainer',
    profile: { name: 'Darius King', bio: 'Elite personal trainer and sports performance coach. Works with professional athletes and high-performance executives.', interests: ['strength training', 'sports performance', 'nutrition', 'biohacking'], skills: ['strength and conditioning', 'movement assessment', 'nutrition planning', 'athletic coaching'], context: 'Launching an online performance coaching program for remote clients.' },
    intents: [{ intentId: 'c-21', payload: 'Seeking a sports app development partner to build a customizable training plan and tracking platform.' }],
    networkId: 'idx-ai-founders', ragScore: 9, matchedVia: 'mirror',
  },
  {
    userId: 'user-dentist',
    profile: { name: 'Dr. Rosa Fuentes', bio: 'Orthodontist and dental practice owner in Austin. Specializes in clear aligner treatment and pediatric orthodontics.', interests: ['orthodontics', 'dental technology', 'clear aligners', 'practice management'], skills: ['orthodontic treatment', 'clear aligners', 'dental imaging', 'practice management'], context: 'Expanding the practice to a second location and adopting digital orthodontics workflow.' },
    intents: [{ intentId: 'c-22', payload: 'Looking for dental technology vendors offering 3D printing and digital workflow solutions for an orthodontic practice.' }],
    networkId: 'idx-ai-founders', ragScore: 7, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-watchmaker',
    profile: { name: 'Hans Müller', bio: 'Master watchmaker and horologist. Restores and manufactures bespoke mechanical watches in Geneva.', interests: ['watchmaking', 'horology', 'mechanical engineering', 'Swiss watch craft'], skills: ['movement repair', 'case finishing', 'escapement adjustment', 'bespoke watch design'], context: 'Taking commissions for bespoke timepieces and restoring vintage movements.' },
    intents: [{ intentId: 'c-23', payload: 'Seeking collectors and luxury boutiques interested in commissioning bespoke mechanical watches.' }],
    networkId: 'idx-ai-founders', ragScore: 4, matchedVia: 'mirror',
  },
  {
    userId: 'user-firefighter',
    profile: { name: 'Carlos Mendez', bio: 'Firefighter and paramedic with 15 years of service in Phoenix. Volunteer wildfire response team leader.', interests: ['firefighting', 'emergency medicine', 'wildfire prevention', 'community safety'], skills: ['emergency response', 'paramedic care', 'wildfire tactics', 'team leadership', 'rescue operations'], context: 'Advocating for better wildfire preparedness resources for rural communities.' },
    intents: [{ intentId: 'c-24', payload: 'Looking for government agencies or nonprofits to fund wildfire preparedness training programs for rural communities.' }],
    networkId: 'idx-ai-founders', ragScore: 5, matchedVia: 'reciprocal',
  },
  {
    userId: 'user-fashion-designer',
    profile: { name: 'Isabelle Fontaine', bio: 'Haute couture fashion designer based in Paris. Known for sustainable luxury womenswear and collaborations with textile artisans.', interests: ['sustainable fashion', 'haute couture', 'textile craftsmanship', 'circular fashion'], skills: ['pattern making', 'garment construction', 'textile sourcing', 'runway production', 'brand building'], context: 'Launching a new sustainable luxury line and seeking retail distribution in Asia.' },
    intents: [{ intentId: 'c-25', payload: 'Seeking luxury retail partners and department stores in Japan and South Korea to carry a sustainable haute couture line.' }],
    networkId: 'idx-ai-founders', ragScore: 5, matchedVia: 'mirror',
  },
];

const resultSchema = z.object({
  opportunities: z.array(z.object({
    reasoning: z.string(),
    score: z.number(),
    candidateUserId: z.string(),
  })),
  durationMs: z.number(),
});

const verificationCriteria =
  'The discoverer is an AI/ML startup founder seeking a technical co-founder with LLM expertise. ' +
  'All 25 candidates are from completely unrelated domains (chef, yoga instructor, jazz musician, real estate agent, therapist, farmer, journalist, nurse, immigration lawyer, architect, teacher, veterinarian, travel blogger, novelist, marine biologist, sommelier, film director, landscape artist, social worker, sculptor, personal trainer, dentist, watchmaker, firefighter, fashion designer). ' +
  'PASS criteria: the opportunities list must be EMPTY or contain only results with score < 30. ' +
  'None of these candidates have any AI/ML engineering background, software development skills, or startup co-founder intent that matches what the discoverer seeks. ' +
  'FAIL if any candidate scores >= 50. Any match found is a false positive — the evaluator hallucinated relevance where none exists.';

async function runBundleEval(): Promise<{ opportunities: Array<{ reasoning: string; score: number; candidateUserId: string }>; durationMs: number }> {
  const evaluator = new OpportunityEvaluator();
  const input: EvaluatorInput = {
    discovererId: DISCOVERER_ID,
    entities: [sourceEntity, ...candidates],
  };
  const start = Date.now();
  const raw = await evaluator.invokeEntityBundle(input, { minScore: 50 });
  const durationMs = Date.now() - start;
  const opportunities = raw.map(op => {
    const candidate = op.actors.find(a => a.userId !== DISCOVERER_ID);
    return { reasoning: op.reasoning, score: op.score, candidateUserId: candidate?.userId ?? '' };
  });
  return { opportunities, durationMs };
}

async function runParallelEval(): Promise<{ opportunities: Array<{ reasoning: string; score: number; candidateUserId: string }>; durationMs: number }> {
  const evaluator = new OpportunityEvaluator();
  const start = Date.now();
  const parallelResults = await Promise.all(
    candidates.map(candidate => {
      const input: EvaluatorInput = {
        discovererId: DISCOVERER_ID,
        entities: [sourceEntity, candidate],
      };
      return evaluator.invokeEntityBundle(input, { minScore: 50 })
        .catch(() => [] as Awaited<ReturnType<typeof evaluator.invokeEntityBundle>>);
    })
  );
  const durationMs = Date.now() - start;
  const opportunities = parallelResults.flat().map(op => {
    const candidate = op.actors.find(a => a.userId !== DISCOVERER_ID);
    return { reasoning: op.reasoning, score: op.score, candidateUserId: candidate?.userId ?? '' };
  });
  return { opportunities, durationMs };
}

describe('OpportunityEvaluator: stress test — unrelated candidates (Smartest)', () => {
  it('bundle mode returns no matches for fully unrelated candidates', async () => {
    const { opportunities, durationMs } = await runBundleEval();

    console.log(`\n[Bundle] duration=${durationMs}ms, results=${opportunities.length}`);
    for (const o of [...opportunities].sort((a, b) => b.score - a.score)) {
      console.log(`  score=${o.score}  ${o.candidateUserId}  "${o.reasoning.slice(0, 80)}..."`);
    }

    const result = await runScenario(
      defineScenario({
        name: 'opportunity-evaluator-bundle-stress',
        description: 'Bundle stress test: 25 fully unrelated candidates (chef, musician, farmer, etc). Evaluator must return zero matches.',
        fixtures: { opportunities, durationMs },
        sut: {
          type: 'agent',
          factory: () => null,
          invoke: async (_instance, resolvedInput) => resolvedInput,
          input: { opportunities: '@fixtures.opportunities', durationMs: '@fixtures.durationMs' },
        },
        verification: {
          schema: resultSchema,
          criteria: verificationCriteria,
          llmVerify: true,
        },
      })
    );

    expectSmartest(result);
  }, 180000);

  it('parallel mode returns no matches for fully unrelated candidates', async () => {
    const { opportunities, durationMs } = await runParallelEval();

    console.log(`\n[Parallel] duration=${durationMs}ms, results=${opportunities.length}`);
    for (const o of [...opportunities].sort((a, b) => b.score - a.score)) {
      console.log(`  score=${o.score}  ${o.candidateUserId}  "${o.reasoning.slice(0, 80)}..."`);
    }

    const result = await runScenario(
      defineScenario({
        name: 'opportunity-evaluator-parallel-stress',
        description: 'Parallel stress test: 25 fully unrelated candidates (chef, musician, farmer, etc). Evaluator must return zero matches.',
        fixtures: { opportunities, durationMs },
        sut: {
          type: 'agent',
          factory: () => null,
          invoke: async (_instance, resolvedInput) => resolvedInput,
          input: { opportunities: '@fixtures.opportunities', durationMs: '@fixtures.durationMs' },
        },
        verification: {
          schema: resultSchema,
          criteria: verificationCriteria,
          llmVerify: true,
        },
      })
    );

    expectSmartest(result);
  }, 180000);
});
