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
import { getCampaignStructure, getCampaignForbiddenTerms, buildThroughLine } from '@/core/email-campaigns'

/**
 * Extract campaign type from TaskSpec context
 */
function extractCampaignType(taskSpec: TaskSpec): string | null {
  const context = taskSpec.audience?.context || ''
  
  // Look for campaign type in the context
  const campaignMatch = context.match(/Campaign Type:\s*(Welcome|Nurture|Product Launch|Abandoned Cart|Re-engagement)/i)
  if (campaignMatch) {
    const campaignMap: Record<string, string> = {
      'welcome': 'welcome',
      'nurture': 'nurture',
      'product launch': 'launch',
      'abandoned cart': 'abandoned_cart',
      're-engagement': 'reengagement',
    }
    return campaignMap[campaignMatch[1].toLowerCase()] || null
  }
  
  return null
}

/**
 * Extract form inputs from context for through-line building
 */
function extractFormInputs(taskSpec: TaskSpec): Record<string, string> {
  const context = taskSpec.audience?.context || ''
  const inputs: Record<string, string> = {}
  
  // Parse key-value pairs from context
  const lines = context.split('\n')
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/)
    if (match) {
      const key = match[1].toLowerCase().replace(/\s+/g, '_')
      inputs[key] = match[2].trim()
    }
  }
  
  // Add from TaskSpec directly
  inputs.company_name = taskSpec.inputs?.product_or_topic || ''
  
  return inputs
}

export async function generateBeatSheet(
  taskSpec: TaskSpec,
  messageArchitecture: MessageArchitecture
): Promise<BeatSheet> {
  const config = getPhaseConfig('beat_sheet')
  
  // Get copy type specific rules
  const copyTypeRules = getCopyTypeRules(taskSpec.copy_type)
  let forbiddenTerms = getAllForbiddenTerms(taskSpec.copy_type)
  
  // Check if this is an email with a specific campaign type
  const campaignType = taskSpec.copy_type === 'email' ? extractCampaignType(taskSpec) : null
  const campaignStructure = campaignType ? getCampaignStructure(campaignType) : null
  
  // If we have a campaign structure, use it to enhance the rules
  let campaignContext = null
  if (campaignStructure) {
    const formInputs = extractFormInputs(taskSpec)
    const throughLine = buildThroughLine(campaignType!, formInputs)
    
    // Add campaign-specific forbidden terms
    const campaignForbidden = getCampaignForbiddenTerms(campaignType!)
    forbiddenTerms = [...new Set([...forbiddenTerms, ...campaignForbidden])]
    
    campaignContext = {
      campaignType: campaignStructure.label,
      throughLineTemplate: campaignStructure.throughLineTemplate,
      throughLineExample: campaignStructure.throughLineExample,
      suggestedThroughLine: throughLine,
      hookConstraint: campaignStructure.hookConstraint,
      actionConstraint: campaignStructure.actionConstraint,
      beats: campaignStructure.beats.map(beat => ({
        id: beat.id,
        function: beat.function,
        job: beat.job,
        constraint: beat.constraint,
        maxWords: beat.maxWords,
        requiredElements: beat.requiredElements,
      })),
    }
  }
  
  // Build rules context for the prompt
  const rulesContext = {
    type: copyTypeRules.type,
    // CRITICAL: Beat limits
    maxBeats: campaignStructure?.beats.length || copyTypeRules.maxBeats,
    requiredBeatSequence: campaignStructure 
      ? campaignStructure.beats.map(b => b.id)
      : copyTypeRules.requiredBeatSequence,
    maxTotalWords: copyTypeRules.maxTotalWords,
    targetWords: copyTypeRules.targetWords,
    // Sentence/structure rules
    maxSentenceWords: copyTypeRules.globalMaxSentenceWords,
    maxAdjectivesPerNoun: copyTypeRules.maxAdjectivesPerNoun,
    requiresSpecificDetailEveryNSentences: copyTypeRules.requiresSpecificDetailEveryNSentences,
    formatRules: copyTypeRules.formatRules,
    beatStructures: copyTypeRules.beatStructures,
    forbiddenTerms: forbiddenTerms.slice(0, 50), // Top 50 most important
    // Campaign-specific context (if applicable)
    campaign: campaignContext,
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
