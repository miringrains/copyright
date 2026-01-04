import { z } from 'zod'

// Style variants - three distinct approaches
export const VariantsSchema = z.object({
  direct: z.string().describe('Direct style: confident, brief, no wasted words'),
  story_led: z.string().describe('Story-led style: narrative, immersive, scene-setting'),
  conversational: z.string().describe('Conversational style: friendly, personal, informal'),
})
export type Variants = z.infer<typeof VariantsSchema>

// Extras for specific channels - all fields required for structured output compatibility
export const ExtrasSchema = z.object({
  email_subject_lines: z.array(z.string()),
  preheaders: z.array(z.string()),
  headlines: z.array(z.string()),
  meta_descriptions: z.array(z.string()),
  cta_options: z.array(z.string()),
})
export type Extras = z.infer<typeof ExtrasSchema>

// QA checklist
export const QAChecklistSchema = z.object({
  matches_single_job: z.boolean(),
  no_new_claims: z.boolean(),
  proof_lane_consistent: z.boolean(),
  contains_concrete_detail: z.boolean(),
  contains_constraint_or_tradeoff: z.boolean(),
  stance_present: z.boolean(),
  length_ok: z.boolean(),
})
export type QAChecklist = z.infer<typeof QAChecklistSchema>

// FinalPackage schema (Artifact H)
export const FinalPackageSchema = z.object({
  final: z.string().describe('The final copy'),
  variants: VariantsSchema,
  extras: ExtrasSchema,
  qa: QAChecklistSchema,
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type FinalPackage = z.infer<typeof FinalPackageSchema>
