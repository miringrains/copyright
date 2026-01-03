import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  RhythmReportSchema, 
  type RhythmReport, 
  type TaskSpec,
  type BeatSheet 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildRhythmPassPrompt } from '@/core/prompts/templates'

export async function generateRhythmPass(
  taskSpec: TaskSpec,
  beatSheet: BeatSheet,
  draftV1: string
): Promise<RhythmReport> {
  const config = getPhaseConfig('rhythm_pass')
  
  const result = await generateWithRetry({
    config,
    schema: RhythmReportSchema,
    system: SYSTEM_PROMPTS.rhythm_pass,
    prompt: buildRhythmPassPrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(beatSheet, null, 2),
      draftV1
    ),
  })
  
  return result
}

