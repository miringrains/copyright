import { z } from 'zod'

// Variants object
export const VariantsSchema = z.object({
  shorter: z.string().optional(),
  punchier: z.string().optional(),
  safer: z.string().optional(),
})
export type Variants = z.infer<typeof VariantsSchema>

// Extras for specific channels
export const ExtrasSchema = z.object({
  email_subject_lines: z.array(z.string()).optional(),
  preheaders: z.array(z.string()).optional(),
  headlines: z.array(z.string()).optional(),
  meta_descriptions: z.array(z.string()).optional(),
  cta_options: z.array(z.string()).optional(),
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
  // Global optional keys
  missing_inputs: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
})
export type FinalPackage = z.infer<typeof FinalPackageSchema>

