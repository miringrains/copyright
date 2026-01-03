import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  DraftV0Schema, 
  type DraftV0, 
  type TaskSpec,
  type BeatSheet 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildDraftV0Prompt } from '@/core/prompts/templates'
import { validateDraft, formatViolationsForPrompt } from '@/core/validation/draft-validator'

const MAX_REGENERATION_ATTEMPTS = 3

export async function generateDraftV0(
  taskSpec: TaskSpec,
  beatSheet: BeatSheet
): Promise<DraftV0> {
  const config = getPhaseConfig('draft_v0')
  
  let lastResult: DraftV0 | null = null
  let violationContext = ''
  
  for (let attempt = 1; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
    // Build prompt with any violation context from previous attempt
    const basePrompt = buildDraftV0Prompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(beatSheet, null, 2)
    )
    
    const prompt = violationContext 
      ? `${basePrompt}\n\n${violationContext}`
      : basePrompt
    
    const result = await generateWithRetry({
      config,
      schema: DraftV0Schema,
      system: SYSTEM_PROMPTS.draft_v0,
      prompt,
    })
    
    lastResult = result
    
    // Validate the draft
    const validation = validateDraft(result.draft, taskSpec.copy_type, beatSheet)
    
    if (validation.isValid) {
      // Draft passes all rules
      console.log(`Draft passed validation on attempt ${attempt} with score ${validation.score}`)
      return result
    }
    
    // Draft has violations - prepare for regeneration
    console.log(`Draft attempt ${attempt} failed validation with ${validation.violations.length} violations:`)
    validation.violations.slice(0, 5).forEach(v => console.log(`  - ${v.type}: ${v.details}`))
    
    if (attempt < MAX_REGENERATION_ATTEMPTS) {
      // Prepare violation context for next attempt
      violationContext = formatViolationsForPrompt(validation.violations)
    }
  }
  
  // Return last result even if not perfect (after max attempts)
  console.warn(`Draft did not pass validation after ${MAX_REGENERATION_ATTEMPTS} attempts. Returning best effort.`)
  return lastResult!
}

