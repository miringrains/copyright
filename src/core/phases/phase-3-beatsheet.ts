import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  BeatSheetSchema, 
  type BeatSheet, 
  type TaskSpec,
  type MessageArchitecture 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildBeatSheetPrompt } from '@/core/prompts/templates'

export async function generateBeatSheet(
  taskSpec: TaskSpec,
  messageArchitecture: MessageArchitecture
): Promise<BeatSheet> {
  const config = getPhaseConfig('beat_sheet')
  
  const result = await generateWithRetry({
    config,
    schema: BeatSheetSchema,
    system: SYSTEM_PROMPTS.beat_sheet,
    prompt: buildBeatSheetPrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(messageArchitecture, null, 2)
    ),
  })
  
  return result
}

