// Value objects for the domain

// Pipeline status
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed'

// Phase numbers (0-9)
export type PhaseNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// Phase names for display
export const PHASE_NAMES: Record<PhaseNumber, string> = {
  0: 'TaskSpec',
  1: 'Creative Brief',
  2: 'Message Architecture',
  3: 'Beat Sheet',
  4: 'Draft V0',
  5: 'Cohesion Pass',
  6: 'Rhythm Pass',
  7: 'Channel Pass',
  8: 'Final Package',
  9: 'Human Polish',
}

// Phase artifact keys in database
export const PHASE_ARTIFACT_KEYS: Record<PhaseNumber, string | null> = {
  0: 'task_spec',
  1: 'creative_brief',
  2: 'message_architecture',
  3: 'beat_sheet',
  4: 'draft_v0',
  5: 'cohesion_report',
  6: 'rhythm_report',
  7: 'channel_pass',
  8: 'final_package',
  9: 'polished_package',
}

// Get phase name
export function getPhaseName(phase: PhaseNumber): string {
  return PHASE_NAMES[phase]
}

// Get artifact key for a phase
export function getArtifactKey(phase: PhaseNumber): string | null {
  return PHASE_ARTIFACT_KEYS[phase]
}
