/**
 * Copy Generation API
 * 
 * POST /api/website/generate
 * Generates copy using an existing domain profile
 * Useful for: iterating on copy without re-running immersion
 */

import { NextRequest, NextResponse } from 'next/server'
import { WebsitePipeline, type WebsitePhase } from '@/core/website/website-pipeline'
import { type DomainProfile, type WebsiteCopyOutput } from '@/lib/schemas/website'

interface GenerateRequest {
  websiteUrl: string
  prompt: string
  domainProfile: DomainProfile
  answers?: Record<string, string>
}

export async function POST(req: NextRequest): Promise<Response> {
  const input: GenerateRequest = await req.json()

  if (!input.websiteUrl) {
    return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 })
  }
  if (!input.prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }
  if (!input.domainProfile) {
    return NextResponse.json({ error: 'domainProfile is required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const customReadable = new ReadableStream({
    async start(controller) {
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
      
      // Set the provided domain profile
      pipeline.setDomainProfile(input.domainProfile)

      try {
        await pipeline.run({
          websiteUrl: input.websiteUrl,
          prompt: input.prompt,
          skipImmersion: true,  // We already have the profile
          answers: input.answers,
        })
      } catch (error) {
        console.error('Copy generation error:', error)
        if (!copyOutput) {
          callbacks.onError(error instanceof Error ? error.message : 'Generation failed')
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
