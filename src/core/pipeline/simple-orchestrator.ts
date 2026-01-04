/**
 * Simple Pipeline Orchestrator - 3 phases
 * 
 * Phase 1: Assemble Information
 * Phase 2: Pick Voice
 * Phase 3: Write
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { InfoPacketSchema, type InfoPacket } from '@/lib/schemas/info-packet'
import { VoiceSelectionSchema, type VoiceSelection } from '@/lib/schemas/voice-selection'
import { CopyOutputSchema, type CopyOutput } from '@/lib/schemas/copy-output'
import {
  ASSEMBLE_INFO_SYSTEM,
  buildAssembleInfoPrompt,
  PICK_VOICE_SYSTEM,
  buildPickVoicePrompt,
  buildWriteSystemPrompt,
  buildWritePrompt,
} from '@/core/prompts/simple-prompts'

export interface SimpleInput {
  // Form data as key-value pairs
  formData: Record<string, string>
  // Website content if scraped
  websiteContent: string | null
  // Campaign type
  campaignType: string
}

export interface SimplePipelineCallbacks {
  onPhaseStart?: (phase: number, name: string) => void
  onPhaseComplete?: (phase: number, name: string) => void
  onThinking?: (phase: number, message: string) => void
}

export interface SimplePipelineResult {
  success: boolean
  infoPacket?: InfoPacket
  voiceSelection?: VoiceSelection
  copyOutput?: CopyOutput
  error?: string
}

const PHASE_NAMES = {
  1: 'Gathering Information',
  2: 'Selecting Voice',
  3: 'Writing Copy',
}

export async function runSimplePipeline(
  input: SimpleInput,
  callbacks?: SimplePipelineCallbacks
): Promise<SimplePipelineResult> {
  try {
    // ========================================================================
    // PHASE 1: ASSEMBLE INFORMATION
    // ========================================================================
    callbacks?.onPhaseStart?.(1, PHASE_NAMES[1])
    callbacks?.onThinking?.(1, 'Extracting product and context info...')

    const rawInputs = Object.entries(input.formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    const infoResult = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: InfoPacketSchema,
      system: ASSEMBLE_INFO_SYSTEM,
      prompt: buildAssembleInfoPrompt(rawInputs, input.websiteContent, input.campaignType),
    })

    const infoPacket = infoResult.object
    callbacks?.onPhaseComplete?.(1, PHASE_NAMES[1])

    // ========================================================================
    // PHASE 2: PICK VOICE
    // ========================================================================
    callbacks?.onPhaseStart?.(2, PHASE_NAMES[2])
    callbacks?.onThinking?.(2, 'Finding the right person to write this...')

    const voiceResult = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: VoiceSelectionSchema,
      system: PICK_VOICE_SYSTEM,
      prompt: buildPickVoicePrompt(JSON.stringify(infoPacket, null, 2)),
    })

    const voiceSelection = voiceResult.object
    callbacks?.onPhaseComplete?.(2, PHASE_NAMES[2])

    // ========================================================================
    // PHASE 3: WRITE
    // ========================================================================
    callbacks?.onPhaseStart?.(3, PHASE_NAMES[3])
    callbacks?.onThinking?.(3, `${voiceSelection.name} is writing...`)

    const writeResult = await generateObject({
      model: openai('gpt-4o'),
      schema: CopyOutputSchema,
      system: buildWriteSystemPrompt(voiceSelection.name, voiceSelection.known_for),
      prompt: buildWritePrompt(JSON.stringify(infoPacket, null, 2), voiceSelection.name),
    })

    const copyOutput = writeResult.object
    callbacks?.onPhaseComplete?.(3, PHASE_NAMES[3])

    return {
      success: true,
      infoPacket,
      voiceSelection,
      copyOutput,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Pipeline failed'
    console.error('Simple pipeline error:', errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

