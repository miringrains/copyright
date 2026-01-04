import { runSimplePipeline, type SimpleInput } from '@/core/pipeline/simple-orchestrator'

export const maxDuration = 60

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const body = await req.json()
        const { formData, websiteContent, campaignType } = body as SimpleInput

        if (!formData || !campaignType) {
          send({ type: 'error', message: 'Missing required fields' })
          controller.close()
          return
        }

        const result = await runSimplePipeline(
          {
            formData,
            websiteContent: websiteContent || null,
            campaignType,
          },
          {
            onPhaseStart: (phase, name) => {
              send({ type: 'phase_start', phase, name })
            },
            onPhaseComplete: (phase, name) => {
              send({ type: 'phase_complete', phase, name })
            },
            onThinking: (phase, message) => {
              send({ type: 'thinking', phase, message })
            },
          }
        )

        if (result.success) {
          send({
            type: 'complete',
            infoPacket: result.infoPacket,
            voiceSelection: result.voiceSelection,
            copyOutput: result.copyOutput,
          })
        } else {
          send({ type: 'error', message: result.error })
        }

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Pipeline failed'
        send({ type: 'error', message })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

