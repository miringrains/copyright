import type { ModelConfig, PhaseName, PhaseModelConfig } from './types'

// Phase-to-model routing based on research
// - Phases I-III: Claude Sonnet 4.5 for superior reasoning and strategic thinking
// - Phase IV: GPT-4o for strong prose generation
// - Phases V-VI: GPT-4o-mini for cost-effective mechanical edits
// - Phases VII-VIII: GPT-4o for judgment in channel formatting and final QA

// Current model identifiers (January 2026):
// - Claude Sonnet 4.5: claude-sonnet-4-5-20250929
// - Claude Haiku 4.5: claude-haiku-4-5-20250929  
// - Claude Opus 4.5: claude-opus-4-5-20250929
// - GPT-4o: gpt-4o
// - GPT-4o-mini: gpt-4o-mini

const PHASE_MODEL_MAP: Record<PhaseName, PhaseModelConfig> = {
  creative_brief: {
    phase: 'creative_brief',
    config: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      temperature: 0.7,
    },
    rationale: 'Requires deep reasoning about reader psychology and stance',
  },
  message_architecture: {
    phase: 'message_architecture',
    config: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      temperature: 0.6,
    },
    rationale: 'Complex claim hierarchy and proof mapping requires strong reasoning',
  },
  beat_sheet: {
    phase: 'beat_sheet',
    config: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      temperature: 0.6,
    },
    rationale: 'Strategic sequencing with handoff logic needs structured thinking',
  },
  draft_v0: {
    phase: 'draft_v0',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 8192,
      temperature: 0.8,
    },
    rationale: 'Strong prose generation from structured constraints',
  },
  cohesion_pass: {
    phase: 'cohesion_pass',
    config: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      temperature: 0.5,
    },
    rationale: 'Mechanical topic-chain analysis - cost-effective',
  },
  rhythm_pass: {
    phase: 'rhythm_pass',
    config: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      temperature: 0.5,
    },
    rationale: 'Sentence stats and cadence tweaks - mechanical',
  },
  channel_pass: {
    phase: 'channel_pass',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.6,
    },
    rationale: 'Channel-aware restructuring requires judgment',
  },
  final_package: {
    phase: 'final_package',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 8192,
      temperature: 0.7,
    },
    rationale: 'Final QA and variant generation needs quality',
  },
  repair: {
    phase: 'repair',
    config: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      temperature: 0.3,
    },
    rationale: 'Fast, cheap JSON fixes with low creativity',
  },
}

export function getPhaseConfig(phase: PhaseName): ModelConfig {
  const config = PHASE_MODEL_MAP[phase]
  if (!config) {
    throw new Error(`Unknown phase: ${phase}`)
  }
  return config.config
}

export function getPhaseRationale(phase: PhaseName): string {
  const config = PHASE_MODEL_MAP[phase]
  if (!config) {
    throw new Error(`Unknown phase: ${phase}`)
  }
  return config.rationale
}

export function getAllPhaseConfigs(): PhaseModelConfig[] {
  return Object.values(PHASE_MODEL_MAP)
}
