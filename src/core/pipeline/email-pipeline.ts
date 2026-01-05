/**
 * Email Pipeline V3
 * 
 * 4 phases, no creativity:
 * 1. SCRAPE - Get website content
 * 2. OUTLINE - Pick topic + create skeleton
 * 3. WRITE - Fill skeleton with content
 * 4. POLISH - Mechanical fixes
 */

import { generateObject, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// ============================================================================
// TYPES
// ============================================================================

export type EmailType = 'welcome' | 'abandoned_cart' | 'nurture' | 'launch' | 'reengagement'

export interface EmailInput {
  websiteContent: string
  emailType: EmailType
  companyName: string
  senderName: string
  productOrTopic?: string
}


export interface EmailOutput {
  subject: string
  body: string
  shorter: string
  warmer: string
}

// ============================================================================
// EMAIL TYPE DEFINITIONS
// ============================================================================

interface EmailTypeConfig {
  // What we're looking for on the website
  hunt_for: string[]
  // The ONE job this email must do
  job: string
  // Structure with specific beats
  beats: {
    name: string
    instruction: string
    max_words: number
  }[]
  // Example of good output
  example: string
  // Hard rules
  never: string[]
  always: string[]
}

const EMAIL_CONFIGS: Record<EmailType, EmailTypeConfig> = {
  welcome: {
    hunt_for: [
      'Core value proposition - why this company exists',
      'What makes their products different from competitors',
      'A simple, useful tip about the product category (not clinical)',
      'Social proof or customer love if available',
    ],
    job: 'Make them feel good about signing up and set expectations - warm, brief, genuine',
    beats: [
      { name: 'confirm', instruction: 'Confirm they signed up. Brief and warm, not corporate.', max_words: 10 },
      { name: 'value', instruction: 'Why they\'ll like being on this list OR one genuinely useful thing. Relatable.', max_words: 35 },
      { name: 'signoff', instruction: 'Just the sender name.', max_words: 5 },
    ],
    example: `You're in.

We make cleaning products you'll actually want to use. No harsh chemicals, no weird residue, just stuff that works. First email with something useful coming soon.

G's Cleaning`,
    never: [
      'Welcome to the family',
      'We\'re thrilled/excited',
      'Explore our products',
      'Your journey begins',
      'List of features',
      'Brand introduction',
      'Multiple things to do',
      'Clinical or technical facts',
      'Anything condescending',
    ],
    always: [
      'Sound like a person, not a company',
      'Set expectations or give a reason they\'ll like being subscribed',
      'Keep it brief - they just signed up, don\'t overwhelm',
    ],
  },

  abandoned_cart: {
    hunt_for: [
      'Core value proposition / what makes them different',
      'Social proof (customer reviews, testimonials, number of customers)',
      'Key benefit that competitors don\'t offer',
      'Return policy or guarantee (as reassurance, not main pitch)',
    ],
    job: 'Give them a genuine, non-pushy reason to give it a shot - focus on value, not gimmicks',
    beats: [
      { name: 'invite', instruction: 'Warm invitation to try it. No guilt. Customer-focused.', max_words: 15 },
      { name: 'value', instruction: 'The real reason to buy - USP or social proof. Relatable, not clinical.', max_words: 30 },
      { name: 'path', instruction: 'Simple link + name.', max_words: 10 },
    ],
    example: `We'd love for you to give G's Cleaning a shot.

Many of our customers have permanently switched from chemical-heavy brands. Gentle on surfaces, tough on grime, and you'll actually want to use it.

gscleaningnyc.com/cart — G's Cleaning`,
    never: [
      'Your cart misses you',
      'Don\'t forget',
      'Limited time',
      'Hurry',
      'Still thinking about it',
      'Running low on stock',
      'Guilt language',
      'Weird specific facts about the founder',
      'Clinical/technical mechanisms',
      'Anything that sounds like a gimmick',
    ],
    always: [
      'Focus on value to the customer, not company facts',
      'Use social proof if available (other customers)',
      'State the core benefit simply',
      'Sound like a human invitation, not a sales pitch',
    ],
  },

  nurture: {
    hunt_for: [
      'Practical tip related to their product category',
      'Common problem their customers face',
      'Simple advice that\'s actually helpful',
      'Something that positions them as knowledgeable, not salesy',
    ],
    job: 'Be genuinely helpful - share something useful that builds trust',
    beats: [
      { name: 'hook', instruction: 'A relatable observation or common problem. Conversational.', max_words: 15 },
      { name: 'help', instruction: 'Actually useful advice. Simple, practical, not clinical.', max_words: 45 },
      { name: 'signoff', instruction: 'Just the name. Maybe a soft product mention if natural.', max_words: 15 },
    ],
    example: `Quick tip if you clean a lot.

Spray and wait 20-30 seconds before wiping. Gives the cleaner time to actually break things down instead of just pushing grime around. Works especially well on stovetops.

G's Cleaning`,
    never: [
      'Did you know',
      'Fun fact',
      'Studies show',
      'Experts agree',
      'As a valued customer',
      'Heavy product pitch',
      'Overly technical explanations',
      'Condescending tone',
    ],
    always: [
      'Sound like helpful advice from a friend',
      'Keep it practical and actionable',
      'Don\'t oversell - just be useful',
    ],
  },

  launch: {
    hunt_for: [
      'What the new product/feature is',
      'The main benefit for customers',
      'What problem it solves',
      'When/where available',
    ],
    job: 'Announce what\'s new and why they\'d want it - direct, not hype-y',
    beats: [
      { name: 'announce', instruction: 'What\'s new. Clear and direct.', max_words: 12 },
      { name: 'benefit', instruction: 'Why they\'d want it. Focus on their life, not product features.', max_words: 30 },
      { name: 'get', instruction: 'Where to get it. Link + name.', max_words: 12 },
    ],
    example: `We just added a leather conditioner.

If you've got leather furniture, jackets, or car seats, this keeps them soft without leaving that greasy film most conditioners leave.

Check it out: gscleaningnyc.com — G's Cleaning`,
    never: [
      'We\'re excited to announce',
      'The wait is over',
      'Revolutionary',
      'Game-changing',
      'Feature list',
      'Multiple products at once',
      'Hype language',
    ],
    always: [
      'Be direct about what\'s new',
      'Focus on benefit to their life',
      'Make it easy to check out',
    ],
  },

  reengagement: {
    hunt_for: [
      'What\'s new or improved since they last visited',
      'New products or features',
      'Reason they might want to come back',
      'Value proposition reminder',
    ],
    job: 'Give them a reason to check back in - no guilt, just value',
    beats: [
      { name: 'check_in', instruction: 'Casual acknowledgment. No guilt or desperation.', max_words: 10 },
      { name: 'reason', instruction: 'What\'s new or why they might want to come back. Genuine.', max_words: 30 },
      { name: 'action', instruction: 'Simple link. Low pressure.', max_words: 12 },
    ],
    example: `Hey, quick update.

We've added a few new products since you last checked in, including a wood polish that actually smells good (cedar and lemon, not chemicals).

If you're curious: gscleaningnyc.com — G's Cleaning`,
    never: [
      'We miss you',
      'Where have you been',
      'Is this goodbye',
      'Last chance',
      'We noticed you haven\'t',
      'Desperate discounts',
      'Guilt language',
    ],
    always: [
      'Sound casual, not desperate',
      'Give a genuine reason to return',
      'Keep it low pressure',
    ],
  },
}

// ============================================================================
// PHASE 2: OUTLINE (with internal quality filter)
// ============================================================================

// Step 1: Generate candidate insights
const CandidatesSchema = z.object({
  candidates: z.array(z.object({
    fact: z.string().describe('A specific fact/tip from the website'),
    source: z.string().describe('Where on the website this came from (product page, FAQ, etc)'),
    mechanism: z.string().describe('The technical reason or number that makes this credible'),
    angle: z.string().describe('How we\'d present this'),
  })).describe('3 candidate insights ranked by quality'),
})

// Step 2: Quality filter
const QualityCheckSchema = z.object({
  evaluations: z.array(z.object({
    candidate_index: z.number(),
    passes: z.boolean(),
    issue: z.string().describe('If fails, what\'s wrong with it'),
  })),
  best_index: z.number().describe('Index of the best passing candidate, or -1 if all fail'),
  reasoning: z.string().describe('Why this one is best'),
})

// Final outline
const OutlineSchema = z.object({
  extracted_fact: z.string().describe('The ONE specific fact/tip/detail from the website we\'re using'),
  beats: z.array(z.object({
    name: z.string(),
    content: z.string(),
    word_count: z.number(),
  })),
  topic: z.string().describe('Brief topic summary (5 words max)'),
  angle: z.string().describe('The angle/insight (10 words max)'),
})

export type EmailOutlineResult = z.infer<typeof OutlineSchema>

async function generateCandidates(input: EmailInput, config: EmailTypeConfig) {
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: CandidatesSchema,
    system: `You find compelling angles for email copy from website content.

WHAT TO HUNT FOR:
${config.hunt_for.map(h => `- ${h}`).join('\n')}

REQUIREMENTS FOR EACH CANDIDATE:
1. Must be grounded in what the company ACTUALLY offers (from the website)
2. Must be relatable to a normal customer - not clinical or weird
3. Should focus on VALUE TO THE CUSTOMER, not company facts
4. Social proof is good if available (customers, reviews, etc.)

DO NOT generate candidates that:
- Sound clinical or technical in a weird way
- Focus on the founder/company instead of the customer
- Would make someone think "that's a weird thing to say"
- Are overly specific in a way that feels forced

Generate 3 candidates, best first. Focus on genuine value propositions.`,
    prompt: `Find 3 angles for a ${input.emailType} email.

COMPANY: ${input.companyName}
WEBSITE CONTENT:
${input.websiteContent.slice(0, 12000)}

Extract genuine value propositions. Think: what would make a customer nod and say "yeah, that's why I'd buy this"?`,
  })
  return result.object.candidates
}

async function filterCandidates(candidates: { fact: string; source: string; mechanism: string; angle: string }[], input: EmailInput) {
  const candidatesList = candidates
    .map((c, i) => `${i}. "${c.angle}" — based on: "${c.fact}"`)
    .join('\n')

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: QualityCheckSchema,
    system: `You evaluate whether email copy angles sound natural and relatable.

A candidate FAILS if:
- It sounds weird or off-putting to read as a customer
- It's about the company/founder when it should be about the customer
- It makes claims that feel forced or gimmicky
- It's clinical or technical in a way normal people don't talk
- A customer would think "that's a strange thing to say in an email"

A candidate PASSES if:
- It sounds like something a real company would naturally say
- It focuses on value to the customer
- It's relatable - you could imagine receiving this email
- It uses social proof or genuine benefits, not gimmicks

Think: "Would I find this email weird if I received it?" If yes, fail it.`,
    prompt: `Evaluate these email angles for ${input.companyName}:

${candidatesList}

Pick the most natural, relatable one. Fail anything that sounds off.`,
  })
  return result.object
}

export async function createOutline(input: EmailInput): Promise<EmailOutlineResult> {
  const config = EMAIL_CONFIGS[input.emailType]
  
  // Step 1: Generate candidates
  const candidates = await generateCandidates(input, config)
  
  // Step 2: Filter for quality
  const quality = await filterCandidates(candidates, input)
  
  // Step 3: Build outline with best candidate (or fallback)
  let selectedFact: string
  let selectedAngle: string
  
  if (quality.best_index >= 0 && quality.best_index < candidates.length) {
    const best = candidates[quality.best_index]
    selectedFact = best.fact
    selectedAngle = best.angle
  } else {
    // All failed - use minimal approach (just confirm signup, no tip)
    selectedFact = 'No specific insight available'
    selectedAngle = 'Simple confirmation'
  }
  
  // Step 4: Generate beats with selected insight
  const beatsInstruction = config.beats
    .map((b, i) => `${i + 1}. ${b.name.toUpperCase()} (max ${b.max_words} words): ${b.instruction}`)
    .join('\n')

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: OutlineSchema,
    system: `You create email outlines by filling in specific beats.

THE JOB OF THIS EMAIL:
${config.job}

BEATS TO FILL (in order):
${beatsInstruction}

NEVER USE:
${config.never.map(n => `- "${n}"`).join('\n')}

ALWAYS:
${config.always.map(a => `- ${a}`).join('\n')}

EXAMPLE OF GOOD OUTPUT:
${config.example}

${quality.best_index < 0 ? 'NOTE: No good insight found. Keep the email minimal - just confirm and sign off. Skip the value beat or make it very brief.' : ''}`,
    
    prompt: `Create a ${input.emailType} email outline.

COMPANY: ${input.companyName}
SENDER: ${input.senderName}

USE THIS INSIGHT: "${selectedFact}"
ANGLE: "${selectedAngle}"

Fill each beat. Use the insight above as your main content.`,
  })
  
  return result.object
}

// ============================================================================
// PHASE 3: WRITE
// ============================================================================

const EmailOutputSchema = z.object({
  subject: z.string().describe('Email subject line - short, specific, no clickbait'),
  body: z.string().describe('Complete email body'),
})

export async function writeEmail(
  outline: EmailOutlineResult,
  input: EmailInput
): Promise<{ subject: string; body: string }> {
  const config = EMAIL_CONFIGS[input.emailType]
  
  // Assemble the beats into the email structure
  const beatsContent = outline.beats
    .map(b => `${b.name.toUpperCase()}: "${b.content}"`)
    .join('\n')

  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: EmailOutputSchema,
    system: `You assemble emails from pre-written beats. Your job is to format them properly, not rewrite them.

THE JOB OF THIS EMAIL:
${config.job}

EXAMPLE OF GOOD OUTPUT:
${config.example}

NEVER USE:
${config.never.map(n => `- "${n}"`).join('\n')}

FORMATTING RULES:
- Use the beat content as-is, just format into paragraphs
- Add line breaks between beats
- NO em dashes (—), use commas instead
- NO exclamation marks
- Sign off with just: ${input.senderName}
- Subject line: short (3-6 words), specific to the content, no clickbait`,

    prompt: `Assemble this ${input.emailType} email from the beats below.

BEATS (use these exactly, just format them):
${beatsContent}

FACT BEING USED: ${outline.extracted_fact}

Format into a clean email. Don't add content. Don't embellish.
Subject line should reference the specific topic: "${outline.topic}"`,
  })
  
  return result.object
}

// ============================================================================
// PHASE 4: POLISH
// ============================================================================

export function polishEmail(email: string): string {
  let polished = email
  
  // Replace em dashes with commas or periods
  polished = polished.replace(/\s*—\s*/g, ', ')
  polished = polished.replace(/\s*–\s*/g, ', ')
  polished = polished.replace(/\s*--\s*/g, ', ')
  
  // Fix double commas
  polished = polished.replace(/,\s*,/g, ',')
  
  // Fix comma before period
  polished = polished.replace(/,\s*\./g, '.')
  
  // Reduce multiple exclamation marks
  polished = polished.replace(/!+/g, '.')
  
  // Remove "Best," "Warm regards," etc if present
  polished = polished.replace(/\n(Best|Warm regards|Kind regards|Sincerely|Cheers),?\n/gi, '\n')
  
  // Remove "The X Team" patterns
  polished = polished.replace(/\nThe .+ Team\n?$/i, '')
  polished = polished.replace(/\n- The .+ Team\n?$/i, '')
  
  return polished.trim()
}

// ============================================================================
// VARIANTS
// ============================================================================

const VariantsSchema = z.object({
  shorter: z.string().describe('Same message in fewer words'),
  warmer: z.string().describe('Same message, slightly more casual/personal'),
  subjects: z.array(z.string()).describe('3 subject line options'),
})

export async function createVariants(
  mainEmail: string,
  input: EmailInput
): Promise<{ shorter: string; warmer: string; subjects: string[] }> {
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: VariantsSchema,
    prompt: `Create variants of this email.

ORIGINAL:
${mainEmail}

Create:
1. SHORTER: Same message, fewer words. Cut anything non-essential.
2. WARMER: Same message, slightly more casual. Like texting a friendly acquaintance.
3. SUBJECTS: 3 subject line options. Short, specific, no clickbait.

Keep the same facts and structure. Just adjust length/tone.`,
  })
  
  return {
    shorter: polishEmail(result.object.shorter),
    warmer: polishEmail(result.object.warmer),
    subjects: result.object.subjects,
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export interface PipelineResult {
  outline: {
    topic: string
    angle: string
    extracted_fact: string
    facts_used: string[]
  }
  email: EmailOutput
  phases: {
    outline: number
    write: number
    variants: number
  }
}

export async function runEmailPipeline(input: EmailInput): Promise<PipelineResult> {
  const startOutline = Date.now()
  
  // Phase 2: Create outline with beats
  const outline = await createOutline(input)
  const outlineTime = Date.now() - startOutline
  
  // Phase 3: Write email from beats
  const startWrite = Date.now()
  const { subject, body } = await writeEmail(outline, input)
  const polishedBody = polishEmail(body)
  const writeTime = Date.now() - startWrite
  
  // Phase 4: Create variants
  const startVariants = Date.now()
  const variants = await createVariants(polishedBody, input)
  const variantsTime = Date.now() - startVariants
  
  return {
    outline: {
      topic: outline.topic,
      angle: outline.angle,
      extracted_fact: outline.extracted_fact,
      facts_used: [outline.extracted_fact],
    },
    email: {
      subject,
      body: polishedBody,
      shorter: variants.shorter,
      warmer: variants.warmer,
    },
    phases: {
      outline: outlineTime,
      write: writeTime,
      variants: variantsTime,
    },
  }
}

