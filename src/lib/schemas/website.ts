import { z } from 'zod'

// ============================================================================
// FACT INVENTORY - What we KNOW vs what we DON'T (anti-hallucination)
// ============================================================================

export const FactInventorySchema = z.object({
  // What we KNOW (from user prompt only)
  knownFacts: z.object({
    personal: z.array(z.string()).describe('Personal background facts, e.g., "20 years in Palm Beach"'),
    credentials: z.array(z.string()).describe('Education, certifications, e.g., "degree from Northwood University"'),
    specializations: z.array(z.string()).describe('Areas of focus, e.g., "historic homes", "West Palm Beach"'),
    achievements: z.array(z.string()).describe('Only specific numbers/achievements user provided'),
    location: z.array(z.string()).describe('Geographic specifics mentioned'),
    other: z.array(z.string()).describe('Any other relevant facts'),
  }),
  
  // What we DON'T know - explicitly flagged
  unknownGaps: z.array(z.string()).describe('What info is missing, e.g., "no sales volume provided"'),
  
  // Strategic pivot when stats are missing
  focusAreas: z.array(z.string()).describe('What to emphasize instead, e.g., "market expertise", "local knowledge"'),
  
  // Raw facts as a flat list for constraint injection
  allFactsList: z.array(z.string()).describe('All known facts as a flat list for prompt injection'),
})
export type FactInventory = z.infer<typeof FactInventorySchema>

// ============================================================================
// SITE AUDIT - Structure of existing website sections
// ============================================================================

export const SectionTypeSchema = z.enum([
  'hero',
  'about', 
  'services',
  'features',
  'testimonials',
  'cta',
  'contact',
  'other',
])
export type SectionType = z.infer<typeof SectionTypeSchema>

export const CurrentCopySchema = z.object({
  headline: z.string().describe('Section headline, or empty string'),
  subheadline: z.string().describe('Section subheadline, or empty string'),
  body: z.string().describe('Main body text'),
  cta: z.string().describe('Call to action text, or empty string'),
})
export type CurrentCopy = z.infer<typeof CurrentCopySchema>

export const SectionAssessmentSchema = z.enum(['keep', 'improve', 'rewrite'])
export type SectionAssessment = z.infer<typeof SectionAssessmentSchema>

export const AuditedSectionSchema = z.object({
  type: SectionTypeSchema,
  location: z.string().describe('Where on page, e.g., "Homepage, above fold"'),
  currentCopy: CurrentCopySchema,
  assessment: SectionAssessmentSchema,
  issues: z.array(z.string()).describe('Problems found, e.g., "generic slop", "missing differentiator"'),
})
export type AuditedSection = z.infer<typeof AuditedSectionSchema>

export const SiteAuditSchema = z.object({
  url: z.string(),
  pageTitle: z.string(),
  sections: z.array(AuditedSectionSchema),
  overallNotes: z.string().describe('High-level observations about the site'),
})
export type SiteAudit = z.infer<typeof SiteAuditSchema>

// ============================================================================
// COPY RECOMMENDATION - Before/After/Why per section
// ============================================================================

export const RecommendedCopySchema = z.object({
  headline: z.string().describe('New headline, or empty string if not applicable'),
  subheadline: z.string().describe('New subheadline, or empty string'),
  body: z.string().describe('New body copy'),
  cta: z.string().describe('New CTA, or empty string'),
})
export type RecommendedCopy = z.infer<typeof RecommendedCopySchema>

export const CopyRecommendationSchema = z.object({
  sectionType: SectionTypeSchema,
  sectionLocation: z.string(),
  action: SectionAssessmentSchema,
  
  before: CurrentCopySchema,
  after: RecommendedCopySchema,
  
  reasoning: z.string().describe('Why this change, or why keep as-is'),
  factsUsed: z.array(z.string()).describe('Which facts from inventory were used'),
})
export type CopyRecommendation = z.infer<typeof CopyRecommendationSchema>

// ============================================================================
// ADVISOR OUTPUT - Full result of the advisory process
// ============================================================================

export const WebsiteAdvisorOutputSchema = z.object({
  // Input summary
  websiteUrl: z.string(),
  userPrompt: z.string(),
  
  // The fact inventory (what we're allowed to use)
  factInventory: FactInventorySchema,
  
  // The audit of existing site
  siteAudit: SiteAuditSchema,
  
  // Section-by-section recommendations
  recommendations: z.array(CopyRecommendationSchema),
  
  // Summary stats
  summary: z.object({
    sectionsAnalyzed: z.number(),
    sectionsToKeep: z.number(),
    sectionsToImprove: z.number(),
    sectionsToRewrite: z.number(),
  }),
})
export type WebsiteAdvisorOutput = z.infer<typeof WebsiteAdvisorOutputSchema>

// ============================================================================
// API INPUT
// ============================================================================

export const WebsiteAdvisorInputSchema = z.object({
  websiteUrl: z.string().url(),
  prompt: z.string().min(10).describe('User prompt with facts about the business'),
})
export type WebsiteAdvisorInput = z.infer<typeof WebsiteAdvisorInputSchema>

// ============================================================================
// DOMAIN PROFILE - Simplified for advisor (from competitors/industry)
// ============================================================================

export const DomainProfileSchema = z.object({
  industry: z.string().describe('Broad industry category'),
  subNiche: z.string().describe('Specific niche'),
  location: z.string().describe('Geographic focus, or empty string'),
  
  // What good copy looks like in this niche
  goodPatterns: z.array(z.string()).describe('Patterns that work in this industry'),
  
  // What to avoid (slop indicators)
  slopIndicators: z.array(z.string()).describe('Generic phrases to avoid in this niche'),
  
  // Terminology to use
  terminology: z.array(z.string()).describe('Industry-specific terms'),
})
export type DomainProfile = z.infer<typeof DomainProfileSchema>
