import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import type { ZodSchema } from 'zod'
import type { ModelConfig, AIProvider } from './types'

// Get the model instance based on provider and model name
export function getModel(config: ModelConfig) {
  const { provider, model } = config
  
  if (provider === 'anthropic') {
    return anthropic(model)
  }
  
  if (provider === 'openai') {
    return openai(model)
  }
  
  throw new Error(`Unknown provider: ${provider}`)
}

// Generate structured object with schema validation
export async function generateStructuredOutput<T>({
  config,
  schema,
  prompt,
  system,
}: {
  config: ModelConfig
  schema: ZodSchema<T>
  prompt: string
  system?: string
}): Promise<T> {
  const model = getModel(config)
  
  const { object } = await generateObject({
    model,
    schema,
    prompt,
    system,
    maxTokens: config.maxTokens ?? 4096,
    temperature: config.temperature ?? 0.7,
  })
  
  return object
}

// Generate with retry for repairs
export async function generateWithRetry<T>({
  config,
  schema,
  prompt,
  system,
  maxRetries = 2,
}: {
  config: ModelConfig
  schema: ZodSchema<T>
  prompt: string
  system?: string
  maxRetries?: number
}): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateStructuredOutput({
        config,
        schema,
        prompt,
        system,
      })
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries) {
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  throw lastError
}

