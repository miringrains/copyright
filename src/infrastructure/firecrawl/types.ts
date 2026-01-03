// Firecrawl API Types

export interface FirecrawlScrapeOptions {
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[]
  onlyMainContent?: boolean
  waitFor?: number
  timeout?: number
}

export interface FirecrawlScrapeResponse {
  success: boolean
  data?: {
    markdown?: string
    html?: string
    rawHtml?: string
    links?: string[]
    screenshot?: string
    metadata?: {
      title?: string
      description?: string
      language?: string
      sourceURL?: string
      statusCode?: number
    }
  }
  error?: string
}

export interface FirecrawlConfig {
  apiKey: string
  baseUrl?: string
}

