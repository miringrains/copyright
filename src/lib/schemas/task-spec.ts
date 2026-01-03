import { z } from 'zod'

// Copy type and channel enums
export const CopyTypeSchema = z.enum(['email', 'website', 'social', 'article'])
export type CopyType = z.infer<typeof CopyTypeSchema>

export const ChannelSchema = z.enum([
  'email_newsletter',
  'email_cold',
  'email_follow_up',
  'landing_page',
  'homepage',
  'product_page',
  'about_page',
  'x_post',
  'linkedin_post',
  'instagram_caption',
  'blog_post',
  'op_ed',
  'case_study',
  'white_paper',
])
export type Channel = z.infer<typeof ChannelSchema>

// Audience model
export const AudienceSchema = z.object({
  who: z.string().describe('Role or persona of the target reader'),
  context: z.string().describe('What is happening in their world'),
  skepticism_level: z.enum(['low', 'medium', 'high']),
  prior_knowledge: z.enum(['low', 'medium', 'high']),
})
export type Audience = z.infer<typeof AudienceSchema>

// Goal
export const GoalSchema = z.object({
  primary_action: z.string().describe('What you want them to do/think/feel'),
  success_metric: z.string().describe('How success is measured'),
})
export type Goal = z.infer<typeof GoalSchema>

// Proof material types
export const ProofTypeSchema = z.enum([
  'data',
  'quote',
  'case',
  'mechanism',
  'constraint',
  'comparison',
])
export type ProofType = z.infer<typeof ProofTypeSchema>

export const ProofMaterialSchema = z.object({
  type: ProofTypeSchema,
  content: z.string(),
})
export type ProofMaterial = z.infer<typeof ProofMaterialSchema>

// Inputs
export const InputsSchema = z.object({
  product_or_topic: z.string().describe('What this is about'),
  offer_or_claim_seed: z.string().optional().describe('The core claim if you have it'),
  proof_material: z.array(ProofMaterialSchema).default([]),
  must_include: z.array(z.string()).default([]),
  must_avoid: z.array(z.string()).optional().default([]),
})
export type Inputs = z.infer<typeof InputsSchema>

// Voice profile
export const VoiceProfileSchema = z.object({
  persona: z.string().describe('e.g., calm operator, blunt expert, witty insider'),
  formality: z.enum(['low', 'medium', 'high']),
  stance: z.string().describe('What we explicitly believe'),
  taboos: z.array(z.string()).default([]).describe('What we refuse to sound like'),
  reference_texts: z.array(z.string()).optional().default([]),
})
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>

// Length budget
export const LengthBudgetSchema = z.object({
  unit: z.enum(['words', 'chars']),
  target: z.number().positive(),
  hard_max: z.number().positive(),
})
export type LengthBudget = z.infer<typeof LengthBudgetSchema>

// Full TaskSpec schema
export const TaskSpecSchema = z.object({
  copy_type: CopyTypeSchema,
  channel: ChannelSchema,
  audience: AudienceSchema,
  goal: GoalSchema,
  inputs: InputsSchema,
  voice_profile: VoiceProfileSchema,
  length_budget: LengthBudgetSchema,
})
export type TaskSpec = z.infer<typeof TaskSpecSchema>

