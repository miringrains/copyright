/**
 * Website Copy Advisor API
 * 
 * POST /api/website
 * Returns the advisor output as JSON (not streaming)
 * Progress updates sent via response headers are not practical,
 * so this is a simple request/response.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runWebsiteAdvisor, type AdvisorPhase } from '@/core/website/website-pipeline'
import type { WebsiteAdvisorOutput } from '@/lib/schemas/website'

interface WebsiteApiRequest {
  websiteUrl: string
  prompt: string
}

export async function POST(req: NextRequest): Promise<Response> {
  const input: WebsiteApiRequest = await req.json()

  // Validate required fields
  if (!input.websiteUrl) {
    return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 })
  }
  if (!input.prompt || input.prompt.length < 10) {
    return NextResponse.json({ error: 'prompt is required (min 10 chars)' }, { status: 400 })
  }

  // Collect progress messages for debugging
  const progressLog: string[] = []

  const callbacks = {
    onPhaseChange: (phase: AdvisorPhase, message: string) => {
      progressLog.push(`[${phase}] ${message}`)
    },
    onComplete: () => {
      progressLog.push('[complete] Done')
    },
    onError: (message: string) => {
      progressLog.push(`[error] ${message}`)
    },
  }

  try {
    const output = await runWebsiteAdvisor(
      {
        websiteUrl: input.websiteUrl,
        prompt: input.prompt,
      },
      callbacks
    )

    return NextResponse.json({
      success: true,
      output,
      progressLog,
    })
  } catch (error) {
    console.error('Website advisor error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Pipeline failed',
      progressLog,
    }, { status: 500 })
  }
}
