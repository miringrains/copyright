/**
 * Request Parser
 * 
 * Parses freeform user prompts into structured WebsiteRequest objects.
 * Handles ambiguity by generating clarifying questions when needed.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { 
  WebsiteRequestSchema, 
  type WebsiteRequest,
  type DomainProfile 
} from '@/lib/schemas/website'

// ============================================================================
// PARSING SCHEMA (internal)
// ============================================================================

const ParsedPromptSchema = z.object({
  scope: z.enum(['hero', 'about', 'services', 'features', 'testimonials', 'cta', 'full_page', 'multi_section', 'custom']),
  sections: z.array(z.string()).describe('Specific sections if multi_section scope, otherwise empty array'),
  intent: z.enum(['rewrite', 'create', 'improve', 'compare', 'tone_shift']),
  constraints: z.object({
    wordCount: z.number().describe('Target word count, or 0 if not specified'),
    tone: z.string().describe('Desired tone, or empty string if not specified'),
    mustInclude: z.array(z.string()).describe('Required elements, or empty array'),
    mustAvoid: z.array(z.string()).describe('Elements to avoid, or empty array'),
    targetAudience: z.string().describe('Target audience, or empty string if not specified'),
  }),
  extractedFacts: z.array(z.string()).describe('Specific facts about the business/person from the prompt'),
  needsClarification: z.boolean(),
  clarifyingQuestions: z.array(z.string()).describe('Questions to ask if ambiguous, or empty array'),
  confidenceNotes: z.string().describe('Notes about parsing confidence and assumptions'),
})

// ============================================================================
// PARSER
// ============================================================================

const PARSER_SYSTEM = `You parse freeform copywriting requests into structured tasks.

YOUR JOB:
1. Identify what section(s) the user wants copy for (hero, about, services, etc.)
2. Identify the intent (rewrite existing, create new, improve, etc.)
3. Extract specific FACTS about the business that must be included
4. Note any constraints (word count, tone, must include/avoid)
5. Determine if clarification is needed

SCOPE MEANINGS:
- hero: Main headline/subheadline section at top of page
- about: About us/bio section
- services: What they offer/do
- features: Product/service features
- testimonials: Social proof/reviews section
- cta: Call to action section
- full_page: Entire page from hero to footer
- multi_section: Multiple specific sections (list them)
- custom: Something that doesn't fit the above

INTENT MEANINGS:
- rewrite: Replace existing copy entirely
- create: Write from scratch (no existing copy)
- improve: Enhance existing copy, keep structure
- compare: Show before/after comparison
- tone_shift: Same content, different voice

EXTRACTING FACTS:
Pull out EVERY specific fact the user mentions:
- Years of experience
- Credentials/background
- Specializations
- Location/geography
- Notable achievements
- Unique differentiators

These facts MUST appear in the final copy.

WHEN TO ASK FOR CLARIFICATION:
- Scope is completely unclear
- Critical information is missing (e.g., no facts about the business)
- User mentions multiple conflicting things
- Word count/tone expectations are unclear for the scope

DON'T ask for clarification if you can make reasonable assumptions.
DO ask if the user provides almost no context about what makes this business unique.`

/**
 * Parse a freeform prompt into a structured request
 */
export async function parseWebsiteRequest(
  prompt: string,
  existingContent?: string,
  domainProfile?: DomainProfile
): Promise<WebsiteRequest> {
  const contextInfo = domainProfile 
    ? `\nDOMAIN CONTEXT: ${domainProfile.industry} / ${domainProfile.subNiche}`
    : ''

  const existingContentInfo = existingContent
    ? `\nEXISTING SITE CONTENT (they want to modify this):\n${existingContent.slice(0, 3000)}`
    : ''

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ParsedPromptSchema,
    system: PARSER_SYSTEM,
    prompt: `Parse this copywriting request:

USER PROMPT:
"${prompt}"
${contextInfo}
${existingContentInfo}

Extract:
1. Scope (what section/page they want)
2. Intent (rewrite, create, improve, etc.)
3. All specific facts about the business
4. Any constraints mentioned
5. Whether clarification is needed`,
  })

  return {
    ...result.object,
    originalPrompt: prompt,
  }
}

/**
 * Generate follow-up questions for ambiguous requests
 */
export async function generateClarifyingQuestions(
  prompt: string,
  domainProfile?: DomainProfile
): Promise<string[]> {
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: z.object({
      questions: z.array(z.string()).describe('1-3 most important clarifying questions'),
    }),
    system: `You generate clarifying questions for copywriting requests.

Ask about:
- What makes them DIFFERENT from competitors
- Specific credentials, numbers, achievements
- Who their ideal customer is
- What tone they want (if unclear)

Don't ask obvious questions. Don't ask more than 3.
Only ask what's truly needed to write good copy.`,
    prompt: `This copywriting request needs clarification:

"${prompt}"

${domainProfile ? `Industry: ${domainProfile.subNiche}` : ''}

What 1-3 questions would help you write better copy?`,
  })

  return result.object.questions
}

/**
 * Merge user answers into the request
 */
export function mergeAnswersIntoRequest(
  request: WebsiteRequest,
  answers: Record<string, string>
): WebsiteRequest {
  // Extract facts from answers and add to extractedFacts
  const newFacts = Object.values(answers).filter(a => a.trim().length > 0)
  
  return {
    ...request,
    extractedFacts: [...request.extractedFacts, ...newFacts],
    needsClarification: false,
    clarifyingQuestions: [],
  }
}

/**
 * Validate a request has enough information to proceed
 */
export function validateRequest(request: WebsiteRequest): {
  valid: boolean
  missingElements: string[]
} {
  const missing: string[] = []

  if (request.extractedFacts.length === 0) {
    missing.push('No specific facts about the business were provided')
  }

  if (request.scope === 'custom' && request.sections.length === 0) {
    missing.push('Custom scope selected but no sections specified')
  }

  // For about/bio sections, we need more detail
  if (request.scope === 'about' && request.extractedFacts.length < 2) {
    missing.push('About section needs more specific details about the person/business')
  }

  return {
    valid: missing.length === 0,
    missingElements: missing,
  }
}
