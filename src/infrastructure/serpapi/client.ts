/**
 * SerpAPI Client
 * 
 * Used for:
 * - Google autocomplete suggestions
 * - "People also ask" questions
 * - Related searches
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KeywordSuggestion {
  keyword: string
  type: 'autocomplete' | 'related' | 'question'
}

export interface SerpAPIResponse {
  suggestions: KeywordSuggestion[]
  questions: string[]
  related_searches: string[]
}

interface GoogleAutocompleteResult {
  suggestions?: { value: string }[]
}

interface GoogleSearchResult {
  related_searches?: { query: string }[]
  related_questions?: { question: string }[]
}

// ============================================================================
// CLIENT
// ============================================================================

const SERPAPI_BASE = 'https://serpapi.com/search'

function getApiKey(): string {
  const key = process.env.SERPAPI_API_KEY
  if (!key) {
    throw new Error('SERPAPI_API_KEY not configured')
  }
  return key
}

/**
 * Get autocomplete suggestions for a query
 */
export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      engine: 'google_autocomplete',
      q: query,
      api_key: getApiKey(),
    })

    const response = await fetch(`${SERPAPI_BASE}?${params}`)
    if (!response.ok) {
      console.error('[SerpAPI] Autocomplete failed:', response.status)
      return []
    }

    const data: GoogleAutocompleteResult = await response.json()
    return data.suggestions?.map(s => s.value) || []
  } catch (error) {
    console.error('[SerpAPI] Autocomplete error:', error)
    return []
  }
}

/**
 * Get related searches and "People also ask" for a query
 */
export async function getRelatedSearches(query: string): Promise<{
  related: string[]
  questions: string[]
}> {
  try {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: getApiKey(),
      num: '10',
    })

    const response = await fetch(`${SERPAPI_BASE}?${params}`)
    if (!response.ok) {
      console.error('[SerpAPI] Search failed:', response.status)
      return { related: [], questions: [] }
    }

    const data: GoogleSearchResult = await response.json()
    
    return {
      related: data.related_searches?.map(r => r.query) || [],
      questions: data.related_questions?.map(q => q.question) || [],
    }
  } catch (error) {
    console.error('[SerpAPI] Related searches error:', error)
    return { related: [], questions: [] }
  }
}

/**
 * Get comprehensive keyword research for a topic
 */
export async function getKeywordResearch(topic: string): Promise<SerpAPIResponse> {
  // Run autocomplete and related searches in parallel
  const [autocomplete, relatedData] = await Promise.all([
    getAutocompleteSuggestions(topic),
    getRelatedSearches(topic),
  ])

  const suggestions: KeywordSuggestion[] = [
    ...autocomplete.map(k => ({ keyword: k, type: 'autocomplete' as const })),
    ...relatedData.related.map(k => ({ keyword: k, type: 'related' as const })),
    ...relatedData.questions.map(k => ({ keyword: k, type: 'question' as const })),
  ]

  // Deduplicate
  const seen = new Set<string>()
  const unique = suggestions.filter(s => {
    const lower = s.keyword.toLowerCase()
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })

  return {
    suggestions: unique,
    questions: relatedData.questions,
    related_searches: relatedData.related,
  }
}

/**
 * Extract keywords from competitor URLs (scrape top results)
 */
export async function getCompetitorUrls(query: string, limit: number = 5): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: getApiKey(),
      num: String(limit),
    })

    const response = await fetch(`${SERPAPI_BASE}?${params}`)
    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.organic_results?.map((r: { link: string }) => r.link) || []
  } catch (error) {
    console.error('[SerpAPI] Competitor URLs error:', error)
    return []
  }
}

