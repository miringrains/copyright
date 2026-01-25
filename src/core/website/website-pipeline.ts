/**
 * Website Copy Pipeline
 * 
 * Orchestrates the full flow:
 * 1. Domain Immersion (build expertise)
 * 2. Request Parsing (understand what user wants)
 * 3. Copy Generation (with domain voice)
 * 4. Slop Detection & Fixing
 * 5. Variant Generation
 */

import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { runDomainImmersion, runQuickImmersion, type ImmersionCallbacks } from './domain-immersion'
import { parseWebsiteRequest, validateRequest } from './request-parser'
import { detectSlop, fixSlop, quickSlopCheck } from './domain-slop-detector'
import { 
  type DomainProfile, 
  type WebsiteRequest, 
  type WebsiteCopyOutput,
  type WebsiteCopySection,
  WebsiteCopySectionSchema,
} from '@/lib/schemas/website'
import { WEBSITE_PHILOSOPHY } from './enterprise-philosophy'

// ============================================================================
// TYPES
// ============================================================================

export type WebsitePhase = 
  | 'immersion'
  | 'parsing' 
  | 'clarifying'
  | 'generating'
  | 'slop_check'
  | 'variants'
  | 'complete'
  | 'error'

export interface WebsitePipelineCallbacks {
  onPhaseChange: (phase: WebsitePhase, message: string, data?: unknown) => void
  onClarifyingQuestions: (questions: string[]) => void
  onCopyReady: (output: WebsiteCopyOutput) => void
  onError: (message: string) => void
}

export interface WebsitePipelineInput {
  websiteUrl: string
  prompt: string
  additionalContext?: string
  skipImmersion?: boolean  // For faster iteration
  answers?: Record<string, string>  // Answers to clarifying questions
}

// ============================================================================
// COPY GENERATION PROMPTS
// ============================================================================

const COPY_GENERATION_SYSTEM = `You are a senior copywriter who understands how power works.

${WEBSITE_PHILOSOPHY}

---

THE CRAFT:

SPECIFIC > GENERIC
- Bad: "decades of experience in the industry"
- Good: "22 years selling homes in West Palm Beach"

SHOW > TELL
- Bad: "We provide excellent service"
- Good: "Last year we closed 47 transactions, 89% above asking"

CONCRETE > ABSTRACT
- Bad: "We leverage our network to find opportunities"
- Good: "I call the same 12 mortgage brokers every Monday"

CLAIMS NEED PROOF
- If you claim to be the best, prove it with a number or story
- If you can't prove it, don't say it

VOICE MATCHES THE PERSON
- A tennis-player-turned-realtor doesn't sound like a corporate bio
- Match their likely speaking style

SECTION STRUCTURE:
- HERO: What makes them different. 5-12 word headline. 15-25 word subheadline.
- ABOUT: Open with the most interesting fact. Build credibility through specifics. End with what they do differently.
- SERVICES: Name + one sentence of what makes it different.
- CTA: One clear action. Specific, not generic.

FORBIDDEN (these signal weakness):
- "Unmatched", "unparalleled", "second to none", "few can rival"
- "Passionate about", "dedicated to", "committed to"
- "Helping you [verb]", "designed to help", "here to help"
- "Journey", "experience", "solution", "leverage"
- "Best-in-class", "world-class", "cutting-edge"
- Any phrase that could apply to literally any business

If you don't have a specific fact, don't invent one.
Short and credible beats long and hollow.`

// ============================================================================
// COPY GENERATION
// ============================================================================

async function generateCopy(
  request: WebsiteRequest,
  domainProfile: DomainProfile,
  callbacks: WebsitePipelineCallbacks
): Promise<WebsiteCopySection[]> {
  callbacks.onPhaseChange('generating', 'Writing copy with domain expertise...')

  // Build the prompt with domain context
  const terminologyContext = domainProfile.terminology.terms.length > 0
    ? `USE THESE DOMAIN TERMS NATURALLY: ${domainProfile.terminology.terms.slice(0, 15).join(', ')}`
    : ''

  const proofPatterns = domainProfile.terminology.proofPatterns.length > 0
    ? `PROOF PATTERNS THAT WORK IN THIS NICHE:\n${domainProfile.terminology.proofPatterns.map(p => `- ${p}`).join('\n')}`
    : ''

  const voiceGuidance = `VOICE: ${domainProfile.voiceInsights.relationship}, ${domainProfile.voiceInsights.claimStyle} claims, ${domainProfile.voiceInsights.proofStyle} proof style`

  const goodExamples = domainProfile.goodExamples.length > 0
    ? `EXAMPLES OF GOOD COPY IN THIS NICHE:\n${domainProfile.goodExamples.slice(0, 3).map(e => `"${e}"`).join('\n')}`
    : ''

  const forbiddenInNiche = domainProfile.forbiddenInThisNiche.length > 0
    ? `FORBIDDEN IN ${domainProfile.subNiche.toUpperCase()}:\n${domainProfile.forbiddenInThisNiche.join(', ')}`
    : ''

  const factsList = request.extractedFacts.length > 0
    ? `FACTS THAT MUST APPEAR IN THE COPY:\n${request.extractedFacts.map(f => `- ${f}`).join('\n')}`
    : ''

  const scopeInstructions = getScopeInstructions(request.scope)

  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      sections: z.array(WebsiteCopySectionSchema),
    }),
    system: COPY_GENERATION_SYSTEM,
    prompt: `Write website copy for: ${domainProfile.subNiche}

SCOPE: ${request.scope}
INTENT: ${request.intent}
${scopeInstructions}

${factsList}

${terminologyContext}
${proofPatterns}
${voiceGuidance}
${goodExamples}
${forbiddenInNiche}

${request.constraints.tone ? `TONE: ${request.constraints.tone}` : ''}
${request.constraints.wordCount ? `TARGET WORDS: ~${request.constraints.wordCount}` : ''}
${request.constraints.targetAudience ? `AUDIENCE: ${request.constraints.targetAudience}` : ''}

Original request: "${request.originalPrompt}"

Write the copy. Be specific. Use the facts provided. Sound like a human expert.`,
  })

  return result.object.sections
}

function getScopeInstructions(scope: string): string {
  const instructions: Record<string, string> = {
    hero: `Write a HERO section:
- Headline: 5-12 words, lead with what makes them different
- Subheadline: 15-25 words, expand on the headline
- Optional: A brief tagline or CTA`,
    about: `Write an ABOUT section:
- Open with the most interesting fact about this person/business
- Build credibility through specifics, not claims
- Include background only if it's relevant and interesting
- End with what they do differently
- 100-200 words total`,
    services: `Write a SERVICES section:
- List each service with a name + one specific sentence
- Focus on what makes each service different
- No generic descriptions`,
    full_page: `Write a full landing page:
- Hero section (headline + subheadline)
- Problem/pain point (2-3 sentences)
- Solution/what they do (2-3 sentences)
- Why them specifically (differentiators)
- Social proof/credentials
- CTA`,
    cta: `Write a CTA section:
- Clear, specific action
- Reason to act now (if applicable)
- One button/link text`,
    features: `Write FEATURES:
- Each feature: Name + benefit in one sentence
- Focus on outcomes, not capabilities`,
    custom: `Write the requested sections based on the prompt.`,
  }
  return instructions[scope] || instructions.custom
}

// ============================================================================
// VARIANT GENERATION
// ============================================================================

async function generateVariants(
  primarySections: WebsiteCopySection[],
  domainProfile: DomainProfile,
  callbacks: WebsitePipelineCallbacks
): Promise<{
  direct?: { sections: WebsiteCopySection[]; wordCount: number }
  story_led?: { sections: WebsiteCopySection[]; wordCount: number }
  conversational?: { sections: WebsiteCopySection[]; wordCount: number }
}> {
  callbacks.onPhaseChange('variants', 'Generating style variants...')

  const primaryText = primarySections.map(s => s.body).join('\n\n')

  // Generate all variants in parallel
  const [directResult, storyResult, conversationalResult] = await Promise.all([
    generateVariant(primaryText, 'direct', domainProfile),
    generateVariant(primaryText, 'story_led', domainProfile),
    generateVariant(primaryText, 'conversational', domainProfile),
  ])

  return {
    direct: directResult,
    story_led: storyResult,
    conversational: conversationalResult,
  }
}

async function generateVariant(
  primaryText: string,
  style: 'direct' | 'story_led' | 'conversational',
  domainProfile: DomainProfile
): Promise<{ sections: WebsiteCopySection[]; wordCount: number } | undefined> {
  const styleInstructions = {
    direct: `DIRECT STYLE:
- Shorter sentences, no qualifiers
- Lead every paragraph with the point
- Remove all warm-up phrases
- Confident, brief, no wasted words`,
    story_led: `STORY-LED STYLE:
- Ground claims in specific moments or observations
- "We built this because..." not "We help you..."
- Show the WHY through narrative
- Still grounded in facts, not invented stories`,
    conversational: `CONVERSATIONAL STYLE:
- Contractions throughout
- Second person focus ("you")
- Shorter paragraphs
- Feels like a friend explaining, not a brochure`,
  }

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        sections: z.array(WebsiteCopySectionSchema),
      }),
      system: `You transform copy into different styles while keeping the core message.

${styleInstructions[style]}

KEEP:
- All specific facts and numbers
- Domain terminology
- Core claims and proof

CHANGE:
- Sentence structure
- Tone and warmth
- Opening approach`,
      prompt: `Transform this copy into ${style.replace('_', '-')} style:

${primaryText}

Maintain all facts but adjust the delivery.`,
    })

    const wordCount = result.object.sections
      .map(s => s.body.split(/\s+/).length)
      .reduce((a, b) => a + b, 0)

    return {
      sections: result.object.sections,
      wordCount,
      style,
    } as { sections: WebsiteCopySection[]; wordCount: number }
  } catch (error) {
    console.error(`Failed to generate ${style} variant:`, error)
    return undefined
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export class WebsitePipeline {
  private callbacks: WebsitePipelineCallbacks
  private domainProfile: DomainProfile | null = null
  private request: WebsiteRequest | null = null

  constructor(callbacks: WebsitePipelineCallbacks) {
    this.callbacks = callbacks
  }

  /**
   * Run domain immersion phase
   */
  async immerse(websiteUrl: string, quick: boolean = false): Promise<DomainProfile> {
    const immersionCallbacks: ImmersionCallbacks = {
      onProgress: (phase, message, data) => {
        this.callbacks.onPhaseChange('immersion', `[${phase}] ${message}`, data)
      },
      onError: (message) => this.callbacks.onError(message),
    }

    if (quick) {
      this.domainProfile = await runQuickImmersion(websiteUrl, undefined, immersionCallbacks)
    } else {
      const result = await runDomainImmersion(websiteUrl, immersionCallbacks)
      this.domainProfile = result.domainProfile
    }

    return this.domainProfile
  }

  /**
   * Parse the user's request
   */
  async parseRequest(prompt: string, existingContent?: string): Promise<WebsiteRequest> {
    this.callbacks.onPhaseChange('parsing', 'Understanding your request...')
    
    this.request = await parseWebsiteRequest(prompt, existingContent, this.domainProfile || undefined)

    if (this.request.needsClarification) {
      this.callbacks.onPhaseChange('clarifying', 'Need more information...')
      this.callbacks.onClarifyingQuestions(this.request.clarifyingQuestions)
    }

    return this.request
  }

  /**
   * Run the full pipeline
   */
  async run(input: WebsitePipelineInput): Promise<WebsiteCopyOutput> {
    try {
      // Step 1: Domain Immersion (unless skipped)
      if (!input.skipImmersion || !this.domainProfile) {
        this.callbacks.onPhaseChange('immersion', 'Building domain expertise...')
        await this.immerse(input.websiteUrl, input.skipImmersion)
      }

      // Step 2: Parse Request
      await this.parseRequest(input.prompt)

      // Handle clarifying questions if needed
      if (this.request!.needsClarification && !input.answers) {
        throw new Error('Clarification needed but no answers provided')
      }

      // Merge in answers if provided
      if (input.answers) {
        this.request!.extractedFacts.push(...Object.values(input.answers))
        this.request!.needsClarification = false
      }

      // Validate request
      const validation = validateRequest(this.request!)
      if (!validation.valid) {
        this.callbacks.onPhaseChange('clarifying', 'Need more details')
        this.callbacks.onClarifyingQuestions(validation.missingElements)
        throw new Error(`Request validation failed: ${validation.missingElements.join(', ')}`)
      }

      // Step 3: Generate Copy
      const primarySections = await generateCopy(
        this.request!,
        this.domainProfile!,
        this.callbacks
      )

      // Step 4: Slop Detection
      this.callbacks.onPhaseChange('slop_check', 'Checking for AI slop...')
      const primaryText = primarySections.map(s => s.body).join('\n\n')
      let slopResult = await detectSlop(primaryText, this.domainProfile!)

      // Fix slop if needed
      let finalSections = primarySections
      if (!slopResult.passed && slopResult.violations.length > 0) {
        this.callbacks.onPhaseChange('slop_check', 'Fixing detected slop...')
        const fixedText = await fixSlop(primaryText, slopResult.violations, this.domainProfile!)
        
        // Re-check after fix
        slopResult = quickSlopCheck(fixedText, this.domainProfile!)
        
        // Update sections with fixed text (simplified - in production would re-parse)
        finalSections = [{
          ...primarySections[0],
          body: fixedText,
        }]
      }

      // Step 5: Generate Variants
      const variants = await generateVariants(finalSections, this.domainProfile!, this.callbacks)

      // Calculate word count
      const primaryWordCount = finalSections
        .map(s => s.body.split(/\s+/).length)
        .reduce((a, b) => a + b, 0)

      // Build output
      const output: WebsiteCopyOutput = {
        primary: {
          sections: finalSections,
          wordCount: primaryWordCount,
        },
        variants: {
          direct: variants.direct ? {
            style: 'direct',
            sections: variants.direct.sections,
            wordCount: variants.direct.wordCount,
          } : undefined,
          story_led: variants.story_led ? {
            style: 'story_led',
            sections: variants.story_led.sections,
            wordCount: variants.story_led.wordCount,
          } : undefined,
          conversational: variants.conversational ? {
            style: 'conversational',
            sections: variants.conversational.sections,
            wordCount: variants.conversational.wordCount,
          } : undefined,
        },
        domainProfile: this.domainProfile!,
        slopChecks: {
          universalViolations: slopResult.universalViolations,
          domainViolations: slopResult.domainViolations,
          passed: slopResult.passed,
        },
      }

      this.callbacks.onPhaseChange('complete', 'Copy generation complete')
      this.callbacks.onCopyReady(output)

      return output
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Pipeline failed')
      throw error
    }
  }

  /**
   * Get current domain profile
   */
  getDomainProfile(): DomainProfile | null {
    return this.domainProfile
  }

  /**
   * Set domain profile (for reuse across requests)
   */
  setDomainProfile(profile: DomainProfile): void {
    this.domainProfile = profile
  }
}
