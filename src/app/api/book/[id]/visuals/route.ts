import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import {
  analyzeForVisuals,
  filterHighValue,
  generateAllVisuals,
  injectVisuals,
  type VisualStyle,
} from '@/core/visuals'

/**
 * POST /api/book/[id]/visuals
 * 
 * Analyze a chapter for visual opportunities and optionally generate them.
 * 
 * Body:
 * - chapterId: string - The chapter to process
 * - action: 'analyze' | 'generate' | 'inject' - What to do
 * - style?: VisualStyle - Visual style for illustrations
 * - maxVisuals?: number - Maximum visuals to suggest (default 3)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const body = await request.json()
    const { chapterId, action, style = 'minimal', maxVisuals = 3 } = body
    
    if (!chapterId) {
      return NextResponse.json(
        { error: 'chapterId is required' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    // Fetch chapter content
    const { data: chapter, error: chapterError } = await supabase
      .from('book_chapters')
      .select('id, chapter_number, title, content')
      .eq('id', chapterId)
      .eq('project_id', projectId)
      .single()

    if (chapterError || !chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    if (!chapter.content) {
      return NextResponse.json(
        { error: 'Chapter has no content yet' },
        { status: 400 }
      )
    }

    // ANALYZE: Find visual opportunities
    if (action === 'analyze') {
      console.log(`[Visuals API] Analyzing chapter ${chapter.chapter_number} for visuals...`)
      
      const opportunities = await analyzeForVisuals(
        chapter.content,
        chapter.title || `Chapter ${chapter.chapter_number}`,
        maxVisuals
      )
      
      const filtered = filterHighValue(opportunities, maxVisuals)
      
      return NextResponse.json({
        chapterId,
        opportunities: filtered,
        totalFound: opportunities.length,
        message: filtered.length === 0 
          ? 'No high-value visual opportunities found' 
          : `Found ${filtered.length} visual opportunities`,
      })
    }

    // GENERATE: Create visuals from stored opportunities
    if (action === 'generate') {
      const { opportunities } = body
      
      if (!opportunities || !Array.isArray(opportunities)) {
        return NextResponse.json(
          { error: 'opportunities array is required for generate action' },
          { status: 400 }
        )
      }

      console.log(`[Visuals API] Generating ${opportunities.length} visuals...`)
      
      const visuals = await generateAllVisuals(opportunities, style as VisualStyle)
      
      // Store generated visuals in chapter metadata
      const { error: updateError } = await supabase
        .from('book_chapters')
        .update({
          metadata: {
            ...chapter,
            visuals: visuals,
            visualsGeneratedAt: new Date().toISOString(),
          },
        })
        .eq('id', chapterId)

      if (updateError) {
        console.error('[Visuals API] Failed to store visuals:', updateError)
      }
      
      return NextResponse.json({
        chapterId,
        visuals,
        message: `Generated ${visuals.length} visuals`,
      })
    }

    // INJECT: Insert visuals into chapter content
    if (action === 'inject') {
      const { visuals } = body
      
      if (!visuals || !Array.isArray(visuals)) {
        return NextResponse.json(
          { error: 'visuals array is required for inject action' },
          { status: 400 }
        )
      }

      console.log(`[Visuals API] Injecting ${visuals.length} visuals into chapter...`)
      
      const contentWithVisuals = injectVisuals(chapter.content, visuals)
      
      // Update chapter content
      const { error: updateError } = await supabase
        .from('book_chapters')
        .update({
          content: contentWithVisuals,
          metadata: {
            ...chapter,
            visualsInjected: true,
            visualsInjectedAt: new Date().toISOString(),
          },
        })
        .eq('id', chapterId)

      if (updateError) {
        console.error('[Visuals API] Failed to update chapter:', updateError)
        return NextResponse.json(
          { error: 'Failed to update chapter' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        chapterId,
        message: 'Visuals injected successfully',
        contentLength: contentWithVisuals.length,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: analyze, generate, or inject' },
      { status: 400 }
    )

  } catch (error) {
    console.error('[Visuals API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/book/[id]/visuals
 * 
 * Get visual opportunities and generated visuals for all chapters.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const supabase = getServerClient()

    // Fetch all chapters with their visual metadata
    const { data: chapters, error } = await supabase
      .from('book_chapters')
      .select('id, chapter_number, title, metadata')
      .eq('project_id', projectId)
      .order('chapter_number')

    if (error) {
      console.error('[Visuals API] Failed to fetch chapters:', error)
      return NextResponse.json(
        { error: 'Failed to fetch chapters' },
        { status: 500 }
      )
    }

    const chaptersWithVisuals = chapters.map(ch => ({
      id: ch.id,
      chapterNumber: ch.chapter_number,
      title: ch.title,
      hasVisuals: !!(ch.metadata as Record<string, unknown>)?.visuals,
      visualsInjected: !!(ch.metadata as Record<string, unknown>)?.visualsInjected,
      visualCount: ((ch.metadata as Record<string, unknown>)?.visuals as unknown[] || []).length,
    }))

    return NextResponse.json({
      projectId,
      chapters: chaptersWithVisuals,
    })

  } catch (error) {
    console.error('[Visuals API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

