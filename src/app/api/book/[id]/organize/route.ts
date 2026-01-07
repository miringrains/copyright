import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const ChapterAssignmentSchema = z.object({
  assignments: z.array(z.object({
    chunkIndex: z.number(),
    chapters: z.array(z.number()),
    relevanceScore: z.number(),
  })),
})

/**
 * POST /api/book/[id]/organize - Map chunks to chapters
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const supabase = getServerClient()

    // Get project and chapters
    const { data: project, error: projectError } = await supabase
      .from('book_projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: chapters } = await supabase
      .from('book_chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('chapter_number')

    // Get all chunks for this project
    const { data: chunks, error: chunksError } = await supabase
      .from('book_chunks')
      .select('id, content, chunk_index, metadata')
      .eq('project_id', projectId)
      .order('chunk_index')

    if (chunksError || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'No chunks found' }, { status: 400 })
    }

    console.log(`[Organize] Processing ${chunks.length} chunks for ${chapters?.length || 0} chapters`)

    // Build chapter list for prompt
    const chapterList = (chapters || []).map(c => 
      `${c.chapter_number}. ${c.title}`
    ).join('\n')

    // Process chunks in batches to avoid token limits
    const batchSize = 20
    const allAssignments: { chunkId: string; chapters: number[]; score: number }[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      
      const chunkSummaries = batch.map(chunk => 
        `[Chunk ${chunk.chunk_index}]: ${chunk.content.slice(0, 500)}...`
      ).join('\n\n')

      const result = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: ChapterAssignmentSchema,
        system: `You are organizing research material for a book. 
Assign each content chunk to the most relevant chapter(s).
A chunk can belong to multiple chapters if it's broadly applicable.
Score relevance from 0.0 to 1.0.`,
        prompt: `CHAPTERS:
${chapterList}

CONTENT CHUNKS:
${chunkSummaries}

For each chunk, identify which chapter(s) it belongs to and how relevant it is.`,
      })

      for (const assignment of result.object.assignments) {
        const chunk = batch.find(c => c.chunk_index === assignment.chunkIndex)
        if (chunk) {
          allAssignments.push({
            chunkId: chunk.id,
            chapters: assignment.chapters,
            score: assignment.relevanceScore,
          })
        }
      }
    }

    // Update chunks with assignments
    for (const assignment of allAssignments) {
      await supabase
        .from('book_chunks')
        .update({
          assigned_chapters: assignment.chapters,
          relevance_score: assignment.score,
        })
        .eq('id', assignment.chunkId)
    }

    // Update project status
    await supabase
      .from('book_projects')
      .update({ status: 'organized' })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      chunksProcessed: chunks.length,
      assignments: allAssignments.length,
    })

  } catch (error) {
    console.error('[Organize] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to organize content' },
      { status: 500 }
    )
  }
}

