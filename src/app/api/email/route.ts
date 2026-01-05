/**
 * Email Pipeline API V3
 * 
 * Simple endpoint:
 * POST /api/email
 * {
 *   websiteContent: string,
 *   emailType: 'welcome' | 'abandoned_cart' | 'nurture' | 'launch' | 'reengagement',
 *   companyName: string,
 *   senderName: string,
 *   productOrTopic?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  runEmailPipeline, 
  type EmailInput,
  type EmailType 
} from '@/core/pipeline/email-pipeline'

const VALID_EMAIL_TYPES: EmailType[] = ['welcome', 'abandoned_cart', 'nurture', 'launch', 'reengagement']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    if (!body.websiteContent || body.websiteContent.length < 100) {
      return NextResponse.json({
        success: false,
        error: 'Website content required (min 100 chars)',
      }, { status: 400 })
    }
    
    if (!body.emailType || !VALID_EMAIL_TYPES.includes(body.emailType)) {
      return NextResponse.json({
        success: false,
        error: `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(', ')}`,
      }, { status: 400 })
    }
    
    if (!body.companyName) {
      return NextResponse.json({
        success: false,
        error: 'Company name required',
      }, { status: 400 })
    }
    
    const input: EmailInput = {
      websiteContent: body.websiteContent,
      emailType: body.emailType as EmailType,
      companyName: body.companyName,
      senderName: body.senderName || body.companyName,
      productOrTopic: body.productOrTopic,
    }
    
    console.log(`[Email API] Starting pipeline: ${input.emailType} for ${input.companyName}`)
    
    const result = await runEmailPipeline(input)
    
    console.log(`[Email API] Complete. Phases: outline=${result.phases.outline}ms, write=${result.phases.write}ms, variants=${result.phases.variants}ms`)
    
    return NextResponse.json({
      success: true,
      outline: result.outline,
      email: result.email,
      timing: result.phases,
    })
    
  } catch (error) {
    console.error('[Email API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Pipeline failed',
    }, { status: 500 })
  }
}

