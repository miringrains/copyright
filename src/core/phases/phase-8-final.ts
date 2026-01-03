import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  FinalPackageSchema, 
  type FinalPackage, 
  type TaskSpec,
  type MessageArchitecture 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildFinalPackagePrompt } from '@/core/prompts/templates'

export async function generateFinalPackage(
  taskSpec: TaskSpec,
  messageArchitecture: MessageArchitecture,
  draftV3: string
): Promise<FinalPackage> {
  const config = getPhaseConfig('final_package')
  
  const result = await generateWithRetry({
    config,
    schema: FinalPackageSchema,
    system: SYSTEM_PROMPTS.final_package,
    prompt: buildFinalPackagePrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(messageArchitecture, null, 2),
      draftV3
    ),
  })
  
  return result
}

