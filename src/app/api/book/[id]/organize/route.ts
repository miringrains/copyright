import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const ChapterAssignmentSchema = z.object({
  assignments: z.array(z.object({
    chunkIndex: z.number(),
    primaryChapter: z.number().describe('The ONE chapter this chunk is PRIMARILY about. Only the main topic.'),
    relevanceScore: z.number().describe('How strongly this chunk belongs to the primary chapter (0.0-1.0)'),
    containsOtherTopics: z.boolean().describe('True if this chunk mentions other unrelated topics'),
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
    const allAssignments: { chunkId: string; chapters: number[]; score: number; hasOtherTopics?: boolean }[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      
      // Show MORE content for better topic detection (up to 1500 chars)
      const chunkSummaries = batch.map(chunk => 
        `[Chunk ${chunk.chunk_index}]: ${chunk.content.slice(0, 1500)}${chunk.content.length > 1500 ? '...' : ''}`
      ).join('\n\n---\n\n')

      const result = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: ChapterAssignmentSchema,
        system: `You are organizing research material for a book. 
Your job is STRICT topic matching. Each chunk should be assigned to ONE primary chapter only.

CRITICAL RULES:
- A chunk about "wool" should ONLY go to the Wool chapter, even if it briefly mentions other fibers
- Look at what the chunk is PRIMARILY about, not what it briefly mentions
- If a chunk is 80% about wool and 20% about cotton comparison, it belongs to Wool only
- Mark "containsOtherTopics: true" if the chunk mentions other topics, so the writer knows to filter

DO NOT assign chunks to multiple chapters. Pick the ONE best match.
Score relevance: 0.9+ = directly about that topic, 0.7-0.9 = mostly about it, <0.7 = tangential`,
        prompt: `CHAPTERS:
${chapterList}

CONTENT CHUNKS:
${chunkSummaries}

For each chunk, identify the ONE primary chapter it belongs to. Be strict - only assign to the chapter the content is PRIMARILY about.`,
      })

      for (const assignment of result.object.assignments) {
        const chunk = batch.find(c => c.chunk_index === assignment.chunkIndex)
        if (chunk) {
          allAssignments.push({
            chunkId: chunk.id,
            chapters: [assignment.primaryChapter], // Now single chapter
            score: assignment.relevanceScore,
            hasOtherTopics: assignment.containsOtherTopics,
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

