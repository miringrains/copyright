import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  FinalPackageSchema, 
  type FinalPackage, 
  type TaskSpec,
  type MessageArchitecture 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildFinalPackagePrompt } from '@/core/prompts/templates'
import { validateDraft, formatViolationsForPrompt } from '@/core/validation/draft-validator'

const MAX_REGENERATION_ATTEMPTS = 2

export async function generateFinalPackage(
  taskSpec: TaskSpec,
  messageArchitecture: MessageArchitecture,
  draftV3: string
): Promise<FinalPackage> {
  const config = getPhaseConfig('final_package')
  
  let lastResult: FinalPackage | null = null
  let violationContext = ''
  
  for (let attempt = 1; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
    const basePrompt = buildFinalPackagePrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(messageArchitecture, null, 2),
      draftV3
    )
    
    const prompt = violationContext 
      ? `${basePrompt}\n\n${violationContext}`
      : basePrompt
    
    const result = await generateWithRetry({
      config,
      schema: FinalPackageSchema,
      system: SYSTEM_PROMPTS.final_package,
      prompt,
    })
    
    lastResult = result
    
    // Validate the final output - catch any slop that slipped through
    const validation = validateDraft(result.final, taskSpec.copy_type)
    
    if (validation.isValid) {
      console.log(`Final package passed validation on attempt ${attempt}`)
      return result
    }
    
    // Final package has violations - prepare for regeneration
    console.log(`Final package attempt ${attempt} has ${validation.violations.length} violations`)
    validation.violations.slice(0, 3).forEach(v => console.log(`  - ${v.type}: ${v.details}`))
    
    if (attempt < MAX_REGENERATION_ATTEMPTS) {
      violationContext = formatViolationsForPrompt(validation.violations)
    }
  }
  
  // Return last result even if not perfect
  console.warn('Final package has violations but returning best effort')
  return lastResult!
}

