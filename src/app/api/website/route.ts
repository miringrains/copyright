/**
 * Website Copy Pipeline API
 * 
 * POST /api/website
 * Streams the full pipeline: immersion → parsing → generation → slop check → variants
 */

import { NextRequest, NextResponse } from 'next/server'
import { WebsitePipeline, type WebsitePhase } from '@/core/website/website-pipeline'
import { type WebsiteCopyOutput } from '@/lib/schemas/website'

interface WebsiteApiRequest {
  websiteUrl: string
  prompt: string
  additionalContext?: string
  skipImmersion?: boolean
  answers?: Record<string, string>
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
      let clarifyingQuestions: string[] = []
      let copyOutput: WebsiteCopyOutput | null = null

      const callbacks = {
        onPhaseChange: (phase: WebsitePhase, message: string, data?: unknown) => {
          const event = JSON.stringify({ 
            type: 'phase_update', 
            phase, 
            message, 
            data,
            timestamp: Date.now(),
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onClarifyingQuestions: (questions: string[]) => {
          clarifyingQuestions = questions
          const event = JSON.stringify({ 
            type: 'clarifying_questions', 
            questions,
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onCopyReady: (output: WebsiteCopyOutput) => {
          copyOutput = output
          const event = JSON.stringify({ 
            type: 'copy_ready', 
            output,
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onError: (message: string) => {
          const event = JSON.stringify({ 
            type: 'error', 
            message,
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
      }

      const pipeline = new WebsitePipeline(callbacks)

      try {
        await pipeline.run({
          websiteUrl: input.websiteUrl,
          prompt: input.prompt,
          additionalContext: input.additionalContext,
          skipImmersion: input.skipImmersion,
          answers: input.answers,
        })
      } catch (error) {
        console.error('Website pipeline error:', error)
        if (!copyOutput) {
          callbacks.onError(error instanceof Error ? error.message : 'Pipeline failed')
        }
      } finally {
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
