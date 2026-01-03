import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  BeatSheetSchema, 
  type BeatSheet, 
  type TaskSpec,
  type MessageArchitecture 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildBeatSheetPrompt } from '@/core/prompts/templates'
import { getCopyTypeRules, getAllForbiddenTerms } from '@/core/copy-type-rules'

export async function generateBeatSheet(
  taskSpec: TaskSpec,
  messageArchitecture: MessageArchitecture
): Promise<BeatSheet> {
  const config = getPhaseConfig('beat_sheet')
  
  // Get copy type specific rules
  const copyTypeRules = getCopyTypeRules(taskSpec.copy_type)
  const forbiddenTerms = getAllForbiddenTerms(taskSpec.copy_type)
  
  // Build rules context for the prompt - emphasize beat limits
  const rulesContext = {
    type: copyTypeRules.type,
    // CRITICAL: Beat limits
    maxBeats: copyTypeRules.maxBeats,
    requiredBeatSequence: copyTypeRules.requiredBeatSequence,
    maxTotalWords: copyTypeRules.maxTotalWords,
    targetWords: copyTypeRules.targetWords,
    // Sentence/structure rules
    maxSentenceWords: copyTypeRules.globalMaxSentenceWords,
    maxAdjectivesPerNoun: copyTypeRules.maxAdjectivesPerNoun,
    requiresSpecificDetailEveryNSentences: copyTypeRules.requiresSpecificDetailEveryNSentences,
    formatRules: copyTypeRules.formatRules,
    beatStructures: copyTypeRules.beatStructures,
    forbiddenTerms: forbiddenTerms.slice(0, 40), // Top 40 most important
  }
  
  const result = await generateWithRetry({
    config,
    schema: BeatSheetSchema,
    system: SYSTEM_PROMPTS.beat_sheet,
    prompt: buildBeatSheetPrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(messageArchitecture, null, 2),
      JSON.stringify(rulesContext, null, 2)
    ),
  })
  
  return result
}

