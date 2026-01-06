/**
 * Article Generation API
 * 
 * POST /api/article
 * Streams article generation progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { ArticlePipeline, type ArticlePhase } from '@/core/pipeline/article-pipeline'
import { type GeneratedArticle, type Source, type TopicSuggestion } from '@/lib/schemas/article'

interface ArticleRequest {
  websiteUrl: string
  blogUrl?: string
  sources?: Source[]
  targetKeywords?: string[]
  topic?: string
  selectedTopic?: TopicSuggestion
  wordCountTarget?: number
  imageCount?: number
  tone?: 'formal' | 'conversational' | 'technical'
  additionalContext?: string
  autoResearch?: boolean
}

export async function POST(req: NextRequest): Promise<Response> {
  const input: ArticleRequest = await req.json()
  
  // Validate required fields
  if (!input.websiteUrl) {
    return NextResponse.json(
      { error: 'websiteUrl is required' },
      { status: 400 }
    )
  }
  
  const encoder = new TextEncoder()
  
  const customReadable = new ReadableStream({
    async start(controller) {
      const callbacks = {
        onPhaseChange: (phase: ArticlePhase, message: string, data?: unknown) => {
          const event = JSON.stringify({ type: 'phase_update', phase, message, data })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onArticleReady: (article: GeneratedArticle) => {
          const event = JSON.stringify({ type: 'article_ready', article })
          controller.enqueue(encoder.encode(event + '\n'))
        },
        onError: (message: string) => {
          const event = JSON.stringify({ type: 'error', message })
          controller.enqueue(encoder.encode(event + '\n'))
          controller.close()
        },
      }
      
      const pipeline = new ArticlePipeline(callbacks)
      
      try {
        await pipeline.start(
          {
            websiteUrl: input.websiteUrl,
            blogUrl: input.blogUrl,
            sources: input.sources || [],
            targetKeywords: input.targetKeywords,
            topic: input.topic,
            wordCountTarget: input.wordCountTarget ?? 1500,
            imageCount: input.imageCount ?? 2,
            tone: input.tone ?? 'conversational',
            additionalContext: input.additionalContext,
            autoResearch: input.autoResearch ?? true,
          },
          input.selectedTopic
        )
      } catch (error) {
        console.error('Article pipeline error:', error)
        callbacks.onError(error instanceof Error ? error.message : 'Pipeline failed')
      } finally {
        controller.close()
      }
    },
  })
  
  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

