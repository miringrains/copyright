import { z } from 'zod'

// Reader model - understanding the target audience
export const ReaderModelSchema = z.object({
  what_they_want_now: z.string().describe('Their immediate desire or need'),
  what_they_fear_or_resist: z.string().describe('What makes them hesitate'),
  what_they_already_believe: z.string().describe('Existing beliefs to leverage'),
  what_would_make_them_trust: z.string().describe('Trust triggers'),
})
export type ReaderModel = z.infer<typeof ReaderModelSchema>

// Stance - our position
export const StanceSchema = z.object({
  we_assert: z.string().describe('Our core position'),
  we_reject: z.string().describe('What we stand against'),
  confidence_level: z.enum(['low', 'medium', 'high']),
})
export type Stance = z.infer<typeof StanceSchema>

// Proof lane - the primary mode of proof
export const ProofLaneSchema = z.enum([
  'data',
  'mechanism',
  'authority',
  'case',
  'comparison',
  'constraint',
])
export type ProofLane = z.infer<typeof ProofLaneSchema>

// Non-negotiables
export const NonnegotiablesSchema = z.object({
  must_include: z.array(z.string()),
  must_avoid: z.array(z.string()),
})
export type Nonnegotiables = z.infer<typeof NonnegotiablesSchema>

// Full CreativeBrief schema (Artifact A)
export const CreativeBriefSchema = z.object({
  reader_model: ReaderModelSchema,
  single_job: z.string().describe('One sentence: what this piece must accomplish'),
  stance: StanceSchema,
  proof_lane: ProofLaneSchema,
  nonnegotiables: NonnegotiablesSchema,
  success_criteria: z.array(z.string()).describe('Observable properties of final copy'),
  risk_notes: z.array(z.string()).describe('Claims likely to feel fake or salesy'),
  // Global optional keys
  missing_inputs: z.array(z.string()),
  notes: z.array(z.string()),
})
export type CreativeBrief = z.infer<typeof CreativeBriefSchema>

