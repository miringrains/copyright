import { NextRequest } from 'next/server'
import { TaskSpecSchema } from '@/lib/schemas'
import { PipelineOrchestrator } from '@/core/pipeline/orchestrator'
import { createServerSupabaseClient } from '@/infrastructure/supabase/client'

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
    'Planning section handoffs...',
    'Allocating word budgets...',
    'Creating curiosity hooks...',
  ],
  4: [
    'Generating opening hook...',
    'Writing body paragraphs...',
    'Crafting call-to-action...',
    'Ensuring beat compliance...',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const taskSpec = TaskSpecSchema.parse(body.taskSpec)
    
    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(createSSEMessage(data)))
        }

        try {
          const supabase = createServerSupabaseClient()
          const orchestrator = new PipelineOrchestrator(supabase)

          // Process each phase with streaming updates
          for (let phase = 1; phase <= 8; phase++) {
            // Send phase start
            send({
              type: 'phase_start',
              phase,
              detail: `Starting phase ${phase}...`,
            })

            // Simulate thinking messages
            const thinkingMessages = PHASE_THINKING[phase] || []
            for (const message of thinkingMessages) {
              await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
              send({
                type: 'thinking',
                phase,
                message,
              })
            }

            // Send artifact generation
            await new Promise(resolve => setTimeout(resolve, 300))
            send({
              type: 'artifact',
              phase,
              artifact: getArtifactName(phase),
              preview: 'Processing...',
            })
          }

          // Actually run the pipeline
          const result = await orchestrator.execute(taskSpec)

          if (!result.success) {
            send({
              type: 'error',
              phase: 8,
              message: result.error || 'Pipeline failed',
            })
          } else {
            send({
              type: 'complete',
              finalPackage: result.artifacts?.final_package,
            })
          }
        } catch (error) {
          send({
            type: 'error',
            phase: 0,
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          controller.close()
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

function getArtifactName(phase: number): string {
  const names: Record<number, string> = {
    1: 'Creative Brief',
    2: 'Message Architecture',
    3: 'Beat Sheet',
    4: 'Draft V0',
    5: 'Draft V1 (Cohesion)',
    6: 'Draft V2 (Rhythm)',
    7: 'Draft V3 (Channel)',
    8: 'Final Package',
  }
  return names[phase] || `Phase ${phase} Artifact`
}

