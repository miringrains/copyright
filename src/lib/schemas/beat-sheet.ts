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

// First word type constraints - enforces active voice and directness
export const FirstWordTypeSchema = z.enum([
  'noun',
  'verb', 
  'imperative',
  'pronoun',
  'question_word',
])
export type FirstWordType = z.infer<typeof FirstWordTypeSchema>

// Required elements in a beat - enforces specificity
export const RequiredElementSchema = z.enum([
  'specific_noun',
  'number',
  'proper_noun',
  'imperative',
  'question',
])
export type RequiredElement = z.infer<typeof RequiredElementSchema>

// Structural constraints for a beat - enforces writing school principles
export const BeatStructureSchema = z.object({
  max_words: z.number().describe('Hard word limit for this beat'),
  required_elements: z.array(RequiredElementSchema).describe('Must include at least one of these'),
  first_word_types: z.array(FirstWordTypeSchema).describe('First word must be one of these types'),
  forbidden_in_beat: z.array(z.string()).describe('Additional forbidden words specific to this beat'),
})
export type BeatStructure = z.infer<typeof BeatStructureSchema>

// Single beat - now with structural constraints
export const BeatSchema = z.object({
  id: z.string().describe('e.g., B1, B2'),
  function: BeatFunctionSchema,
  job: z.string().describe('What this beat must do'),
  key_points: z.array(z.string()).describe('Bullet points of content'),
  must_echo_terms: z.array(z.string()).describe('Terms for topic chaining'),
  must_include_from_inputs: z.array(z.string()).describe('Specific details from TaskSpec that MUST appear in this beat'),
  target_length: BeatLengthSchema,
  structure: BeatStructureSchema.describe('Hard structural constraints for this beat'),
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

// Writing constraints schema - enforces hard rules
export const WritingConstraintsSchema = z.object({
  max_sentence_words: z.number().describe('No sentence can exceed this word count'),
  max_adjectives_per_noun: z.number().describe('Prevents adjective stacking'),
  specific_detail_every_n_sentences: z.number().describe('Requires specificity'),
  forbidden_words: z.array(z.string()).describe('Words that will cause regeneration if found'),
  forbidden_patterns: z.array(z.string()).describe('Regex patterns that will cause regeneration'),
})
export type WritingConstraints = z.infer<typeof WritingConstraintsSchema>

// Full BeatSheet schema (Artifact C)
export const BeatSheetSchema = z.object({
  total_length: TotalLengthSchema,
  beats: z.array(BeatSchema),
  writing_constraints: WritingConstraintsSchema.describe('Hard writing rules - violations cause regeneration'),
  format_rules: z.array(z.string()).describe('Channel-specific formatting constraints'),
  forbidden_moves: z.array(z.string()).describe('Things that would create AI slop'),
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type BeatSheet = z.infer<typeof BeatSheetSchema>

