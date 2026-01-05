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

export interface EmailOutline {
  topic: string
  angle: string
  structure: {
    opener: string
    body: string
    closer: string
  }
  facts_to_use: string[]
}

export interface EmailOutput {
  subject: string
  body: string
  shorter: string
  warmer: string
}

// ============================================================================
// EMAIL TYPE TEMPLATES
// ============================================================================

const EMAIL_TEMPLATES: Record<EmailType, {
  structure: string
  example: string
  rules: string[]
}> = {
  welcome: {
    structure: `
OPENER (1 sentence): Confirm signup. No enthusiasm. Just acknowledge.
BODY (2-3 sentences): ONE useful tip or fact from the website. Something they can use.
CLOSER (1 sentence): Simple sign-off with sender name.`,
    example: `
You're on the list.

Here's something most people don't know: [SPECIFIC TIP FROM WEBSITE].

[SENDER NAME]`,
    rules: [
      'DO NOT say "welcome to the family" or "we\'re excited"',
      'DO NOT list multiple products or features',
      'DO NOT ask them to "explore" or "discover"',
      'DO include one specific, useful fact',
      'DO sign off with just the name, no "team" or "family"',
    ],
  },
  
  abandoned_cart: {
    structure: `
OPENER (1 sentence): Acknowledge they left something. No guilt.
BODY (2-3 sentences): Address ONE reason they might have hesitated. Use specific product detail.
CLOSER (1 sentence): Simple path to complete purchase.`,
    example: `
You left [PRODUCT] in your cart.

If you're wondering about [SPECIFIC CONCERN], here's the thing: [SPECIFIC FACT OR GUARANTEE].

[LINK TO CART] - [SENDER NAME]`,
    rules: [
      'DO NOT say "your cart misses you" or "don\'t forget"',
      'DO NOT create urgency with "limited time" or "hurry"',
      'DO NOT guilt trip',
      'DO address a real hesitation (shipping, quality, fit)',
      'DO include specific product detail from website',
    ],
  },
  
  nurture: {
    structure: `
OPENER (1 sentence): Interesting observation or question.
BODY (3-4 sentences): Teach ONE thing. Use specific fact/process from website.
CLOSER (1 sentence): Soft connection to product OR just sign-off.`,
    example: `
Most people use [PRODUCT TYPE] wrong.

The trick is [SPECIFIC TECHNIQUE]. [WHY IT WORKS]. [WHAT HAPPENS WHEN YOU DO IT RIGHT].

[SENDER NAME]`,
    rules: [
      'DO NOT say "did you know" or "fun fact"',
      'DO NOT cite vague "studies show" or "experts say"',
      'DO include specific, actionable information',
      'DO make the reader feel smarter after reading',
      'DO keep product mention minimal or absent',
    ],
  },
  
  launch: {
    structure: `
OPENER (1 sentence): What's new. Direct.
BODY (2-3 sentences): Why it matters. ONE key benefit with specific detail.
CLOSER (1 sentence): Where to get it.`,
    example: `
[NEW PRODUCT] is here.

[WHY IT'S DIFFERENT - SPECIFIC DETAIL]. [WHAT IT DOES FOR THEM].

Available now at [LINK]. - [SENDER NAME]`,
    rules: [
      'DO NOT say "we\'re excited to announce" or "the wait is over"',
      'DO NOT list multiple features',
      'DO NOT use "revolutionary" or "game-changing"',
      'DO lead with the product name',
      'DO include one specific differentiator',
    ],
  },
  
  reengagement: {
    structure: `
OPENER (1 sentence): Acknowledge time has passed. No guilt.
BODY (2-3 sentences): ONE reason to come back. Something new or different.
CLOSER (1 sentence): Simple action.`,
    example: `
It's been a while.

Since you were last here, [WHAT'S CHANGED]. [WHY IT MIGHT INTEREST THEM NOW].

[LINK] - [SENDER NAME]`,
    rules: [
      'DO NOT say "we miss you" or "where have you been"',
      'DO NOT guilt trip about inactivity',
      'DO NOT offer desperate discounts',
      'DO give a concrete reason to return',
      'DO keep it brief - they\'re already disengaged',
    ],
  },
}

// ============================================================================
// PHASE 2: OUTLINE
// ============================================================================

const OutlineSchema = z.object({
  topic: z.string().describe('The ONE specific topic to focus on'),
  angle: z.string().describe('The specific angle or insight to use'),
  opener: z.string().describe('Exact opener sentence'),
  body_points: z.array(z.string()).describe('2-3 specific points for the body'),
  closer: z.string().describe('Exact closer sentence'),
  facts_used: z.array(z.string()).describe('Specific facts from website being used'),
})

export async function createOutline(input: EmailInput): Promise<z.infer<typeof OutlineSchema>> {
  const template = EMAIL_TEMPLATES[input.emailType]
  
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: OutlineSchema,
    system: `You create email outlines. You pick ONE topic and create a specific skeleton.

Return a JSON outline with exact sentences to use. No placeholders like "[PRODUCT]" - use actual content from the website.

Your outline must follow this structure:
${template.structure}

RULES:
${template.rules.map(r => `- ${r}`).join('\n')}`,
    
    prompt: `Create an outline for a ${input.emailType} email.

COMPANY: ${input.companyName}
SENDER: ${input.senderName}
${input.productOrTopic ? `TOPIC/PRODUCT: ${input.productOrTopic}` : ''}

WEBSITE CONTENT (pick ONE specific thing to focus on):
${input.websiteContent.slice(0, 12000)}

Pick the most interesting/useful specific fact from this website for a ${input.emailType} email.
Create an outline with EXACT sentences, not templates.

EXAMPLE OUTPUT STYLE:
${template.example}`,
  })
  
  return result.object
}

// ============================================================================
// PHASE 3: WRITE
// ============================================================================

const EmailOutputSchema = z.object({
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Complete email body'),
})

export async function writeEmail(
  outline: z.infer<typeof OutlineSchema>,
  input: EmailInput
): Promise<{ subject: string; body: string }> {
  const template = EMAIL_TEMPLATES[input.emailType]
  
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: EmailOutputSchema,
    system: `You write emails from outlines. You DO NOT add anything. You ONLY use what's in the outline.

STRUCTURE:
${template.structure}

RULES:
${template.rules.map(r => `- ${r}`).join('\n')}

ADDITIONAL RULES:
- MAX 5 sentences total
- NO em dashes (—)
- NO exclamation marks except maybe one
- NO "we're thrilled/excited/delighted"
- NO "designed with your needs in mind"
- NO "as a valued customer"
- Sign off with just: ${input.senderName}

Return ONLY the email. No explanation.`,

    prompt: `Write the email from this outline.

OUTLINE:
- Topic: ${outline.topic}
- Angle: ${outline.angle}
- Opener: ${outline.opener}
- Body points: ${outline.body_points.join(' | ')}
- Closer: ${outline.closer}
- Facts used: ${outline.facts_used.join(' | ')}

COMPANY: ${input.companyName}
SENDER: ${input.senderName}

Write the complete email. Use the outline exactly. Don't add anything.`,
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
  outline: z.infer<typeof OutlineSchema>
  email: EmailOutput
  phases: {
    outline: number
    write: number
    variants: number
  }
}

export async function runEmailPipeline(input: EmailInput): Promise<PipelineResult> {
  const startOutline = Date.now()
  
  // Phase 2: Create outline
  const outline = await createOutline(input)
  const outlineTime = Date.now() - startOutline
  
  // Phase 3: Write email
  const startWrite = Date.now()
  const { subject, body } = await writeEmail(outline, input)
  const polishedBody = polishEmail(body)
  const writeTime = Date.now() - startWrite
  
  // Phase 4: Create variants
  const startVariants = Date.now()
  const variants = await createVariants(polishedBody, input)
  const variantsTime = Date.now() - startVariants
  
  return {
    outline,
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

