import { z } from 'zod'

// Beat trace - maps draft sections to beats
export const BeatTraceEntrySchema = z.object({
  beat_id: z.string(),
  start_snippet: z.string().describe('First few words of this beat in draft'),
  end_snippet: z.string().describe('Last few words of this beat in draft'),
})
export type BeatTraceEntry = z.infer<typeof BeatTraceEntrySchema>

// Self check for drift detection
export const SelfCheckSchema = z.object({
  followed_beats: z.boolean(),
  added_new_claims: z.boolean(),
  where_it_might_drift: z.array(z.string()),
})
export type SelfCheck = z.infer<typeof SelfCheckSchema>

// DraftV0 schema (Artifact D)
export const DraftV0Schema = z.object({
  draft: z.string().describe('The full draft text'),
  beat_trace: z.array(BeatTraceEntrySchema),
  self_check: SelfCheckSchema,
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type DraftV0 = z.infer<typeof DraftV0Schema>

// Topic chain entry for cohesion analysis
export const SentenceTopicSchema = z.object({
  sentence_index: z.number(),
  topic: z.string(),
  opening_words: z.string(),
})
export type SentenceTopic = z.infer<typeof SentenceTopicSchema>

// Topic chain break
export const TopicBreakSchema = z.object({
  sentence_index: z.number(),
  issue: z.string(),
  fix: z.string(),
})
export type TopicBreak = z.infer<typeof TopicBreakSchema>

// Topic chain analysis
export const TopicChainSchema = z.object({
  sentence_topics: z.array(SentenceTopicSchema),
  breaks: z.array(TopicBreakSchema),
})
export type TopicChain = z.infer<typeof TopicChainSchema>

// Stress position issue
export const StressPositionIssueSchema = z.object({
  sentence_index: z.number(),
  problem: z.string(),
  rewrite_hint: z.string(),
})
export type StressPositionIssue = z.infer<typeof StressPositionIssueSchema>

// Bridge added
export const BridgeAddedSchema = z.object({
  between: z.string().describe('e.g., "paragraph 2 -> 3"'),
  bridge_goal: z.string(),
})
export type BridgeAdded = z.infer<typeof BridgeAddedSchema>

// CohesionReport + DraftV1 schema (Artifact E)
export const CohesionReportSchema = z.object({
  topic_chain: TopicChainSchema,
  stress_position_issues: z.array(StressPositionIssueSchema),
  bridges_added: z.array(BridgeAddedSchema),
  draft_v1: z.string().describe('Revised text'),
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type CohesionReport = z.infer<typeof CohesionReportSchema>

// Sentence statistics
export const SentenceStatsSchema = z.object({
  count: z.number(),
  avg_words: z.number(),
  distribution: z.object({
    short_0_10: z.number(),
    mid_11_20: z.number(),
    long_21_plus: z.number(),
  }),
})
export type SentenceStats = z.infer<typeof SentenceStatsSchema>

// Cadence move
export const CadenceMoveSchema = z.object({
  move: z.string().describe('e.g., insert_short_landing_sentence'),
  where: z.string(),
  reason: z.string(),
})
export type CadenceMove = z.infer<typeof CadenceMoveSchema>

// Paragraphing change
export const ParagraphingChangeSchema = z.object({
  change: z.string().describe('e.g., split, merge'),
  where: z.string(),
  reason: z.string(),
})
export type ParagraphingChange = z.infer<typeof ParagraphingChangeSchema>

// RhythmReport + DraftV2 schema (Artifact F)
export const RhythmReportSchema = z.object({
  sentence_stats: SentenceStatsSchema,
  cadence_moves: z.array(CadenceMoveSchema),
  paragraphing_changes: z.array(ParagraphingChangeSchema),
  draft_v2: z.string().describe('Revised text'),
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type RhythmReport = z.infer<typeof RhythmReportSchema>

// Scan optimization for channel pass
export const ScanOptimizationSchema = z.object({
  first_lines_strengthened: z.boolean(),
  left_edge_words_loaded: z.boolean(),
  formatting_used: z.array(z.string()),
})
export type ScanOptimization = z.infer<typeof ScanOptimizationSchema>

// ChannelPassReport + DraftV3 schema (Artifact G)
export const ChannelPassReportSchema = z.object({
  channel_rules_applied: z.array(z.string()),
  scan_optimization: ScanOptimizationSchema,
  draft_v3: z.string().describe('Revised text'),
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type ChannelPassReport = z.infer<typeof ChannelPassReportSchema>

