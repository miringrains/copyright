/**
 * Domain Immersion API
 * 
 * POST /api/website/immerse
 * Runs domain immersion separately, returning a domain profile
 * Useful for: previewing domain analysis before generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { runDomainImmersion, runQuickImmersion, type ImmersionCallbacks } from '@/core/website/domain-immersion'
import { type DomainProfile } from '@/lib/schemas/website'

interface ImmersionRequest {
  websiteUrl: string
  quick?: boolean  // Skip competitor analysis for speed
  additionalContext?: string
}

export async function POST(req: NextRequest): Promise<Response> {
  const input: ImmersionRequest = await req.json()

  if (!input.websiteUrl) {
    return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const customReadable = new ReadableStream({
    async start(controller) {
      let domainProfile: DomainProfile | null = null

      const callbacks: ImmersionCallbacks = {
        onProgress: (phase, message, data) => {
          const event = JSON.stringify({
            type: 'progress',
            phase,
            message,
            data,
            timestamp: Date.now(),
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onError: (message) => {
          const event = JSON.stringify({
            type: 'error',
            message,
          })
          controller.enqueue(encoder.encode(event + '\n'))
        },
      }

      try {
        if (input.quick) {
          domainProfile = await runQuickImmersion(
            input.websiteUrl,
            input.additionalContext,
            callbacks
          )
        } else {
          const result = await runDomainImmersion(input.websiteUrl, callbacks)
          domainProfile = result.domainProfile
        }

        // Send the final profile
        const event = JSON.stringify({
          type: 'profile_ready',
          profile: domainProfile,
        })
        controller.enqueue(encoder.encode(event + '\n'))

      } catch (error) {
        console.error('Domain immersion error:', error)
        callbacks.onError(error instanceof Error ? error.message : 'Immersion failed')
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
