import { z } from 'zod'

// ============================================================================
// DOMAIN PROFILE - Captures how experts in a specific field communicate
// ============================================================================

export const TerminologySchema = z.object({
  terms: z.array(z.string()).describe('Domain-specific words (e.g., "oceanfront", "intracoastal")'),
  phrases: z.array(z.string()).describe('Expert phrases (e.g., "priced to reflect", "under contract within")'),
  claimPatterns: z.array(z.string()).describe('How experts describe their value'),
  proofPatterns: z.array(z.string()).describe('How experts establish credibility'),
})
export type Terminology = z.infer<typeof TerminologySchema>

export const VoiceInsightsSchema = z.object({
  relationship: z.enum(['insider_peer', 'authoritative_expert', 'trusted_advisor', 'industry_veteran'])
    .describe('How they relate to their audience'),
  claimStyle: z.enum(['direct', 'understated', 'confident', 'humble'])
    .describe('How they make claims'),
  proofStyle: z.enum(['numbers', 'social_proof', 'case_stories', 'credentials', 'mixed'])
    .describe('Primary proof mechanism'),
  toneNotes: z.string().describe('Additional tone observations'),
})
export type VoiceInsights = z.infer<typeof VoiceInsightsSchema>

export const DomainProfileSchema = z.object({
  industry: z.string().describe('Broad industry category'),
  subNiche: z.string().describe('Specific niche (e.g., "Palm Beach luxury real estate")'),
  location: z.string().optional().describe('Geographic focus if relevant'),
  
  // Language patterns from actual experts
  terminology: TerminologySchema,
  
  // What to AVOID (domain-specific slop)
  forbiddenInThisNiche: z.array(z.string()).describe('Phrases that are slop in this specific niche'),
  genericPhrases: z.array(z.string()).describe('Generic marketing phrases to avoid'),
  
  // Voice characteristics discovered
  voiceInsights: VoiceInsightsSchema,
  
  // Examples to learn from
  goodExamples: z.array(z.string()).describe('Sentences from top competitors that work'),
  badExamples: z.array(z.string()).describe('Sentences that are clearly slop'),
  
  // Sources analyzed
  competitorsAnalyzed: z.array(z.object({
    url: z.string(),
    name: z.string(),
    quality: z.enum(['excellent', 'good', 'average', 'poor']),
  })),
})
export type DomainProfile = z.infer<typeof DomainProfileSchema>

// ============================================================================
// WEBSITE REQUEST - Parsed from freeform user prompt
// ============================================================================

export const WebsiteScopeSchema = z.enum([
  'hero',
  'about',
  'services',
  'features',
  'testimonials',
  'cta',
  'full_page',
  'multi_section',
  'custom',
])
export type WebsiteScope = z.infer<typeof WebsiteScopeSchema>

export const WebsiteIntentSchema = z.enum([
  'rewrite',      // Replace existing copy
  'create',       // Write from scratch
  'improve',      // Enhance existing copy
  'compare',      // Show before/after
  'tone_shift',   // Keep content, change voice
])
export type WebsiteIntent = z.infer<typeof WebsiteIntentSchema>

export const WebsiteConstraintsSchema = z.object({
  wordCount: z.number().optional().describe('Target word count'),
  tone: z.string().optional().describe('Desired tone'),
  mustInclude: z.array(z.string()).default([]).describe('Required elements'),
  mustAvoid: z.array(z.string()).default([]).describe('Elements to avoid'),
  targetAudience: z.string().optional().describe('Who this copy is for'),
})
export type WebsiteConstraints = z.infer<typeof WebsiteConstraintsSchema>

export const WebsiteRequestSchema = z.object({
  scope: WebsiteScopeSchema,
  sections: z.array(z.string()).default([]).describe('Specific sections if multi_section'),
  intent: WebsiteIntentSchema,
  constraints: WebsiteConstraintsSchema,
  originalPrompt: z.string().describe('The user\'s original freeform prompt'),
  extractedFacts: z.array(z.string()).default([]).describe('Facts extracted from the prompt'),
  clarifyingQuestions: z.array(z.string()).default([]).describe('Questions to ask if ambiguous'),
  needsClarification: z.boolean().default(false),
})
export type WebsiteRequest = z.infer<typeof WebsiteRequestSchema>

// ============================================================================
// WEBSITE COPY OUTPUT
// ============================================================================

export const WebsiteCopySectionSchema = z.object({
  type: z.string().describe('Section type (hero, about, etc.)'),
  headline: z.string().describe('Headline for this section, or empty string if not applicable'),
  subheadline: z.string().describe('Subheadline, or empty string if not applicable'),
  body: z.string().describe('Main body copy'),
  cta: z.string().describe('Call to action text, or empty string if not applicable'),
  notes: z.string().describe('Why this works - brief explanation'),
})
export type WebsiteCopySection = z.infer<typeof WebsiteCopySectionSchema>

export const WebsiteCopyVariantSchema = z.object({
  style: z.enum(['direct', 'story_led', 'conversational']),
  sections: z.array(WebsiteCopySectionSchema),
  wordCount: z.number(),
})
export type WebsiteCopyVariant = z.infer<typeof WebsiteCopyVariantSchema>

export const WebsiteCopyOutputSchema = z.object({
  primary: z.object({
    sections: z.array(WebsiteCopySectionSchema),
    wordCount: z.number(),
  }),
  variants: z.object({
    direct: WebsiteCopyVariantSchema.optional(),
    story_led: WebsiteCopyVariantSchema.optional(),
    conversational: WebsiteCopyVariantSchema.optional(),
  }),
  domainProfile: DomainProfileSchema,
  slopChecks: z.object({
    universalViolations: z.array(z.string()),
    domainViolations: z.array(z.string()),
    passed: z.boolean(),
  }),
})
export type WebsiteCopyOutput = z.infer<typeof WebsiteCopyOutputSchema>

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

export const WebsiteInputSchema = z.object({
  websiteUrl: z.string().url(),
  prompt: z.string().min(10).describe('Freeform description of what user wants'),
  additionalContext: z.string().optional(),
  referenceUrls: z.array(z.string().url()).default([]).describe('URLs to reference for style'),
})
export type WebsiteInput = z.infer<typeof WebsiteInputSchema>

export const ImmersionResultSchema = z.object({
  domainProfile: DomainProfileSchema,
  scrapedContent: z.object({
    clientSite: z.string(),
    competitors: z.array(z.object({
      url: z.string(),
      content: z.string(),
    })),
  }),
  timing: z.object({
    scrapeMs: z.number(),
    analysisMs: z.number(),
    totalMs: z.number(),
  }),
})
export type ImmersionResult = z.infer<typeof ImmersionResultSchema>
