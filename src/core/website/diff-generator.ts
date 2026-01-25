/**
 * Diff Generator
 * 
 * Generates before/after recommendations for sections that need work.
 * CRITICAL: Only uses facts from the inventory. Never invents.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { 
  SiteAudit, 
  AuditedSection,
  FactInventory,
  DomainProfile,
  CopyRecommendation,
} from '@/lib/schemas/website'
import { formatFactConstraint } from './fact-inventory'
import { WEBSITE_PHILOSOPHY } from './enterprise-philosophy'

// ============================================================================
// COPY GENERATION WITH STRICT CONSTRAINTS
// ============================================================================

const CONSTRAINED_GENERATION_SYSTEM = `You rewrite website copy sections using ONLY provided facts.

${WEBSITE_PHILOSOPHY}

CRITICAL CONSTRAINT:
You will be given a FACT INVENTORY. You may ONLY use facts from this inventory.
If you cannot find a fact in the inventory, DO NOT INCLUDE IT.
Never invent numbers, credentials, achievements, or specific claims.

WHEN FACTS ARE LIMITED:
- Focus on what you DO know
- Emphasize expertise and approach over stats
- Use the market/industry itself as content (if location provided)
- Keep it shorter rather than padding with fluff

STRUCTURE:
- Hero: 5-12 word headline, 15-25 word subheadline max
- About: Open with most interesting fact, build credibility, end with differentiator
- Services: Specific, not generic descriptions
- CTA: Clear action, not "Contact us today"

FORBIDDEN:
- Any number not in the fact inventory
- Any credential not in the fact inventory
- Any specific sale/property not in the fact inventory
- "Unmatched", "passionate about", "dedicated to", "helping you"
- Any claim you cannot trace to the inventory`

/**
 * Generate recommendations for all sections (batched for efficiency)
 */
export async function generateRecommendations(
  audit: SiteAudit,
  factInventory: FactInventory,
  domainProfile?: DomainProfile,
  onProgress?: (message: string) => void
): Promise<CopyRecommendation[]> {
  // Separate sections that need work from those to keep
  const sectionsToKeep = audit.sections.filter(s => s.assessment === 'keep')
  const sectionsNeedingWork = audit.sections.filter(s => s.assessment !== 'keep')

  // Create "keep" recommendations immediately (no API call needed)
  const keepRecommendations: CopyRecommendation[] = sectionsToKeep.map(section => ({
    sectionType: section.type,
    sectionLocation: section.location,
    action: 'keep',
    before: section.currentCopy,
    after: { headline: '', subheadline: '', body: '', cta: '' },
    reasoning: `This section is specific and effective. No changes needed.${section.issues.length > 0 ? ` Minor notes: ${section.issues.join(', ')}` : ''}`,
    factsUsed: [],
  }))

  if (sectionsNeedingWork.length === 0) {
    onProgress?.('All sections are good - no changes needed')
    return keepRecommendations
  }

  // Batch generate recommendations for sections needing work
  onProgress?.(`Generating recommendations for ${sectionsNeedingWork.length} sections...`)
  const workRecommendations = await batchGenerateRecommendations(
    sectionsNeedingWork,
    factInventory,
    domainProfile
  )

  // Combine and return in original order
  return audit.sections.map(section => {
    const keepRec = keepRecommendations.find(r => 
      r.sectionType === section.type && r.sectionLocation === section.location
    )
    if (keepRec) return keepRec

    const workRec = workRecommendations.find(r => 
      r.sectionType === section.type && r.sectionLocation === section.location
    )
    return workRec || keepRecommendations[0] // Fallback
  })
}

/**
 * Batch generate all recommendations in a single API call
 */
async function batchGenerateRecommendations(
  sections: AuditedSection[],
  factInventory: FactInventory,
  domainProfile?: DomainProfile
): Promise<CopyRecommendation[]> {
  const factConstraint = formatFactConstraint(factInventory)

  const BatchRecommendationSchema = z.object({
    recommendations: z.array(z.object({
      sectionIndex: z.number(),
      newCopy: z.object({
        headline: z.string(),
        subheadline: z.string(),
        body: z.string(),
        cta: z.string(),
      }),
      reasoning: z.string(),
      factsUsed: z.array(z.string()),
    })),
  })

  const sectionsContext = sections.map((s, i) => `
SECTION ${i}: ${s.type.toUpperCase()} - ${s.assessment.toUpperCase()}
Location: ${s.location}
Issues: ${s.issues.join(', ') || 'none'}
Current copy:
${s.currentCopy.headline ? `  Headline: "${s.currentCopy.headline}"` : ''}
${s.currentCopy.subheadline ? `  Subheadline: "${s.currentCopy.subheadline}"` : ''}
  Body: "${s.currentCopy.body}"
${s.currentCopy.cta ? `  CTA: "${s.currentCopy.cta}"` : ''}
`).join('\n---\n')

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: BatchRecommendationSchema,
    system: CONSTRAINED_GENERATION_SYSTEM,
    prompt: `${factConstraint}

Generate improved copy for ALL these sections. Use ONLY the facts above.

${sectionsContext}

For each section (by index), provide:
- New copy (headline, subheadline, body, cta - use empty string if not applicable)
- Reasoning for the changes
- Which facts from the inventory you used`,
  })

  // Map results back to full recommendations
  return sections.map((section, i) => {
    const rec = result.object.recommendations.find(r => r.sectionIndex === i)
    return {
      sectionType: section.type,
      sectionLocation: section.location,
      action: section.assessment,
      before: section.currentCopy,
      after: rec?.newCopy || { headline: '', subheadline: '', body: '', cta: '' },
      reasoning: rec?.reasoning || 'No specific changes generated',
      factsUsed: rec?.factsUsed || [],
    }
  })
}

/**
 * Generate recommendation for a single section
 */
async function generateSectionRecommendation(
  section: AuditedSection,
  factInventory: FactInventory,
  domainProfile?: DomainProfile
): Promise<CopyRecommendation> {
  
  // If section is marked as KEEP, return without generating new copy
  if (section.assessment === 'keep') {
    return {
      sectionType: section.type,
      sectionLocation: section.location,
      action: 'keep',
      before: section.currentCopy,
      after: {
        headline: '',
        subheadline: '',
        body: '',
        cta: '',
      },
      reasoning: `This section is specific and effective. No changes needed.${section.issues.length > 0 ? ` Minor notes: ${section.issues.join(', ')}` : ''}`,
      factsUsed: [],
    }
  }

  // Generate new copy with strict fact constraints
  const factConstraint = formatFactConstraint(factInventory)
  
  const RecommendationSchema = z.object({
    newCopy: z.object({
      headline: z.string().describe('New headline, or empty string'),
      subheadline: z.string().describe('New subheadline, or empty string'),
      body: z.string().describe('New body copy'),
      cta: z.string().describe('New CTA, or empty string'),
    }),
    reasoning: z.string().describe('Why these changes improve the section'),
    factsUsed: z.array(z.string()).describe('Which facts from inventory were used'),
  })

  const domainContext = domainProfile
    ? `\nINDUSTRY: ${domainProfile.subNiche}\nTERMINOLOGY TO USE: ${domainProfile.terminology.slice(0, 10).join(', ')}`
    : ''

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: RecommendationSchema,
    system: CONSTRAINED_GENERATION_SYSTEM,
    prompt: `${factConstraint}
${domainContext}

SECTION TYPE: ${section.type.toUpperCase()}
LOCATION: ${section.location}
ACTION NEEDED: ${section.assessment.toUpperCase()}
ISSUES: ${section.issues.join(', ') || 'None flagged'}

CURRENT COPY:
${section.currentCopy.headline ? `Headline: "${section.currentCopy.headline}"` : ''}
${section.currentCopy.subheadline ? `Subheadline: "${section.currentCopy.subheadline}"` : ''}
Body: "${section.currentCopy.body}"
${section.currentCopy.cta ? `CTA: "${section.currentCopy.cta}"` : ''}

Write improved copy using ONLY the facts above. Explain your changes and list which facts you used.`,
  })

  return {
    sectionType: section.type,
    sectionLocation: section.location,
    action: section.assessment,
    before: section.currentCopy,
    after: result.object.newCopy,
    reasoning: result.object.reasoning,
    factsUsed: result.object.factsUsed,
  }
}

/**
 * Format recommendations for display
 */
export function formatRecommendationsForDisplay(
  recommendations: CopyRecommendation[]
): string {
  return recommendations.map(rec => {
    const header = `[${rec.sectionType.toUpperCase()}] ${rec.action.toUpperCase()}`
    
    if (rec.action === 'keep') {
      return `${header}\n${'─'.repeat(50)}\n${rec.reasoning}\n`
    }

    const before = formatCopyBlock('BEFORE', rec.before)
    const after = formatCopyBlock('AFTER', rec.after)
    const why = `WHY: ${rec.reasoning}`
    const facts = rec.factsUsed.length > 0 
      ? `Facts used: ${rec.factsUsed.join(', ')}`
      : 'Facts used: None (kept generic)'

    return `${header}\n${'─'.repeat(50)}\n${before}\n${after}\n${why}\n${facts}\n`
  }).join('\n')
}

function formatCopyBlock(label: string, copy: { headline: string, subheadline: string, body: string, cta: string }): string {
  const parts: string[] = []
  if (copy.headline) parts.push(`Headline: "${copy.headline}"`)
  if (copy.subheadline) parts.push(`Subheadline: "${copy.subheadline}"`)
  if (copy.body) parts.push(`Body: "${copy.body}"`)
  if (copy.cta) parts.push(`CTA: "${copy.cta}"`)
  
  return `${label}:\n${parts.join('\n')}`
}
