/**
 * Question-Driven Pipeline Orchestrator
 * 
 * Flow:
 * 1. SCAN - Extract info from website
 * 2. ANALYZE - Identify gaps, generate questions
 * 3. WAIT - Display questions, wait for user answers
 * 4. WRITE - Generate copy using answers
 * 5. CRITIC - AI evaluates against rubrics
 * 6. VALIDATE - Check for slop patterns
 * 7. COMPLETE - Output ready
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { ScanResultSchema, type ScanResult, type QuestionForUser, type FinalInputPacket } from '@/lib/schemas/scan-result'
import { getEmailRequirements } from '@/core/email-requirements'
import { generateQuestions } from '@/core/question-generator'
import { validateCopy } from '@/core/copy-validator'
import { shouldRegenerateCopy } from '@/core/critic'

// ============================================================================
// TYPES
// ============================================================================

export type PipelinePhase = 'scan' | 'analyze' | 'questions' | 'write' | 'critic' | 'validate' | 'complete' | 'error'

export interface PipelineState {
  phase: PipelinePhase
  message: string
  data?: unknown
}

export interface PipelineCallbacks {
  onPhaseChange: (state: PipelineState) => void
  onQuestionsReady: (questions: QuestionForUser[]) => void
  onCopyReady: (copy: CopyOutput) => void
  onError: (error: string) => void
}

export interface CopyOutput {
  main: string
  shorter: string
  warmer: string
  subjectLines: string[]
}

export interface PipelineInput {
  websiteUrl: string
  websiteContent: string | null
  emailType: string
  formData: Record<string, string>
}

// ============================================================================
// PHASE 1: SCAN WEBSITE
// ============================================================================

const SCAN_SYSTEM = `You extract specific, useful facts from website content.

Your job:
1. Find the company name and what they actually do
2. Extract SPECIFIC facts: prices, ingredients, features, testimonials, stats
3. Note the tone they use (casual, professional, quirky, etc.)
4. Identify what's MISSING that would be useful for email copy

Be specific. "Great cleaning products" is useless. "$12 all-purpose cleaner, lemon scent, cuts through grease" is useful.

If you can't find something, say so clearly in the gaps.`

export async function scanWebsite(
  websiteContent: string,
  emailType: string
): Promise<ScanResult> {
  const requirements = getEmailRequirements(emailType)
  const lookFor = requirements?.scanLookFor || [
    'product details',
    'pricing',
    'testimonials',
    'unique features',
  ]

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ScanResultSchema,
    system: SCAN_SYSTEM,
    prompt: `Scan this website content for a ${emailType} email.

LOOK FOR THESE SPECIFICALLY:
${lookFor.map(l => `- ${l}`).join('\n')}

WEBSITE CONTENT:
${websiteContent.slice(0, 15000)}

Extract all specific facts. Note what's missing.`,
  })

  return result.object
}

// ============================================================================
// PHASE 4: WRITE COPY
// ============================================================================

function buildWritePrompt(packet: FinalInputPacket, criticFeedback?: string): string {
  const userAnswers = Object.entries(packet.user_provided)
    .map(([id, answer]) => `"${answer}"`)
    .join('\n')

  let prompt = `Write a ${packet.email_type} email.

COMPANY: ${packet.company_name}
SENDER: ${packet.sender_name}

THE USER GAVE YOU THIS CONTENT (use it DIRECTLY, don't paraphrase):
${userAnswers}

${packet.facts.length > 0 ? `FACTS FROM WEBSITE:\n${packet.facts.slice(0, 3).map(f => `- ${f}`).join('\n')}` : ''}

CONSTRAINTS:
- MAX 5 sentences total
- First sentence: confirm/acknowledge (no enthusiasm)
- Middle: the ONE thing you want them to know (use user's content)
- Last sentence: clear action or sign-off
- Sign with just: ${packet.sender_name}

DO NOT:
- Start with "[Company] team here"
- Say "designed with your needs in mind"
- Say "suitable for all [X] you rely on"
- Say "as a valued/loyal customer"
- Use more than 5 sentences
- Add benefits the user didn't provide`

  if (criticFeedback) {
    prompt += `

IMPORTANT - FIX THESE ISSUES FROM PREVIOUS ATTEMPT:
${criticFeedback}`
  }

  return prompt
}

const CopyOutputSchema = z.object({
  main: z.string().describe('The main email copy'),
  shorter: z.string().describe('Same message, fewer words'),
  warmer: z.string().describe('Same message, more personal/casual'),
  subjectLines: z.array(z.string()).describe('3 subject line options'),
})

export async function writeCopy(packet: FinalInputPacket, criticFeedback?: string): Promise<CopyOutput> {
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: CopyOutputSchema,
    system: `You are Rory Sutherland writing an email.

You find the counterintuitive angle. You notice what others miss. You understand that people don't buy products, they buy better versions of themselves or solutions to anxieties they can't articulate.

Your style:
- Start with an observation that makes them think "huh, I never thought of it that way"
- Use specific details, not adjectives
- Short sentences. Let the idea land.
- Never explain why something is good. Show it.
- Find the psychological truth, not the marketing claim
- Be slightly amused by human nature, including your own
- Always write with proper situational context in mind. 

What you never do:
- "We're thrilled/excited/delighted"
- "Designed with your needs in mind"
- "As a valued customer"
- List features
- Multiple CTAs
- Enthusiasm without substance

You write like you're telling a smart friend something interesting you noticed. Not selling. Observing.

Max 4-5 sentences. The insight IS the email.`,
    prompt: buildWritePrompt(packet, criticFeedback),
  })

  return result.object
}

// ============================================================================
// PHASE 5: CRITIC
// ============================================================================

const MAX_CRITIC_REGENERATIONS = 2

async function runCriticLoop(
  copy: CopyOutput,
  packet: FinalInputPacket,
  onFeedback?: (message: string) => void
): Promise<{ copy: CopyOutput; criticPassed: boolean; attempts: number }> {
  let currentCopy = copy
  let attempts = 1

  for (let i = 0; i < MAX_CRITIC_REGENERATIONS; i++) {
    // Run critic evaluation
    const criticResult = await shouldRegenerateCopy(
      currentCopy.main,
      packet.email_type,
      {
        companyName: packet.company_name,
        targetAudience: packet.target_audience,
        userProvidedAnswers: packet.user_provided,
      }
    )

    if (!criticResult.shouldRegenerate) {
      // Passed critic review
      return { copy: currentCopy, criticPassed: true, attempts }
    }

    // Failed - need to regenerate
    attempts++
    onFeedback?.(`Critic found issues, regenerating (attempt ${attempts})...`)

    // Regenerate with critic feedback
    currentCopy = await writeCopy(packet, criticResult.instructions)
  }

  // Max attempts reached - return what we have
  return { copy: currentCopy, criticPassed: false, attempts }
}

// ============================================================================
// PHASE 6: VALIDATE (SLOP CHECK)
// ============================================================================

async function runSlopValidation(
  copy: CopyOutput,
  packet: FinalInputPacket
): Promise<{ copy: CopyOutput; slopFixed: boolean; attempts: number }> {
  let currentCopy = copy
  let attempts = 1

  for (let i = 0; i < 2; i++) {
    const validation = validateCopy(currentCopy.main, packet.email_type)
    
    if (validation.isValid) {
      return { copy: currentCopy, slopFixed: attempts > 1, attempts }
    }

    // Fix slop issues
    attempts++
    const violations = validation.violations.slice(0, 5).map(v => v.details).join('\n')
    
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: CopyOutputSchema,
      system: `You are fixing an email that has quality issues. Remove the violations while keeping the message.

VIOLATIONS FOUND:
${violations}

Fix these specific issues. Keep everything else the same. Do NOT add new AI-sounding phrases.`,
      prompt: `ORIGINAL EMAIL:
${currentCopy.main}

SHORTER VERSION:
${currentCopy.shorter}

WARMER VERSION:
${currentCopy.warmer}

SUBJECT LINES:
${currentCopy.subjectLines.join('\n')}

Fix the violations in all versions. Keep the core message.`,
    })

    currentCopy = result.object
  }

  return { copy: currentCopy, slopFixed: true, attempts }
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class QuestionDrivenPipeline {
  private callbacks: PipelineCallbacks
  private scanResult: ScanResult | null = null
  private questions: QuestionForUser[] = []
  private input: PipelineInput | null = null

  constructor(callbacks: PipelineCallbacks) {
    this.callbacks = callbacks
  }

  async start(input: PipelineInput): Promise<void> {
    this.input = input

    try {
      // Phase 1: Scan
      this.callbacks.onPhaseChange({
        phase: 'scan',
        message: `Scanning ${input.websiteUrl || 'provided content'}...`,
      })

      if (input.websiteContent) {
        this.scanResult = await scanWebsite(input.websiteContent, input.emailType)
        
        this.callbacks.onPhaseChange({
          phase: 'scan',
          message: `Found ${this.scanResult.facts.length} facts, ${this.scanResult.gaps.length} gaps`,
          data: this.scanResult,
        })
      } else {
        this.scanResult = {
          company: {
            name: input.formData.company_name || 'Company',
            what_they_do: input.formData.product_or_topic || 'Products/Services',
            tone_observed: 'professional',
          },
          facts: [],
          gaps: [{ type: 'insider_tip', description: 'No website provided', importance: 'critical' }],
          usable_for_email: [],
          questions_needed: [],
        }
      }

      // Phase 2: Analyze and generate questions
      this.callbacks.onPhaseChange({
        phase: 'analyze',
        message: 'Analyzing what questions to ask...',
      })

      this.questions = await generateQuestions(
        this.scanResult,
        input.emailType,
        input.formData
      )

      // Phase 3: Questions ready
      this.callbacks.onPhaseChange({
        phase: 'questions',
        message: `${this.questions.length} questions ready`,
        data: this.questions,
      })

      this.callbacks.onQuestionsReady(this.questions)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pipeline failed'
      this.callbacks.onPhaseChange({ phase: 'error', message })
      this.callbacks.onError(message)
    }
  }

  async continueWithAnswers(answers: Record<string, string>): Promise<void> {
    if (!this.input || !this.scanResult) {
      this.callbacks.onError('Pipeline not started')
      return
    }

    const requirements = getEmailRequirements(this.input.emailType)

    try {
      // Build packet
      const packet: FinalInputPacket = {
        company_name: this.scanResult.company.name,
        what_they_do: this.scanResult.company.what_they_do,
        tone: this.scanResult.company.tone_observed,
        facts: this.scanResult.facts.map(f => f.content),
        email_type: this.input.emailType,
        target_audience: this.input.formData.target_audience || 'General audience',
        sender_name: this.input.formData.sender_persona || this.scanResult.company.name,
        user_provided: answers,
        structure: requirements?.structure || {
          maxParagraphs: 4,
          hook: 'Get attention',
          body: 'Deliver value',
          close: 'Clear next step',
        },
        antiPatterns: requirements?.antiPatterns || [],
      }

      // Phase 4: Write
      this.callbacks.onPhaseChange({
        phase: 'write',
        message: 'Writing first draft...',
      })

      let copy = await writeCopy(packet)

      // Phase 5: Critic
      this.callbacks.onPhaseChange({
        phase: 'critic',
        message: 'Evaluating quality...',
      })

      const criticResult = await runCriticLoop(copy, packet, (msg) => {
        this.callbacks.onPhaseChange({ phase: 'critic', message: msg })
      })
      copy = criticResult.copy

      // Phase 6: Slop Validation
      this.callbacks.onPhaseChange({
        phase: 'validate',
        message: 'Final quality check...',
      })

      const validationResult = await runSlopValidation(copy, packet)
      copy = validationResult.copy

      // Complete
      this.callbacks.onPhaseChange({
        phase: 'complete',
        message: 'Copy ready!',
      })

      this.callbacks.onCopyReady(copy)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Writing failed'
      this.callbacks.onPhaseChange({ phase: 'error', message })
      this.callbacks.onError(message)
    }
  }
}

// ============================================================================
// FUNCTIONAL API (for route.ts)
// ============================================================================

export async function runWritePhase(
  scanResult: ScanResult,
  emailType: string,
  formData: Record<string, string>,
  answers: Record<string, string>
): Promise<{ copy: CopyOutput; totalAttempts: number }> {
  const requirements = getEmailRequirements(emailType)

  const packet: FinalInputPacket = {
    company_name: scanResult.company.name,
    what_they_do: scanResult.company.what_they_do,
    tone: scanResult.company.tone_observed,
    facts: scanResult.facts.map(f => f.content),
    email_type: emailType,
    target_audience: formData.target_audience || 'General audience',
    sender_name: formData.sender_persona || scanResult.company.name,
    user_provided: answers,
    structure: requirements?.structure || {
      maxParagraphs: 4,
      hook: 'Get attention',
      body: 'Deliver value',
      close: 'Clear next step',
    },
    antiPatterns: requirements?.antiPatterns || [],
  }

  // Write
  let copy = await writeCopy(packet)

  // Critic loop
  const criticResult = await runCriticLoop(copy, packet)
  copy = criticResult.copy

  // Slop validation
  const validationResult = await runSlopValidation(copy, packet)
  copy = validationResult.copy

  return {
    copy,
    totalAttempts: criticResult.attempts + validationResult.attempts,
  }
}
