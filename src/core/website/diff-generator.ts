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
 * Generate recommendations for all sections needing work
 */
export async function generateRecommendations(
  audit: SiteAudit,
  factInventory: FactInventory,
  domainProfile?: DomainProfile,
  onProgress?: (message: string) => void
): Promise<CopyRecommendation[]> {
  const recommendations: CopyRecommendation[] = []

  for (const section of audit.sections) {
    onProgress?.(`Generating recommendation for ${section.type}...`)
    
    const recommendation = await generateSectionRecommendation(
      section,
      factInventory,
      domainProfile
    )
    
    recommendations.push(recommendation)
  }

  return recommendations
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
