import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const InsightsSchema = z.object({
  audience: z.string().describe('Specific description of target audience'),
  painPoints: z.array(z.string()).describe('3 key pain points the audience faces'),
  opportunities: z.array(z.string()).describe('3 messaging opportunities to capitalize on'),
  suggestedAngle: z.string().describe('The single best angle for this copy'),
  competitiveGaps: z.array(z.string()).describe('Gaps in competitor messaging we can exploit'),
  tone: z.string().describe('Recommended tone and voice for this copy'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, url, copyType, goal, scrapedContent } = body

    const prompt = `You are a senior direct response copywriter and strategist. Analyze this business and create strategic insights for writing ${copyType} copy.

Company: ${companyName}
Website: ${url || 'Not provided'}
Copy Type: ${copyType}
Goal: ${goal || 'Drive conversions'}

${scrapedContent ? `Website Content:\n${scrapedContent.slice(0, 3000)}` : ''}

Based on this information, provide strategic insights that will make the copy compelling and effective. Focus on:

1. WHO is the real target audience? Be specific about their role, situation, and mindset.
2. What are their TOP 3 PAIN POINTS that this product/service addresses?
3. What are 3 MESSAGING OPPORTUNITIES we can capitalize on?
4. What's the SINGLE BEST ANGLE for this copy? What positioning will resonate most?
5. What GAPS exist in typical competitor messaging that we can exploit?
6. What TONE will resonate with this audience?

Be specific, actionable, and insightful. Avoid generic advice.`

    try {
      const result = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: InsightsSchema,
        prompt,
        maxRetries: 2,
      })

      return NextResponse.json({ insights: result.object })
    } catch (aiError) {
      console.error('AI analysis failed, using fallback:', aiError)
      
      // Fallback insights based on available info
      const fallbackInsights = {
        audience: `Decision-makers and users interested in ${companyName || 'this solution'}`,
        painPoints: [
          'Current solutions are complex and time-consuming',
          'Difficulty measuring and proving ROI',
          'Need for faster, more reliable results',
        ],
        opportunities: [
          `Emphasize ${companyName}'s unique approach`,
          'Highlight speed to value and ease of use',
          'Show concrete results and social proof',
        ],
        suggestedAngle: `Position ${companyName} as the simpler, faster path to measurable results`,
        competitiveGaps: [
          'Most competitors focus on features over outcomes',
          'Lack of clear differentiation in the market',
        ],
        tone: 'Confident and knowledgeable, but approachable - like a trusted advisor',
      }

      return NextResponse.json({ insights: fallbackInsights })
    }
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

