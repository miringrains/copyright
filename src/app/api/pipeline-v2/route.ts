/**
 * Pipeline V2 API - Question-Driven Flow
 * 
 * Two endpoints:
 * 1. POST /api/pipeline-v2 (action: "start") - Scan website, return questions
 * 2. POST /api/pipeline-v2 (action: "write") - Write copy with answers (includes Critic phase)
 */

import { NextRequest, NextResponse } from 'next/server'
import { scanWebsite, runWritePhase } from '@/core/pipeline/question-orchestrator'
import { generateQuestions } from '@/core/question-generator'
import type { ScanResult, QuestionForUser } from '@/lib/schemas/scan-result'

// ============================================================================
// TYPES
// ============================================================================

interface StartRequest {
  action: 'start'
  websiteContent: string | null
  emailType: string
  formData: Record<string, string>
}

interface WriteRequest {
  action: 'write'
  scanResult: ScanResult
  emailType: string
  formData: Record<string, string>
  answers: Record<string, string>
}

type PipelineRequest = StartRequest | WriteRequest

interface StartResponse {
  success: true
  phase: 'questions'
  scanResult: ScanResult
  questions: QuestionForUser[]
}

interface WriteResponse {
  success: true
  phase: 'complete'
  copy: {
    main: string
    shorter: string
    warmer: string
    subjectLines: string[]
  }
  attempts: number
}

interface ErrorResponse {
  success: false
  error: string
}

type PipelineResponse = StartResponse | WriteResponse | ErrorResponse

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(req: NextRequest): Promise<NextResponse<PipelineResponse>> {
  try {
    const body: PipelineRequest = await req.json()

    // ========================================================================
    // ACTION: START - Scan website and generate questions
    // ========================================================================
    if (body.action === 'start') {
      let scanResult: ScanResult

      console.log('[Pipeline V2] websiteContent length:', body.websiteContent?.length || 0)
      console.log('[Pipeline V2] websiteContent preview:', body.websiteContent?.slice(0, 200) || 'NONE')

      if (body.websiteContent && body.websiteContent.length > 50) {
        // Scan the website
        console.log('[Pipeline V2] Calling scanWebsite...')
        scanResult = await scanWebsite(body.websiteContent, body.emailType)
        console.log('[Pipeline V2] Scan result facts:', scanResult.facts.length)
      } else {
        // No website content - create minimal scan result
        scanResult = {
          company: {
            name: body.formData.company_name || 'Company',
            what_they_do: body.formData.product_or_topic || 'Products/Services',
            tone_observed: 'professional',
          },
          facts: [],
          gaps: [{ 
            type: 'insider_tip', 
            description: 'No website provided - need specific information', 
            importance: 'critical' 
          }],
          usable_for_email: [],
          questions_needed: [],
        }
      }

      // Generate questions based on what we found/didn't find
      const questions = await generateQuestions(scanResult, body.emailType, body.formData)

      return NextResponse.json({
        success: true,
        phase: 'questions',
        scanResult,
        questions,
      })
    }

    // ========================================================================
    // ACTION: WRITE - Generate copy with answers (includes Critic + Validation)
    // ========================================================================
    if (body.action === 'write') {
      // Run the full write phase: Write → Critic → Validate
      const { copy, totalAttempts } = await runWritePhase(
        body.scanResult,
        body.emailType,
        body.formData,
        body.answers
      )

      return NextResponse.json({
        success: true,
        phase: 'complete',
        copy,
        attempts: totalAttempts,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action',
    }, { status: 400 })

  } catch (error) {
    console.error('Pipeline V2 error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Pipeline failed',
    }, { status: 500 })
  }
}

