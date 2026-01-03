import { z } from 'zod'

// Beat functions
export const BeatFunctionSchema = z.enum([
  'hook',
  'context',
  'claim',
  'proof',
  'mechanism',
  'objection',
  'example',
  'cta',
  'kicker',
])
export type BeatFunction = z.infer<typeof BeatFunctionSchema>

// Target length for a beat (no min/max constraints - Anthropic API doesn't support them)
export const BeatLengthSchema = z.object({
  unit: z.enum(['words', 'chars']),
  min: z.number(),
  max: z.number(),
})
export type BeatLength = z.infer<typeof BeatLengthSchema>

// Single beat
export const BeatSchema = z.object({
  id: z.string().describe('e.g., B1, B2'),
  function: BeatFunctionSchema,
  job: z.string().describe('What this beat must do'),
  key_points: z.array(z.string()).describe('Bullet points of content'),
  must_echo_terms: z.array(z.string()).describe('Terms for topic chaining'),
  target_length: BeatLengthSchema,
  handoff: z.string().describe('Question/curiosity this beat creates for next'),
})
export type Beat = z.infer<typeof BeatSchema>

// Total length (no min/max constraints - Anthropic API doesn't support them)
export const TotalLengthSchema = z.object({
  unit: z.enum(['words', 'chars']),
  target: z.number(),
  hard_max: z.number(),
})
export type TotalLength = z.infer<typeof TotalLengthSchema>

// Full BeatSheet schema (Artifact C)
export const BeatSheetSchema = z.object({
  total_length: TotalLengthSchema,
  beats: z.array(BeatSchema),
  format_rules: z.array(z.string()).describe('Channel-specific formatting constraints'),
  forbidden_moves: z.array(z.string()).describe('Things that would create AI slop'),
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type BeatSheet = z.infer<typeof BeatSheetSchema>

