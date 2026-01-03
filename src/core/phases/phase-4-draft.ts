import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  DraftV0Schema, 
  type DraftV0, 
  type TaskSpec,
  type BeatSheet 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildDraftV0Prompt } from '@/core/prompts/templates'

export async function generateDraftV0(
  taskSpec: TaskSpec,
  beatSheet: BeatSheet
): Promise<DraftV0> {
  const config = getPhaseConfig('draft_v0')
  
  const result = await generateWithRetry({
    config,
    schema: DraftV0Schema,
    system: SYSTEM_PROMPTS.draft_v0,
    prompt: buildDraftV0Prompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(beatSheet, null, 2)
    ),
  })
  
  return result
}

