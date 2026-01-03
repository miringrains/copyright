import { NextRequest } from 'next/server'
import { TaskSpecSchema } from '@/lib/schemas'
import { runPipeline } from '@/core/pipeline/orchestrator'
import type { PipelineOptions } from '@/core/pipeline/types'

// Phase descriptions for streaming messages
const PHASE_THINKING: Record<number, string[]> = {
  1: [
    'Analyzing target audience demographics...',
    'Identifying reader fears and desires...',
    'Determining optimal stance and voice...',
    'Building reader psychology model...',
  ],
  2: [
    'Structuring main claims hierarchy...',
    'Mapping proof points to claims...',
    'Preparing objection handlers...',
    'Calculating claim impact weights...',
  ],
  3: [
    'Defining paragraph beats...',
    'Setting structural constraints...',
    'Adding forbidden word rules...',
    'Creating curiosity hooks...',
  ],
  4: [
    'Generating draft with hard rules...',
    'Validating against forbidden words...',
    'Checking sentence structure...',
    'Regenerating if violations found...',
  ],
  5: [
    'Analyzing topic chains...',
    'Detecting cohesion breaks...',
    'Applying old→new flow...',
    'Fixing pronoun references...',
  ],
  6: [
    'Measuring sentence lengths...',
    'Inserting rhythm variation...',
    'Adding landing beats...',
    'Adjusting cadence...',
  ],
  7: [
    'Applying attention physics...',
    'Optimizing for F-pattern...',
    'Loading left edges...',
    'Formatting for scan...',
  ],
  8: [
    'Running quality checks...',
    'Generating short variant...',
    'Creating punchy variant...',
    'Packaging final output...',
  ],
}

function createSSEMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function getArtifactName(phase: number): string {
  const names: Record<number, string> = {
    1: 'Creative Brief',
    2: 'Message Architecture',
    3: 'Beat Sheet + Rules',
    4: 'Validated Draft V0',
    5: 'Draft V1 (Cohesion)',
    6: 'Draft V2 (Rhythm)',
    7: 'Draft V3 (Channel)',
    8: 'Final Package',
  }
  return names[phase] || `Phase ${phase} Artifact`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const taskSpec = TaskSpecSchema.parse(body.taskSpec)
    
    // Create SSE stream
    const encoder = new TextEncoder()
    
    // We need to track state across the async callbacks
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null
    let currentPhase = 0
    
    const send = (data: Record<string, unknown>) => {
      if (controller) {
        controller.enqueue(encoder.encode(createSSEMessage(data)))
      }
    }

    // Pipeline options with streaming callbacks
    const pipelineOptions: PipelineOptions = {
      onPhaseStart: async (phase, phaseName) => {
        currentPhase = phase
        send({
          type: 'phase_start',
          phase,
          phaseName,
          detail: `Starting ${phaseName}...`,
        })

        // Send thinking messages with delays
        const thinkingMessages = PHASE_THINKING[phase] || []
        for (const message of thinkingMessages) {
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
          send({
            type: 'thinking',
            phase,
            message,
          })
        }
      },
      onPhaseComplete: (phase, phaseName, artifact) => {
        send({
          type: 'artifact',
          phase,
          artifact: getArtifactName(phase),
          preview: typeof artifact === 'object' && artifact !== null 
            ? Object.keys(artifact).slice(0, 3).join(', ') + '...'
            : 'Generated',
        })
      },
      onPhaseError: (phase, phaseName, error) => {
        send({
          type: 'error',
          phase,
          phaseName,
          message: error.message,
        })
      },
      onComplete: (finalPackage) => {
        send({
          type: 'complete',
          finalPackage,
        })
      },
      onError: (error) => {
        send({
          type: 'error',
          phase: currentPhase,
          message: error.message,
        })
      },
    }

    const stream = new ReadableStream({
      async start(ctrl) {
        controller = ctrl
        
        try {
          // Run the actual pipeline with callbacks
          const result = await runPipeline(taskSpec, undefined, pipelineOptions)
          
          if (!result.success) {
            send({
              type: 'error',
              phase: currentPhase,
              message: result.error || 'Pipeline failed',
            })
          }
        } catch (error) {
          send({
            type: 'error',
            phase: currentPhase,
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          controller?.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid request' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
