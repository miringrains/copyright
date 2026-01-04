import { NextRequest, NextResponse } from 'next/server'
import { scrapeUrl } from '@/infrastructure/firecrawl/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Scrape API] Request body:', JSON.stringify(body))
    
    const { url } = body

    if (!url) {
      console.log('[Scrape API] No URL provided in request')
      return NextResponse.json(
        { success: false, error: 'No URL provided' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      console.log('[Scrape API] Invalid URL:', url)
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      )
    }

    console.log('[Scrape API] Scraping URL:', url)
    
    // Scrape the URL
    const result = await scrapeUrl(url)

    if (!result) {
      console.log('[Scrape API] Scrape returned null')
      return NextResponse.json(
        { success: false, error: 'Failed to scrape URL - check Firecrawl API key' },
        { status: 500 }
      )
    }

    console.log('[Scrape API] Success - content length:', result.content?.length || 0)
    
    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('[Scrape API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape URL' 
      },
      { status: 500 }
    )
  }
}

