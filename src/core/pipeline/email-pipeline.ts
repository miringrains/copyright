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
      'One specific tip or trick about the product',
      'A detail most people don\'t know',
      'How to use something better',
      'Common mistake to avoid',
    ],
    job: 'Make them feel smart for signing up by giving ONE immediately useful thing',
    beats: [
      { name: 'confirm', instruction: 'Confirm they signed up. 3-5 words max. No enthusiasm.', max_words: 8 },
      { name: 'value', instruction: 'Give them ONE useful tip or fact. Specific. Actionable.', max_words: 40 },
      { name: 'signoff', instruction: 'Just the sender name. Nothing else.', max_words: 5 },
    ],
    example: `You're on the list.

Most people wipe too fast. Let cleaning spray sit for 30 seconds—the surfactants need time to break down grease. Try it on your stovetop.

G's Cleaning`,
    never: [
      'Welcome to the family',
      'We\'re thrilled/excited',
      'Explore our products',
      'Your journey begins',
      'List of features',
      'Brand introduction',
      'Multiple things to do',
    ],
    always: [
      'One specific fact they can use TODAY',
      'Something that makes them feel like an insider',
      'Sign off with just the name',
    ],
  },

  abandoned_cart: {
    hunt_for: [
      'Return policy or guarantee',
      'Shipping cost or free shipping threshold',
      'Product durability or quality detail',
      'Answer to common hesitation',
    ],
    job: 'Address the ONE thing that made them hesitate, not remind them of the cart',
    beats: [
      { name: 'acknowledge', instruction: 'Acknowledge they left something. No guilt. State what.', max_words: 12 },
      { name: 'objection', instruction: 'Address ONE hesitation: shipping, returns, quality, or fit.', max_words: 35 },
      { name: 'path', instruction: 'Simple way to complete. Link + name.', max_words: 10 },
    ],
    example: `You left the leather conditioner in your cart.

If you're wondering about the finish—it absorbs completely. No greasy residue. If you don't like it, returns are free for 30 days.

gscleaningnyc.com/cart — G's Cleaning`,
    never: [
      'Your cart misses you',
      'Don\'t forget',
      'Limited time',
      'Hurry',
      'Still thinking about it',
      'Running low on stock',
      'Guilt language',
    ],
    always: [
      'Name the specific product they left',
      'Address a real concern (shipping, returns, quality)',
      'Make returning to cart easy',
    ],
  },

  nurture: {
    hunt_for: [
      'How-to information or technique',
      'Common mistake people make',
      'Why something works the way it does',
      'Insider tip from the company',
    ],
    job: 'Teach them ONE thing that makes them better at something—product mention optional',
    beats: [
      { name: 'hook', instruction: 'Observation or counterintuitive statement. Not a question.', max_words: 15 },
      { name: 'teach', instruction: 'The actual insight. Specific technique or fact. Why it works.', max_words: 50 },
      { name: 'signoff', instruction: 'Just the name. Optional: one-line product tie if natural.', max_words: 15 },
    ],
    example: `Most people clean windows in direct sunlight. That's backwards.

Sun heats the glass, solution evaporates before you can wipe, leaves streaks. Clean when it's cloudy or the window's in shade. Start from the top, horizontal strokes.

G's Cleaning`,
    never: [
      'Did you know',
      'Fun fact',
      'Studies show',
      'Experts agree',
      'As a valued customer',
      'Heavy product pitch',
    ],
    always: [
      'Actually teach something useful',
      'Be specific—what, how, why',
      'Reader should feel smarter after reading',
    ],
  },

  launch: {
    hunt_for: [
      'New product name',
      'What makes it different from existing products',
      'Key benefit in specific terms',
      'When/where available',
    ],
    job: 'Tell them what\'s new and the ONE reason they should care',
    beats: [
      { name: 'announce', instruction: 'What\'s new. Product name first. Direct.', max_words: 10 },
      { name: 'why', instruction: 'ONE specific reason this matters to them. Not a feature list.', max_words: 35 },
      { name: 'get', instruction: 'Where to get it. Link + name.', max_words: 12 },
    ],
    example: `Leather conditioner is here.

Most conditioners leave a film. This one absorbs in 2 minutes, no buffing needed. Your jacket feels like leather, not plastic.

Available at gscleaningnyc.com — G's Cleaning`,
    never: [
      'We\'re excited to announce',
      'The wait is over',
      'Revolutionary',
      'Game-changing',
      'Feature list',
      'Multiple products at once',
    ],
    always: [
      'Lead with the product name',
      'One specific differentiator',
      'Clear path to purchase',
    ],
  },

  reengagement: {
    hunt_for: [
      'New product added since they left',
      'Something that changed or improved',
      'Seasonal relevance',
      'One compelling reason to return',
    ],
    job: 'Give them ONE concrete reason to come back—not guilt them',
    beats: [
      { name: 'time', instruction: 'Acknowledge time passed. Brief. No guilt.', max_words: 8 },
      { name: 'reason', instruction: 'ONE thing that\'s new or different. Specific.', max_words: 35 },
      { name: 'action', instruction: 'Low-friction next step. Link + name.', max_words: 12 },
    ],
    example: `It's been a while.

We added a wood polish that doesn't smell like a chemical factory. Cedar and lemon. Works on antiques without stripping the finish.

Take a look: gscleaningnyc.com — G's Cleaning`,
    never: [
      'We miss you',
      'Where have you been',
      'Is this goodbye',
      'Last chance',
      'We noticed you haven\'t',
      'Desperate discounts',
    ],
    always: [
      'Give a real reason to return',
      'Something new or changed',
      'Keep it short—they\'re already disengaged',
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
    system: `You find specific, credible insights from website content.

WHAT TO HUNT FOR:
${config.hunt_for.map(h => `- ${h}`).join('\n')}

REQUIREMENTS FOR EACH CANDIDATE:
1. Must come from something ACTUALLY on the website (quote the source)
2. Must include a specific mechanism, number, or technical detail
3. Must be something an industry insider would share, not obvious advice

DO NOT generate candidates that:
- Could apply to any product in this category
- State the obvious
- Sound like generic marketing advice
- Would make an expert roll their eyes

Generate 3 candidates, best first. If the website doesn't have good material, say so in the mechanism field.`,
    prompt: `Find 3 candidate insights for a ${input.emailType} email.

COMPANY: ${input.companyName}
WEBSITE CONTENT:
${input.websiteContent.slice(0, 12000)}

Extract specific facts. Include where you found each one.`,
  })
  return result.object.candidates
}

async function filterCandidates(candidates: { fact: string; source: string; mechanism: string; angle: string }[], input: EmailInput) {
  const candidatesList = candidates
    .map((c, i) => `${i}. "${c.fact}" (mechanism: ${c.mechanism})`)
    .join('\n')

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: QualityCheckSchema,
    system: `You evaluate whether marketing copy ideas sound stupid or smart.

A candidate FAILS if:
- It states something obvious that anyone would know
- It sounds condescending or patronizing
- It would make a professional in the industry cringe
- It has no specific mechanism/number (vague advice)
- It sounds like generic AI-generated content
- A normal person reading it would think "no shit" or "that's dumb"

A candidate PASSES if:
- It shares genuine insider knowledge
- It has a specific, credible mechanism or number
- It would make someone think "huh, I didn't know that"
- An expert would nod and agree

Be harsh. Most candidates should fail. Only pass genuinely good ones.`,
    prompt: `Evaluate these candidates for a ${input.emailType} email for ${input.companyName}:

${candidatesList}

Check each one. Pick the best passing candidate, or -1 if they all fail.`,
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

