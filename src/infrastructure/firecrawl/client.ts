import type { 
  FirecrawlScrapeOptions, 
  FirecrawlScrapeResponse,
  FirecrawlConfig 
} from './types'

const DEFAULT_BASE_URL = 'https://api.firecrawl.dev/v1'

export class FirecrawlClient {
  private apiKey: string
  private baseUrl: string

  constructor(config?: FirecrawlConfig) {
    this.apiKey = config?.apiKey || process.env.FIRECRAWL_API_KEY || ''
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL
    
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required')
    }
  }

  async scrape(
    url: string, 
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResponse> {
    const defaultOptions: FirecrawlScrapeOptions = {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
      timeout: 30000,
    }

    const mergedOptions = { ...defaultOptions, ...options }

    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url,
          ...mergedOptions,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Firecrawl API error: ${response.status} - ${errorText}`,
        }
      }

      const json = await response.json()
      console.log('[Firecrawl] API response keys:', Object.keys(json))
      
      // Firecrawl v1 returns { success: true, data: { markdown: "..." } }
      // We need to return the inner data object
      return {
        success: json.success ?? true,
        data: json.data,
        error: json.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// Singleton instance
let firecrawlClient: FirecrawlClient | null = null

export function getFirecrawlClient(): FirecrawlClient {
  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlClient()
  }
  return firecrawlClient
}

// Convenience function for scraping a URL
export async function scrapeUrl(
  url: string,
  options?: FirecrawlScrapeOptions
): Promise<{ content: string; metadata: Record<string, unknown> } | null> {
  try {
    const client = getFirecrawlClient()
    const result = await client.scrape(url, options)

    console.log('[Firecrawl] Raw result:', JSON.stringify(result).slice(0, 500))

    if (!result.success) {
      console.error('[Firecrawl] Scrape failed:', result.error)
      return null
    }

    // Handle both direct data and nested data.data structure
    const data = result.data
    if (!data) {
      console.error('[Firecrawl] No data in response')
      return null
    }

    // Firecrawl v1 might nest content differently
    const content = data.markdown || data.html || ''
    
    if (!content) {
      console.error('[Firecrawl] No content in response. Keys:', Object.keys(data))
      return null
    }

    console.log('[Firecrawl] Extracted content length:', content.length)

    return {
      content,
      metadata: {
        title: data.metadata?.title,
        description: data.metadata?.description,
        sourceURL: data.metadata?.sourceURL || url,
        links: data.links,
      },
    }
  } catch (error) {
    console.error('[Firecrawl] Exception:', error)
    return null
  }
}

