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

      const data = await response.json()
      return {
        success: true,
        data,
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
  const client = getFirecrawlClient()
  const result = await client.scrape(url, options)

  if (!result.success || !result.data) {
    console.error('Firecrawl scrape failed:', result.error)
    return null
  }

  return {
    content: result.data.markdown || result.data.html || '',
    metadata: {
      title: result.data.metadata?.title,
      description: result.data.metadata?.description,
      sourceURL: result.data.metadata?.sourceURL || url,
      links: result.data.links,
    },
  }
}

