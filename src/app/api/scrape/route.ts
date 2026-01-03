import { NextRequest, NextResponse } from 'next/server'
import { scrapeUrl } from '@/infrastructure/firecrawl/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'No URL provided' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      )
    }

    // Scrape the URL
    const result = await scrapeUrl(url)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to scrape URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape URL' 
      },
      { status: 500 }
    )
  }
}

