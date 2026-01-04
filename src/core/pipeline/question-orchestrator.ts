/**
 * Question-Driven Pipeline Orchestrator
 * 
 * Flow:
 * 1. SCAN - Extract info from website
 * 2. ANALYZE - Identify gaps, generate questions
 * 3. WAIT - Display questions, wait for user answers
 * 4. WRITE - Generate copy using answers
 * 5. VALIDATE - Check for slop, regenerate if needed
 */

import { generateObject, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { ScanResultSchema, FinalInputPacketSchema, type ScanResult, type QuestionForUser, type FinalInputPacket } from '@/lib/schemas/scan-result'
import { getEmailRequirements } from '@/core/email-requirements'
import { generateQuestions } from '@/core/question-generator'
import { validateCopy, type ValidationResult } from '@/core/copy-validator'

// ============================================================================
// TYPES
// ============================================================================

export type PipelinePhase = 'scan' | 'analyze' | 'questions' | 'write' | 'validate' | 'complete' | 'error'

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

function buildWritePrompt(packet: FinalInputPacket): string {
  const userAnswers = Object.entries(packet.user_provided)
    .map(([id, answer]) => `${id}: ${answer}`)
    .join('\n')

  return `Write a ${packet.email_type} email for ${packet.company_name}.

COMPANY: ${packet.company_name}
WHAT THEY DO: ${packet.what_they_do}
AUDIENCE: ${packet.target_audience}
SENDER: ${packet.sender_name}
TONE: ${packet.tone}

SPECIFIC FACTS FROM WEBSITE:
${packet.facts.map(f => `- ${f}`).join('\n')}

USER PROVIDED (this is the CORE CONTENT - use these directly):
${userAnswers}

STRUCTURE:
- Max ${packet.structure.maxParagraphs} paragraphs
- Hook: ${packet.structure.hook}
- Body: ${packet.structure.body}
- Close: ${packet.structure.close}

ABSOLUTELY DO NOT USE:
${packet.antiPatterns.map(p => `- "${p}"`).join('\n')}

Write the email. The user's answers should BE the content, not just inform it.
Short paragraphs. No fluff. Every sentence earns its place.`
}

const CopyOutputSchema = z.object({
  main: z.string().describe('The main email copy'),
  shorter: z.string().describe('Same message, fewer words'),
  warmer: z.string().describe('Same message, more personal/casual'),
  subjectLines: z.array(z.string()).describe('3 subject line options'),
})

export async function writeCopy(packet: FinalInputPacket): Promise<CopyOutput> {
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: CopyOutputSchema,
    system: `You are a copywriter. Write short, specific emails. No fluff.

RULES:
- Use the user's provided content directly - that's the value
- Don't add enthusiasm or excitement
- Every sentence must do something
- If something isn't in the inputs, don't mention it
- Match the observed tone from their website`,
    prompt: buildWritePrompt(packet),
  })

  return result.object
}

// ============================================================================
// PHASE 5: VALIDATE
// ============================================================================

const MAX_REGENERATION_ATTEMPTS = 2

export async function validateAndRegenerate(
  copy: CopyOutput,
  packet: FinalInputPacket
): Promise<{ copy: CopyOutput; attempts: number }> {
  let currentCopy = copy
  let attempts = 1

  for (let i = 0; i < MAX_REGENERATION_ATTEMPTS; i++) {
    const validation = validateCopy(currentCopy.main, packet.email_type)
    
    if (validation.isValid) {
      return { copy: currentCopy, attempts }
    }

    // Regenerate with violation context
    attempts++
    const violations = validation.violations.slice(0, 5).map(v => v.details).join('\n')
    
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: CopyOutputSchema,
      system: `You are fixing an email that has problems. Remove the violations while keeping the message.

VIOLATIONS FOUND:
${violations}

Fix these specific issues. Keep everything else the same.`,
      prompt: `ORIGINAL EMAIL:
${currentCopy.main}

SHORTER VERSION:
${currentCopy.shorter}

WARMER VERSION:
${currentCopy.warmer}

Fix the violations in all versions. Keep the subject lines if they're fine.`,
    })

    currentCopy = result.object
  }

  return { copy: currentCopy, attempts }
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class QuestionDrivenPipeline {
  private callbacks: PipelineCallbacks
  private scanResult: ScanResult | null = null
  private questions: QuestionForUser[] = []
  private answers: Record<string, string> = {}
  private input: PipelineInput | null = null

  constructor(callbacks: PipelineCallbacks) {
    this.callbacks = callbacks
  }

  /**
   * Start the pipeline - scans website and generates questions
   */
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
        // No website content - use minimal scan result
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
        message: 'Determining what questions to ask...',
      })

      this.questions = await generateQuestions(
        this.scanResult,
        input.emailType,
        input.formData
      )

      // Phase 3: Questions ready - wait for answers
      this.callbacks.onPhaseChange({
        phase: 'questions',
        message: `${this.questions.length} questions to answer`,
        data: this.questions,
      })

      this.callbacks.onQuestionsReady(this.questions)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pipeline failed'
      this.callbacks.onPhaseChange({ phase: 'error', message })
      this.callbacks.onError(message)
    }
  }

  /**
   * Continue pipeline after user answers questions
   */
  async continueWithAnswers(answers: Record<string, string>): Promise<void> {
    if (!this.input || !this.scanResult) {
      this.callbacks.onError('Pipeline not started')
      return
    }

    this.answers = answers
    const requirements = getEmailRequirements(this.input.emailType)

    try {
      // Build the final input packet
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
        message: 'Writing copy...',
      })

      const copy = await writeCopy(packet)

      // Phase 5: Validate
      this.callbacks.onPhaseChange({
        phase: 'validate',
        message: 'Checking quality...',
      })

      const { copy: validatedCopy, attempts } = await validateAndRegenerate(copy, packet)

      if (attempts > 1) {
        this.callbacks.onPhaseChange({
          phase: 'validate',
          message: `Fixed issues (${attempts} attempts)`,
        })
      }

      // Complete
      this.callbacks.onPhaseChange({
        phase: 'complete',
        message: 'Done',
      })

      this.callbacks.onCopyReady(validatedCopy)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Writing failed'
      this.callbacks.onPhaseChange({ phase: 'error', message })
      this.callbacks.onError(message)
    }
  }
}

