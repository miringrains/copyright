import { NextRequest, NextResponse } from 'next/server'
import { TaskSpecSchema } from '@/lib/schemas'
import { runPipeline } from '@/core/pipeline/orchestrator'

export const maxDuration = 300 // 5 minutes for long pipelines

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate TaskSpec
    const parseResult = TaskSpecSchema.safeParse(body.taskSpec)
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid TaskSpec', 
          details: parseResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const taskSpec = parseResult.data
    const projectId = body.projectId as string | undefined

    // Run the pipeline
    const result = await runPipeline(taskSpec, projectId)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          runId: result.runId 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      runId: result.runId,
      finalPackage: result.finalPackage,
      artifacts: result.artifacts,
    })
  } catch (error) {
    console.error('Pipeline error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

