// AI Provider Types

export type AIProvider = 'anthropic' | 'openai'

// Claude 4.5 models (January 2026)
export type AnthropicModel = 
  | 'claude-sonnet-4-5-20250929'
  | 'claude-haiku-4-5-20250929'
  | 'claude-opus-4-5-20250929'

// OpenAI models
export type OpenAIModel = 
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'

export type AIModel = AnthropicModel | OpenAIModel

export interface ModelConfig {
  provider: AIProvider
  model: AIModel
  maxTokens?: number
  temperature?: number
}

// Phase to model mapping
export type PhaseName = 
  | 'creative_brief'
  | 'message_architecture'
  | 'beat_sheet'
  | 'draft_v0'
  | 'cohesion_pass'
  | 'rhythm_pass'
  | 'channel_pass'
  | 'final_package'
  | 'repair'

export interface PhaseModelConfig {
  phase: PhaseName
  config: ModelConfig
  rationale: string
}
