// Domain entities - re-export types from schemas
// This provides a clean interface for the core domain

export type {
  TaskSpec,
  CopyType,
  Channel,
  Audience,
  Goal,
  Inputs,
  VoiceProfile,
  LengthBudget,
  ProofMaterial,
  ProofType,
} from '@/lib/schemas/task-spec'

export type {
  CreativeBrief,
  ReaderModel,
  Stance,
  ProofLane,
  Nonnegotiables,
} from '@/lib/schemas/creative-brief'

export type {
  MessageArchitecture,
  SupportingClaim,
  ClaimRole,
  ProofPlanEntry,
  ObjectionPlanEntry,
  Ordering,
  ClaimStrength,
} from '@/lib/schemas/message-architecture'

export type {
  BeatSheet,
  Beat,
  BeatFunction,
  BeatLength,
  TotalLength,
} from '@/lib/schemas/beat-sheet'

export type {
  DraftV0,
  BeatTraceEntry,
  SelfCheck,
  CohesionReport,
  TopicChain,
  SentenceTopic,
  TopicBreak,
  StressPositionIssue,
  BridgeAdded,
  RhythmReport,
  SentenceStats,
  CadenceMove,
  ParagraphingChange,
  ChannelPassReport,
  ScanOptimization,
} from '@/lib/schemas/drafts'

export type {
  FinalPackage,
  Variants,
  Extras,
  QAChecklist,
} from '@/lib/schemas/final-package'

