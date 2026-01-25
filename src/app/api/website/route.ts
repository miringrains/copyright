/**
 * Website Copy Advisor API
 * 
 * POST /api/website
 * Streams the advisor pipeline: audit → inventory → assess → generate
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

  const encoder = new TextEncoder()

  const customReadable = new ReadableStream({
    async start(controller) {
      let advisorOutput: WebsiteAdvisorOutput | null = null

      const callbacks = {
        onPhaseChange: (phase: AdvisorPhase, message: string, data?: unknown) => {
          const event = JSON.stringify({ 
            type: 'phase_update', 
            phase, 
            message, 
            data,
            timestamp: Date.now(),
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onComplete: (output: WebsiteAdvisorOutput) => {
          advisorOutput = output
          // Send output in chunks to handle large payloads
          try {
            const outputStr = JSON.stringify(output)
            const event = JSON.stringify({ 
              type: 'complete', 
              output,
            })
            controller.enqueue(encoder.encode(event + '\n'))
            console.log('Sent complete event, output size:', outputStr.length)
          } catch (e) {
            console.error('Error sending complete event:', e)
            controller.enqueue(encoder.encode(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to serialize output',
            }) + '\n'))
          }
        },
        onError: (message: string) => {
          const event = JSON.stringify({ 
            type: 'error', 
            message,
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
      }

      try {
        await runWebsiteAdvisor(
          {
            websiteUrl: input.websiteUrl,
            prompt: input.prompt,
          },
          callbacks
        )
      } catch (error) {
        console.error('Website advisor error:', error)
        if (!advisorOutput) {
          callbacks.onError(error instanceof Error ? error.message : 'Pipeline failed')
        }
      } finally {
        // Ensure stream is flushed before closing
        await new Promise(resolve => setTimeout(resolve, 100))
        controller.close()
      }
    },
  })

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
