import { NextRequest, NextResponse } from 'next/server'
import { findVoiceMatch, formatVoiceDirective } from '@/core/voice-matching'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product, audience, industry, purpose } = body

    if (!product || !audience) {
      return NextResponse.json(
        { error: 'Product and audience are required' },
        { status: 400 }
      )
    }

    const voiceMatch = await findVoiceMatch(
      product,
      audience,
      industry || '',
      purpose || 'Marketing email'
    )

    const voiceDirective = formatVoiceDirective(voiceMatch)

    return NextResponse.json({
      success: true,
      voiceMatch,
      voiceDirective,
    })
  } catch (error) {
    console.error('Voice matching failed:', error)
    return NextResponse.json(
      { 
        error: 'Voice matching failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

