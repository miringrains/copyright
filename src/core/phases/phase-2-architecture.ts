import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { 
  MessageArchitectureSchema, 
  type MessageArchitecture, 
  type TaskSpec,
  type CreativeBrief 
} from '@/lib/schemas'
import { SYSTEM_PROMPTS, buildMessageArchitecturePrompt } from '@/core/prompts/templates'

export async function generateMessageArchitecture(
  taskSpec: TaskSpec,
  creativeBrief: CreativeBrief
): Promise<MessageArchitecture> {
  const config = getPhaseConfig('message_architecture')
  
  const result = await generateWithRetry({
    config,
    schema: MessageArchitectureSchema,
    system: SYSTEM_PROMPTS.message_architecture,
    prompt: buildMessageArchitecturePrompt(
      JSON.stringify(taskSpec, null, 2),
      JSON.stringify(creativeBrief, null, 2)
    ),
  })
  
  return result
}

