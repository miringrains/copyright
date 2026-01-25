/**
 * Section Advisor
 * 
 * Analyzes each section and determines: keep, improve, or rewrite.
 * Uses fact inventory and domain knowledge to make strategic decisions.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { 
  SiteAudit, 
  AuditedSection, 
  FactInventory,
  DomainProfile,
  SectionAssessment 
} from '@/lib/schemas/website'
import { UNIVERSAL_FORBIDDEN } from '@/core/copy-type-rules'

// ============================================================================
// SECTION ASSESSMENT
// ============================================================================

const ASSESSMENT_SYSTEM = `You assess website copy sections to determine if they need changes.

YOUR JOB: For each section, decide: KEEP, IMPROVE, or REWRITE.

KEEP when:
- Copy is specific and concrete (uses real numbers, names, details)
- Voice is appropriate for the industry
- No generic marketing slop
- Content is accurate (if we can verify with provided facts)

IMPROVE when:
- Core message is good but could be tightened
- Some generic phrases that could be more specific
- Structure is fine but word choice needs work
- Missing a key fact that was provided

REWRITE when:
- Full of generic slop ("unmatched", "dedicated to", "passionate about")
- Makes claims that contradict or ignore provided facts
- Voice is completely wrong for the industry
- So generic it could apply to any business

ISSUES TO FLAG:
- "generic slop" - hollow marketing language
- "missing differentiator" - nothing unique
- "contradicts facts" - says something different from what we know
- "could use provided facts" - we have info that isn't being used
- "wrong voice" - tone doesn't match industry
- "vague claims" - superlatives without proof`

interface SectionWithAssessment extends AuditedSection {
  assessment: SectionAssessment
  issues: string[]
}

/**
 * Assess all sections in a site audit (batched for efficiency)
 */
export async function assessSections(
  audit: SiteAudit,
  factInventory: FactInventory,
  domainProfile?: DomainProfile,
  onProgress?: (message: string) => void
): Promise<SiteAudit> {
  onProgress?.(`Assessing ${audit.sections.length} sections...`)

  // First, do rule-based slop check on all sections
  const sectionsWithSlop = audit.sections.map(section => ({
    ...section,
    slopIssues: checkForSlop(section),
  }))

  // Then batch all AI assessments into ONE call
  onProgress?.('Running strategic assessment...')
  const assessedSections = await batchAssessSections(sectionsWithSlop, factInventory, domainProfile)

  // Count results
  const keepCount = assessedSections.filter(s => s.assessment === 'keep').length
  const improveCount = assessedSections.filter(s => s.assessment === 'improve').length
  const rewriteCount = assessedSections.filter(s => s.assessment === 'rewrite').length

  onProgress?.(`Assessment complete: ${keepCount} keep, ${improveCount} improve, ${rewriteCount} rewrite`)

  return {
    ...audit,
    sections: assessedSections,
  }
}

/**
 * Batch assess all sections in a single API call
 */
async function batchAssessSections(
  sections: Array<AuditedSection & { slopIssues: string[] }>,
  factInventory: FactInventory,
  domainProfile?: DomainProfile
): Promise<SectionWithAssessment[]> {
  const BatchAssessmentSchema = z.object({
    assessments: z.array(z.object({
      sectionIndex: z.number(),
      assessment: z.enum(['keep', 'improve', 'rewrite']),
      issues: z.array(z.string()),
    })),
  })

  const factsContext = factInventory.allFactsList.length > 0
    ? `KNOWN FACTS:\n${factInventory.allFactsList.map(f => `- ${f}`).join('\n')}`
    : 'No specific facts provided.'

  const sectionsContext = sections.map((s, i) => `
SECTION ${i}: ${s.type.toUpperCase()} (${s.location})
${s.currentCopy.headline ? `Headline: "${s.currentCopy.headline}"` : ''}
${s.currentCopy.subheadline ? `Subheadline: "${s.currentCopy.subheadline}"` : ''}
Body: "${s.currentCopy.body.slice(0, 500)}${s.currentCopy.body.length > 500 ? '...' : ''}"
${s.currentCopy.cta ? `CTA: "${s.currentCopy.cta}"` : ''}
Pre-detected issues: ${s.slopIssues.length > 0 ? s.slopIssues.join(', ') : 'none'}
`).join('\n---\n')

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: BatchAssessmentSchema,
    system: ASSESSMENT_SYSTEM,
    prompt: `Assess ALL of these sections at once. For each, determine: KEEP, IMPROVE, or REWRITE.

${factsContext}

${sectionsContext}

Return an assessment for each section by index (0-${sections.length - 1}).`,
  })

  // Map results back to sections
  return sections.map((section, i) => {
    const assessment = result.object.assessments.find(a => a.sectionIndex === i)
    return {
      type: section.type,
      location: section.location,
      currentCopy: section.currentCopy,
      assessment: assessment?.assessment || 'improve',
      issues: [...section.slopIssues, ...(assessment?.issues || [])],
    }
  })
}

/**
 * Assess a single section
 */
async function assessSingleSection(
  section: AuditedSection,
  factInventory: FactInventory,
  domainProfile?: DomainProfile
): Promise<SectionWithAssessment> {
  
  // First, do a quick slop check with rules
  const slopIssues = checkForSlop(section)
  
  // Then get AI assessment
  const AssessmentSchema = z.object({
    assessment: z.enum(['keep', 'improve', 'rewrite']),
    issues: z.array(z.string()),
    reasoning: z.string(),
  })

  const factsContext = factInventory.allFactsList.length > 0
    ? `KNOWN FACTS ABOUT THIS BUSINESS:\n${factInventory.allFactsList.map(f => `- ${f}`).join('\n')}`
    : 'No specific facts provided about this business.'

  const domainContext = domainProfile
    ? `INDUSTRY: ${domainProfile.subNiche}\nSLOP TO AVOID: ${domainProfile.slopIndicators.slice(0, 5).join(', ')}`
    : ''

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: AssessmentSchema,
    system: ASSESSMENT_SYSTEM,
    prompt: `Assess this ${section.type.toUpperCase()} section:

CURRENT COPY:
${section.currentCopy.headline ? `Headline: "${section.currentCopy.headline}"` : ''}
${section.currentCopy.subheadline ? `Subheadline: "${section.currentCopy.subheadline}"` : ''}
Body: "${section.currentCopy.body}"
${section.currentCopy.cta ? `CTA: "${section.currentCopy.cta}"` : ''}

${factsContext}

${domainContext}

Should this section be kept as-is, improved, or fully rewritten? What issues exist?`,
  })

  // Combine rule-based and AI-detected issues
  const allIssues = [...new Set([...slopIssues, ...result.object.issues])]

  return {
    ...section,
    assessment: result.object.assessment,
    issues: allIssues,
  }
}

/**
 * Quick rule-based slop detection
 */
function checkForSlop(section: AuditedSection): string[] {
  const issues: string[] = []
  const fullText = [
    section.currentCopy.headline,
    section.currentCopy.subheadline,
    section.currentCopy.body,
    section.currentCopy.cta,
  ].join(' ').toLowerCase()

  // Check for universal forbidden phrases
  for (const forbidden of UNIVERSAL_FORBIDDEN) {
    if (fullText.includes(forbidden.toLowerCase())) {
      issues.push(`generic slop: "${forbidden}"`)
    }
  }

  // Check for common slop patterns
  const slopPatterns = [
    { pattern: /dream home/i, issue: 'generic: "dream home"' },
    { pattern: /unmatched|unparalleled/i, issue: 'hollow superlative' },
    { pattern: /passionate about/i, issue: 'generic: "passionate about"' },
    { pattern: /dedicated to/i, issue: 'generic: "dedicated to"' },
    { pattern: /committed to/i, issue: 'generic: "committed to"' },
    { pattern: /helping you/i, issue: 'generic: "helping you"' },
    { pattern: /your journey/i, issue: 'generic: "journey"' },
    { pattern: /best-in-class|world-class/i, issue: 'unsupported superlative' },
    { pattern: /few can rival/i, issue: 'hollow claim' },
  ]

  for (const { pattern, issue } of slopPatterns) {
    if (pattern.test(fullText)) {
      issues.push(issue)
    }
  }

  return issues
}

/**
 * Get a summary of section assessments
 */
export function summarizeAssessments(audit: SiteAudit): {
  keep: string[]
  improve: string[]
  rewrite: string[]
} {
  return {
    keep: audit.sections.filter(s => s.assessment === 'keep').map(s => s.type),
    improve: audit.sections.filter(s => s.assessment === 'improve').map(s => s.type),
    rewrite: audit.sections.filter(s => s.assessment === 'rewrite').map(s => s.type),
  }
}
