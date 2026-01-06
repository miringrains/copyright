/**
 * Topic Suggestions API
 * 
 * POST /api/article/topics
 * Returns topic suggestions based on website analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { ArticlePipeline, type ArticlePhase } from '@/core/pipeline/article-pipeline'
import { type Source, type TopicSuggestion } from '@/lib/schemas/article'

interface TopicsRequest {
  websiteUrl: string
  blogUrl?: string
  sources?: Source[]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input: TopicsRequest = await req.json()
    
    if (!input.websiteUrl) {
      return NextResponse.json(
        { error: 'websiteUrl is required' },
        { status: 400 }
      )
    }
    
    let topics: TopicSuggestion[] = []
    let analysisData: unknown = null
    
    const callbacks = {
      onPhaseChange: (_phase: ArticlePhase, _message: string, data?: unknown) => {
        if (data) analysisData = data
      },
      onArticleReady: () => {},
      onError: (message: string) => {
        throw new Error(message)
      },
    }
    
    const pipeline = new ArticlePipeline(callbacks)
    
    topics = await pipeline.generateTopicSuggestions({
      websiteUrl: input.websiteUrl,
      blogUrl: input.blogUrl,
      sources: input.sources || [],
    })
    
    return NextResponse.json({
      success: true,
      topics,
      analysis: analysisData,
    })
    
  } catch (error) {
    console.error('Topics generation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate topics' 
      },
      { status: 500 }
    )
  }
}

