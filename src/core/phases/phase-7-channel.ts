import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  ChannelPassReportSchema, 
  type ChannelPassReport, 
  type TaskSpec,
  type BeatSheet 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildChannelPassPrompt } from '@/core/prompts/templates'

export async function generateChannelPass(
  taskSpec: TaskSpec,
  beatSheet: BeatSheet,
  draftV2: string
): Promise<ChannelPassReport> {
  const config = getPhaseConfig('channel_pass')
  
  const result = await generateWithRetry({
    config,
    schema: ChannelPassReportSchema,
    system: SYSTEM_PROMPTS.channel_pass,
    prompt: buildChannelPassPrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(beatSheet, null, 2),
      draftV2
    ),
  })
  
  return result
}

