import type { 
  TaskSpec, 
  CreativeBrief, 
  MessageArchitecture, 
  BeatSheet, 
  DraftV0, 
  CohesionReport, 
  RhythmReport, 
  ChannelPassReport, 
  FinalPackage 
} from '@/lib/schemas'

// Pipeline run state
export interface PipelineState {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentPhase: number
  taskSpec: TaskSpec | null
  creativeBrief: CreativeBrief | null
  messageArchitecture: MessageArchitecture | null
  beatSheet: BeatSheet | null
  draftV0: DraftV0 | null
  cohesionReport: CohesionReport | null
  rhythmReport: RhythmReport | null
  channelPass: ChannelPassReport | null
  finalPackage: FinalPackage | null
  errorMessage: string | null
}

// Phase result
export interface PhaseResult<T> {
  success: boolean
  data?: T
  error?: string
}

// Pipeline options with optional async callbacks
export interface PipelineOptions {
  onPhaseStart?: (phase: number, phaseName: string) => void | Promise<void>
  onPhaseComplete?: (phase: number, phaseName: string, artifact: unknown) => void | Promise<void>
  onPhaseError?: (phase: number, phaseName: string, error: Error) => void | Promise<void>
  onComplete?: (finalPackage: FinalPackage) => void | Promise<void>
  onError?: (error: Error) => void | Promise<void>
}

// Pipeline result
export interface PipelineResult {
  success: boolean
  runId: string
  finalPackage?: FinalPackage
  error?: string
  artifacts?: {
    creativeBrief?: CreativeBrief
    messageArchitecture?: MessageArchitecture
    beatSheet?: BeatSheet
    draftV0?: DraftV0
    cohesionReport?: CohesionReport
    rhythmReport?: RhythmReport
    channelPass?: ChannelPassReport
  }
}
