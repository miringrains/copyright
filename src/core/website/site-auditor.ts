/**
 * Site Auditor
 * 
 * Scrapes existing website and structures it into auditable sections.
 * NO generation - just extraction and structuring.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { scrapeUrl } from '@/infrastructure/firecrawl/client'
import { SiteAuditSchema, type SiteAudit, type AuditedSection } from '@/lib/schemas/website'
import { z } from 'zod'

// ============================================================================
// SECTION EXTRACTION
// ============================================================================

const SECTION_EXTRACTION_SYSTEM = `You analyze website content and extract it into structured sections.

YOUR JOB: Identify distinct copy sections on the page and extract their content.

SECTION TYPES:
- hero: Main headline/value prop area, usually at top
- about: About the person/company, bio, background
- services: What they offer, service descriptions
- features: Product/service features, benefits
- testimonials: Reviews, social proof, quotes
- cta: Call to action sections
- contact: Contact information, forms
- other: Anything that doesn't fit above

FOR EACH SECTION, EXTRACT:
- headline: The main heading (if any)
- subheadline: Secondary heading (if any)
- body: The main paragraph/text content
- cta: Any call-to-action text (button text, links)

RULES:
1. Extract the ACTUAL text, don't summarize or interpret
2. If a section doesn't have a headline, use empty string
3. Preserve the original wording exactly
4. Don't skip sections - capture all meaningful copy areas`

/**
 * Scrape website and extract into structured sections
 */
export async function auditSite(
  url: string,
  onProgress?: (message: string) => void
): Promise<SiteAudit> {
  // Step 1: Scrape the site
  onProgress?.(`Scraping ${url}...`)
  
  const scrapeResult = await scrapeUrl(url)
  if (!scrapeResult?.content || scrapeResult.content.length < 100) {
    throw new Error('Could not scrape website or content too short')
  }

  const pageTitle = (scrapeResult.metadata?.title as string) || new URL(url).hostname
  const content = scrapeResult.content

  onProgress?.(`Scraped ${content.length} characters, analyzing structure...`)

  // Step 2: Extract sections using AI (extraction only, no generation)
  const SectionsSchema = z.object({
    sections: z.array(z.object({
      type: z.enum(['hero', 'about', 'services', 'features', 'testimonials', 'cta', 'contact', 'other']),
      location: z.string().describe('Where on page this appears'),
      currentCopy: z.object({
        headline: z.string().describe('Section headline, or empty string'),
        subheadline: z.string().describe('Section subheadline, or empty string'),
        body: z.string().describe('Main body text'),
        cta: z.string().describe('CTA text, or empty string'),
      }),
    })),
    overallNotes: z.string().describe('High-level observations about the site copy'),
  })

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: SectionsSchema,
    system: SECTION_EXTRACTION_SYSTEM,
    prompt: `Analyze this website content and extract all copy sections.

URL: ${url}
PAGE TITLE: ${pageTitle}

CONTENT:
${content.slice(0, 15000)}

Extract each distinct section with its actual text content.`,
  })

  onProgress?.(`Found ${result.object.sections.length} sections`)

  // Step 3: Add initial assessment (will be refined by section-advisor)
  const sectionsWithAssessment: AuditedSection[] = result.object.sections.map(section => ({
    ...section,
    assessment: 'improve' as const, // Default, will be refined
    issues: [], // Will be populated by section-advisor
  }))

  return {
    url,
    pageTitle,
    sections: sectionsWithAssessment,
    overallNotes: result.object.overallNotes,
  }
}

/**
 * Get a quick summary of what sections exist on a site
 */
export async function quickSectionScan(
  url: string,
  onProgress?: (message: string) => void
): Promise<{ sections: string[], notes: string }> {
  onProgress?.(`Quick scan of ${url}...`)
  
  const scrapeResult = await scrapeUrl(url)
  if (!scrapeResult?.content) {
    throw new Error('Could not scrape website')
  }

  const QuickScanSchema = z.object({
    sections: z.array(z.string()).describe('List of section types found'),
    notes: z.string().describe('Brief notes on the site structure'),
  })

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: QuickScanSchema,
    system: 'Quickly identify what copy sections exist on this website. Just list the types.',
    prompt: `What sections exist on this site?\n\n${scrapeResult.content.slice(0, 8000)}`,
  })

  return result.object
}
