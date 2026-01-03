import { z } from 'zod'

// Claim roles
export const ClaimRoleSchema = z.enum([
  'why true',
  'why now',
  'why us',
  'why safe',
  'why different',
])
export type ClaimRole = z.infer<typeof ClaimRoleSchema>

// Supporting claim
export const SupportingClaimSchema = z.object({
  claim: z.string(),
  role: ClaimRoleSchema,
})
export type SupportingClaim = z.infer<typeof SupportingClaimSchema>

// Architecture proof type (includes 'authority' in addition to base types)
export const ArchProofTypeSchema = z.enum([
  'data',
  'mechanism',
  'authority',
  'case',
  'comparison',
  'constraint',
])
export type ArchProofType = z.infer<typeof ArchProofTypeSchema>

// Proof plan entry
export const ProofPlanEntrySchema = z.object({
  supports: z.string().describe('primary|supporting:0|supporting:1 etc'),
  proof: z.string(),
  proof_type: ArchProofTypeSchema,
})
export type ProofPlanEntry = z.infer<typeof ProofPlanEntrySchema>

// Objection/answer pair
export const ObjectionPlanEntrySchema = z.object({
  objection: z.string(),
  answer: z.string().describe('Short and concrete, not inspirational'),
})
export type ObjectionPlanEntry = z.infer<typeof ObjectionPlanEntrySchema>

// Ordering
export const OrderingSchema = z.object({
  sequence: z.array(z.string()).describe('e.g., ["primary_claim", "supporting:0"]'),
  why_this_order: z.string().describe('Short, concrete reasoning'),
})
export type Ordering = z.infer<typeof OrderingSchema>

// Claim strength
export const ClaimStrengthSchema = z.enum(['soft', 'firm', 'bold'])
export type ClaimStrength = z.infer<typeof ClaimStrengthSchema>

// Full MessageArchitecture schema (Artifact B)
export const MessageArchitectureSchema = z.object({
  throughline: z.string().describe('One sentence that could be the title'),
  primary_claim: z.string().describe('The single claim reader must walk away with'),
  supporting_claims: z.array(SupportingClaimSchema),
  proof_plan: z.array(ProofPlanEntrySchema),
  objection_plan: z.array(ObjectionPlanEntrySchema),
  ordering: OrderingSchema,
  allowed_claim_strength: ClaimStrengthSchema,
  // Global optional keys
  missing_inputs: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
})
export type MessageArchitecture = z.infer<typeof MessageArchitectureSchema>
