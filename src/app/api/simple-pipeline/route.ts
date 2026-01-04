import { NextResponse } from 'next/server'
import { runSimplePipeline, type SimpleInput } from '@/core/pipeline/simple-orchestrator'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { formData, websiteContent, campaignType } = body as SimpleInput

    if (!formData || !campaignType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await runSimplePipeline({
      formData,
      websiteContent: websiteContent || null,
      campaignType,
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Simple pipeline API error:', error)
    return NextResponse.json(
      { success: false, error: 'Pipeline failed' },
      { status: 500 }
    )
  }
}

