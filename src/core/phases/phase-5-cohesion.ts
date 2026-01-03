import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  CohesionReportSchema, 
  type CohesionReport, 
  type TaskSpec,
  type BeatSheet,
  type DraftV0 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildCohesionPassPrompt } from '@/core/prompts/templates'

export async function generateCohesionPass(
  taskSpec: TaskSpec,
  beatSheet: BeatSheet,
  draftV0: DraftV0
): Promise<CohesionReport> {
  const config = getPhaseConfig('cohesion_pass')
  
  const result = await generateWithRetry({
    config,
    schema: CohesionReportSchema,
    system: SYSTEM_PROMPTS.cohesion_pass,
    prompt: buildCohesionPassPrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(beatSheet, null, 2),
      JSON.stringify(draftV0, null, 2)
    ),
  })
  
  return result
}

