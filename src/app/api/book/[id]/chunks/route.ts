import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

interface ChunkSummary {
  id: string
  content: string
  sourceFile: string
  chunkIndex: number
  assignedChapters: number[]
  relevanceScore: number | null
  wordCount: number
}

/**
 * GET /api/book/[id]/chunks - Get chunks grouped by chapter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { searchParams } = new URL(request.url)
  const chapterFilter = searchParams.get('chapter')
  
  try {
    const supabase = getServerClient()

    // Get all chunks for this project
    const { data: chunks, error } = await supabase
      .from('book_chunks')
      .select('id, content, source_file, chunk_index, assigned_chapters, relevance_score, metadata')
      .eq('project_id', projectId)
      .order('chunk_index')

    if (error) {
      console.error('[Chunks API] Error:', error)
      return NextResponse.json({ error: 'Failed to get chunks' }, { status: 500 })
    }

    // Get chapters for grouping
    const { data: chapters } = await supabase
      .from('book_chapters')
      .select('chapter_number, title')
      .eq('project_id', projectId)
      .order('chapter_number')

    // Transform chunks
    const transformedChunks: ChunkSummary[] = (chunks || []).map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      sourceFile: chunk.source_file || 'Unknown',
      chunkIndex: chunk.chunk_index,
      assignedChapters: chunk.assigned_chapters || [],
      relevanceScore: chunk.relevance_score,
      wordCount: (chunk.metadata as { wordCount?: number })?.wordCount || 
                 chunk.content.split(/\s+/).length,
    }))

    // Group by chapter
    const byChapter: Record<number, ChunkSummary[]> = {}
    const unassigned: ChunkSummary[] = []

    for (const chunk of transformedChunks) {
      if (chunk.assignedChapters.length === 0) {
        unassigned.push(chunk)
      } else {
        for (const chapterNum of chunk.assignedChapters) {
          if (!byChapter[chapterNum]) {
            byChapter[chapterNum] = []
          }
          byChapter[chapterNum].push(chunk)
        }
      }
    }

    // If filtering by chapter
    if (chapterFilter) {
      const chapterNum = parseInt(chapterFilter)
      if (chapterNum === 0) {
        return NextResponse.json({ chunks: unassigned })
      }
      return NextResponse.json({ chunks: byChapter[chapterNum] || [] })
    }

    // Return summary by chapter
    const summary = (chapters || []).map(ch => ({
      chapterNumber: ch.chapter_number,
      title: ch.title,
      chunkCount: byChapter[ch.chapter_number]?.length || 0,
      totalWords: byChapter[ch.chapter_number]?.reduce((sum, c) => sum + c.wordCount, 0) || 0,
    }))

    return NextResponse.json({
      chapters: summary,
      unassigned: {
        chunkCount: unassigned.length,
        totalWords: unassigned.reduce((sum, c) => sum + c.wordCount, 0),
      },
      totalChunks: transformedChunks.length,
    })

  } catch (error) {
    console.error('[Chunks API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get chunks' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/book/[id]/chunks - Reassign chunks to different chapters
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const body = await request.json()
    const { chunkId, assignedChapters } = body

    if (!chunkId || !Array.isArray(assignedChapters)) {
      return NextResponse.json(
        { error: 'chunkId and assignedChapters array required' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    // Verify chunk belongs to this project
    const { data: chunk } = await supabase
      .from('book_chunks')
      .select('id')
      .eq('id', chunkId)
      .eq('project_id', projectId)
      .single()

    if (!chunk) {
      return NextResponse.json({ error: 'Chunk not found' }, { status: 404 })
    }

    // Update chunk assignment
    const { error } = await supabase
      .from('book_chunks')
      .update({ assigned_chapters: assignedChapters })
      .eq('id', chunkId)

    if (error) {
      console.error('[Chunks API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update chunk' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Chunks API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update chunks' },
      { status: 500 }
    )
  }
}

