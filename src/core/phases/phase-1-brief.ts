import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { CreativeBriefSchema, type CreativeBrief, type TaskSpec } from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildCreativeBriefPrompt } from '@/core/prompts/templates'

export async function generateCreativeBrief(
  taskSpec: TaskSpec
): Promise<CreativeBrief> {
  const config = getPhaseConfig('creative_brief')
  
  const result = await generateWithRetry({
    config,
    schema: CreativeBriefSchema,
    system: SYSTEM_PROMPTS.creative_brief,
    prompt: buildCreativeBriefPrompt(JSON.stringify(taskSpec, null, 2)),
  })
  
  return result
}

