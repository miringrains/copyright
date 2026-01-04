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
import { postProcess } from '@/core/post-processor'

const MAX_REGENERATION_ATTEMPTS = 2

/**
 * Apply post-processing to all text fields in the final package
 * This removes em dashes, excessive exclamation, and other AI artifacts
 */
function postProcessPackage(pkg: FinalPackage): FinalPackage {
  return {
    ...pkg,
    final: postProcess(pkg.final),
    variants: {
      direct: postProcess(pkg.variants.direct),
      story_led: postProcess(pkg.variants.story_led),
      conversational: postProcess(pkg.variants.conversational),
    },
    extras: {
      ...pkg.extras,
      headlines: pkg.extras.headlines?.map(h => postProcess(h)),
      email_subject_lines: pkg.extras.email_subject_lines?.map(s => postProcess(s)),
      cta_options: pkg.extras.cta_options?.map(c => postProcess(c)),
    },
  }
}

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
      // Apply post-processing before returning
      return postProcessPackage(result)
    }
    
    // Final package has violations - prepare for regeneration
    console.log(`Final package attempt ${attempt} has ${validation.violations.length} violations`)
    validation.violations.slice(0, 3).forEach(v => console.log(`  - ${v.type}: ${v.details}`))
    
    if (attempt < MAX_REGENERATION_ATTEMPTS) {
      violationContext = formatViolationsForPrompt(validation.violations)
    }
  }
  
  // Return last result even if not perfect, but still post-process
  console.warn('Final package has violations but returning best effort')
  return postProcessPackage(lastResult!)
}

