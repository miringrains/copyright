/**
 * Domain Immersion Pipeline
 * 
 * The key innovation: Build genuine domain expertise BEFORE writing.
 * 
 * This prevents AI slop by:
 * 1. Discovering how experts in THIS specific field actually communicate
 * 2. Identifying domain-specific terminology
 * 3. Building a forbidden list of generic phrases that don't fit this niche
 * 4. Learning claim and proof patterns from top competitors
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { scrapeUrl } from '@/infrastructure/firecrawl/client'
import { getCompetitorUrls } from '@/infrastructure/serpapi/client'
import { 
  DomainProfileSchema, 
  type DomainProfile,
  type ImmersionResult 
} from '@/lib/schemas/website'

// ============================================================================
// TYPES
// ============================================================================

export interface ImmersionCallbacks {
  onProgress: (phase: string, message: string, data?: unknown) => void
  onError: (message: string) => void
}

interface ScrapedSite {
  url: string
  content: string
  name: string
}

// ============================================================================
// STEP 1: DISCOVER COMPETITORS
// ============================================================================

/**
 * Find competitors in the same niche via SerpAPI
 */
async function discoverCompetitors(
  clientUrl: string,
  clientContent: string,
  callbacks: ImmersionCallbacks
): Promise<string[]> {
  callbacks.onProgress('discover', 'Analyzing client site to identify niche...')
  
  // Extract niche/industry from client site
  const nicheResult = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: z.object({
      industry: z.string(),
      subNiche: z.string(),
      location: z.string().optional(),
      searchQueries: z.array(z.string()).describe('3-5 search queries to find competitors'),
    }),
    system: `You identify the specific niche of a business from their website content.
Be SPECIFIC. Not "real estate" but "Palm Beach luxury real estate agent".
Generate search queries that would find direct competitors.`,
    prompt: `Website URL: ${clientUrl}

Content:
${clientContent.slice(0, 8000)}

Identify:
1. The specific industry/niche
2. Location if relevant
3. Search queries to find competitors (e.g., "palm beach luxury real estate agent", "west palm beach historic homes realtor")`,
  })

  callbacks.onProgress('discover', `Identified niche: ${nicheResult.object.subNiche}`, nicheResult.object)

  // Search for competitors
  const allCompetitorUrls: string[] = []
  
  for (const query of nicheResult.object.searchQueries.slice(0, 3)) {
    callbacks.onProgress('discover', `Searching: "${query}"...`)
    const urls = await getCompetitorUrls(query, 5)
    allCompetitorUrls.push(...urls)
  }

  // Deduplicate and filter out the client's own site
  const clientDomain = new URL(clientUrl).hostname.replace('www.', '')
  const uniqueUrls = [...new Set(allCompetitorUrls)]
    .filter(url => {
      try {
        const domain = new URL(url).hostname.replace('www.', '')
        return domain !== clientDomain
      } catch {
        return false
      }
    })
    // Filter out directories, aggregators, etc.
    .filter(url => {
      const lower = url.toLowerCase()
      return !lower.includes('zillow') &&
             !lower.includes('realtor.com') &&
             !lower.includes('redfin') &&
             !lower.includes('yelp') &&
             !lower.includes('yellowpages') &&
             !lower.includes('linkedin') &&
             !lower.includes('facebook') &&
             !lower.includes('instagram')
    })

  callbacks.onProgress('discover', `Found ${uniqueUrls.length} potential competitors`)
  return uniqueUrls.slice(0, 8) // Limit to 8 competitors
}

// ============================================================================
// STEP 2: MULTI-SITE SCRAPING
// ============================================================================

/**
 * Scrape multiple competitor sites
 */
async function scrapeCompetitors(
  urls: string[],
  callbacks: ImmersionCallbacks
): Promise<ScrapedSite[]> {
  callbacks.onProgress('scrape', `Scraping ${urls.length} competitor sites...`)
  
  const scraped: ScrapedSite[] = []
  
  for (const url of urls.slice(0, 5)) { // Limit to top 5
    try {
      callbacks.onProgress('scrape', `Scraping ${new URL(url).hostname}...`)
      const result = await scrapeUrl(url)
      
      if (result?.content && result.content.length > 500) {
        scraped.push({
          url,
          content: result.content,
          name: (result.metadata?.title as string) || new URL(url).hostname,
        })
      }
    } catch (error) {
      console.warn(`Failed to scrape ${url}:`, error)
    }
  }

  callbacks.onProgress('scrape', `Successfully scraped ${scraped.length} competitor sites`)
  return scraped
}

// ============================================================================
// STEP 3: LANGUAGE ANALYSIS
// ============================================================================

/**
 * Analyze scraped content to build domain expertise
 */
async function analyzeLanguage(
  clientContent: string,
  competitors: ScrapedSite[],
  callbacks: ImmersionCallbacks
): Promise<DomainProfile> {
  callbacks.onProgress('analyze', 'Analyzing language patterns across all sites...')

  // Combine all content for analysis
  const allContent = [
    `=== CLIENT SITE ===\n${clientContent.slice(0, 10000)}`,
    ...competitors.map(c => `=== ${c.name} ===\n${c.content.slice(0, 6000)}`),
  ].join('\n\n')

  const analysis = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: DomainProfileSchema,
    system: `You are analyzing website copy from businesses in the SAME niche to understand how EXPERTS in this field actually communicate.

YOUR JOB IS NOT TO SUMMARIZE. Your job is to identify:

1. TERMINOLOGY
   - What specific words/phrases do experts use that a generic marketer wouldn't know?
   - What are the insider terms? The neighborhood names? The technical terms?
   - What phrases do they use to describe value that feel authentic vs generic?

2. CLAIM PATTERNS
   - How do the BEST sites describe their value? (specific vs vague)
   - What proof do they cite? (numbers, experience, specific deals, credentials)
   - What makes some claims feel credible vs hollow?

3. VOICE CHARACTERISTICS
   - How do they relate to their audience? (peer, expert, advisor)
   - Direct or understated?
   - How do they handle credentials without bragging?

4. SLOP DETECTION - THIS IS CRITICAL
   - What generic marketing phrases appear on BAD sites but not good ones?
   - What clichés should we NEVER use in this niche?
   - What phrases feel like "AI wrote this" in this specific context?
   
Examples of domain-specific slop to identify:
- Real estate: "unmatched network", "few can rival", "hyper-local", "dream home"
- Tech: "cutting-edge", "state-of-the-art", "leverage", "synergy"
- Legal: "zealous advocate", "fight for you", "aggressive representation"

5. GOOD VS BAD EXAMPLES
   - Find 3-5 sentences from the content that WORK (specific, credible, expert-sounding)
   - Find 3-5 sentences that are SLOP (generic, hollow, could be any business)

Rate each competitor as excellent/good/average/poor based on their copy quality.`,
    prompt: `Analyze this content from businesses in the same niche:

${allContent}

Build a comprehensive domain profile. Be SPECIFIC about terminology, patterns, and forbidden phrases.`,
  })

  callbacks.onProgress('analyze', 'Language analysis complete', {
    terminology: analysis.object.terminology.terms.length,
    forbiddenPhrases: analysis.object.forbiddenInThisNiche.length,
    goodExamples: analysis.object.goodExamples.length,
  })

  return analysis.object
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Run the full domain immersion pipeline
 */
export async function runDomainImmersion(
  websiteUrl: string,
  callbacks: ImmersionCallbacks
): Promise<ImmersionResult> {
  const startTime = Date.now()
  let scrapeTime = 0
  let analysisTime = 0

  try {
    // Step 1: Scrape client site
    callbacks.onProgress('scrape', `Scraping ${websiteUrl}...`)
    const scrapeStart = Date.now()
    
    const clientResult = await scrapeUrl(websiteUrl)
    if (!clientResult?.content || clientResult.content.length < 200) {
      throw new Error('Could not scrape client website or content too short')
    }
    
    const clientContent = clientResult.content
    callbacks.onProgress('scrape', `Scraped ${clientContent.length} characters from client site`)

    // Step 2: Discover competitors
    const competitorUrls = await discoverCompetitors(websiteUrl, clientContent, callbacks)
    
    // Step 3: Scrape competitors
    const scrapedCompetitors = await scrapeCompetitors(competitorUrls, callbacks)
    scrapeTime = Date.now() - scrapeStart

    // Step 4: Analyze language patterns
    const analysisStart = Date.now()
    const domainProfile = await analyzeLanguage(clientContent, scrapedCompetitors, callbacks)
    analysisTime = Date.now() - analysisStart

    const totalTime = Date.now() - startTime

    callbacks.onProgress('complete', 'Domain immersion complete', {
      industry: domainProfile.industry,
      subNiche: domainProfile.subNiche,
      competitorsAnalyzed: domainProfile.competitorsAnalyzed.length,
      terminologyCount: domainProfile.terminology.terms.length,
      forbiddenCount: domainProfile.forbiddenInThisNiche.length,
    })

    return {
      domainProfile,
      scrapedContent: {
        clientSite: clientContent,
        competitors: scrapedCompetitors.map(c => ({
          url: c.url,
          content: c.content,
        })),
      },
      timing: {
        scrapeMs: scrapeTime,
        analysisMs: analysisTime,
        totalMs: totalTime,
      },
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : 'Domain immersion failed')
    throw error
  }
}

/**
 * Quick immersion with just the client site (no competitors)
 * For when speed matters more than depth
 */
export async function runQuickImmersion(
  websiteUrl: string,
  additionalContext: string | undefined,
  callbacks: ImmersionCallbacks
): Promise<DomainProfile> {
  callbacks.onProgress('scrape', `Scraping ${websiteUrl}...`)
  
  const clientResult = await scrapeUrl(websiteUrl)
  if (!clientResult?.content) {
    throw new Error('Could not scrape website')
  }

  callbacks.onProgress('analyze', 'Analyzing content...')

  const combinedContent = additionalContext 
    ? `${clientResult.content}\n\n=== ADDITIONAL CONTEXT ===\n${additionalContext}`
    : clientResult.content

  const profile = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: DomainProfileSchema,
    system: `You are building a domain expertise profile from website content.
Identify terminology, voice characteristics, and what slop to avoid in this specific niche.
Even without competitors, you can identify industry-specific language patterns.`,
    prompt: `Build a domain profile from this content:

${combinedContent.slice(0, 15000)}

Identify the industry-specific terminology, voice patterns, and phrases to avoid.`,
  })

  callbacks.onProgress('complete', 'Quick immersion complete')
  return profile.object
}
