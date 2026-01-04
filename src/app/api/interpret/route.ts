import { NextRequest, NextResponse } from 'next/server'
import { 
  interpretContent, 
  formatInterpretedContent,
  buildProofMaterial,
  buildMustInclude 
} from '@/core/content-interpreter'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      websiteContent, 
      campaignType, 
      formData 
    } = body

    if (!campaignType) {
      return NextResponse.json(
        { error: 'Campaign type is required' },
        { status: 400 }
      )
    }

    // Interpret the website content
    const interpreted = await interpretContent(
      websiteContent || '',
      campaignType,
      formData || {}
    )

    // Format for context
    const formattedContext = formatInterpretedContent(interpreted, campaignType)
    
    // Build structured proof and must_include
    const proofMaterial = buildProofMaterial(interpreted)
    const mustInclude = buildMustInclude(interpreted, campaignType, formData || {})

    return NextResponse.json({
      success: true,
      interpreted,
      formattedContext,
      proofMaterial,
      mustInclude,
    })
  } catch (error) {
    console.error('Content interpretation failed:', error)
    return NextResponse.json(
      { 
        error: 'Interpretation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

