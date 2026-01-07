import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const ChapterOutlineSchema = z.object({
  hook: z.string().describe('Opening hook - question, fact, or scene'),
  sections: z.array(z.object({
    title: z.string(),
    keyPoints: z.array(z.string()),
    targetWords: z.number(),
  })),
  bridge: z.string().describe('Transition to next chapter'),
})

/**
 * POST /api/book/[id]/write - Write a specific chapter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const body = await request.json()
    const { chapterNumber } = body

    if (!chapterNumber) {
      return NextResponse.json({ error: 'Chapter number required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Get project and approved tone
    const { data: project } = await supabase
      .from('book_projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get this chapter
    const { data: chapter } = await supabase
      .from('book_chapters')
      .select('*')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber)
      .single()

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Get previous chapter ending (for transition)
    const { data: prevChapter } = await supabase
      .from('book_chapters')
      .select('content, title')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber - 1)
      .single()

    const prevEnding = prevChapter?.content 
      ? prevChapter.content.split('\n').slice(-5).join('\n')
      : null

    // Get next chapter title (for bridge)
    const { data: nextChapter } = await supabase
      .from('book_chapters')
      .select('title')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber + 1)
      .single()

    // Get relevant chunks for this chapter
    const { data: chunks } = await supabase
      .from('book_chunks')
      .select('content, metadata')
      .eq('project_id', projectId)
      .contains('assigned_chapters', [chapterNumber])
      .order('relevance_score', { ascending: false })
      .limit(15)

    const sourceContent = chunks?.map(c => c.content).join('\n\n---\n\n') || ''

    console.log(`[Write] Chapter ${chapterNumber}: "${chapter.title}" - ${chunks?.length || 0} source chunks`)

    // Step 1: Generate chapter outline with Claude
    const outlineResult = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: ChapterOutlineSchema,
      system: `You are planning a chapter for a non-fiction book. 
Create a detailed outline that will result in an engaging, well-structured chapter.
Each section should flow naturally into the next.
The hook should immediately grab attention.
The bridge should set up the next chapter.`,
      prompt: `BOOK: "${project.title}"
CHAPTER ${chapterNumber}: "${chapter.title}"

${prevEnding ? `PREVIOUS CHAPTER ENDED WITH:\n${prevEnding}\n` : ''}
${nextChapter ? `NEXT CHAPTER IS: "${nextChapter.title}"` : 'This is the final chapter.'}

SOURCE MATERIAL:
${sourceContent.slice(0, 15000)}

Create an outline for this chapter. Target 2000-3000 words total.`,
    })

    const outline = outlineResult.object

    // Save outline
    await supabase
      .from('book_chapters')
      .update({ 
        hook: outline.hook,
        outline: outline,
        status: 'writing',
      })
      .eq('id', chapter.id)

    // Step 2: Write each section with GPT-4o
    const sections: string[] = []

    // Write the opening hook
    const hookResult = await generateText({
      model: openai('gpt-4o'),
      system: `You are writing a chapter for "${project.title}".
Match this approved tone:
${project.approved_tone_sample?.slice(0, 1500) || 'Professional but engaging, with concrete examples.'}

Write in a way that flows naturally. Use the source material as your foundation.`,
      prompt: `Write the opening of Chapter ${chapterNumber}: "${chapter.title}"

HOOK TO USE: ${outline.hook}

${prevEnding ? `Connect naturally from this ending:\n"${prevEnding}"` : 'This is the first chapter.'}

SOURCE MATERIAL:
${sourceContent.slice(0, 5000)}

Write approximately 300-400 words for the chapter opening. End with a natural transition into the first section.`,
    })

    sections.push(hookResult.text)

    // Write each section
    for (let i = 0; i < outline.sections.length; i++) {
      const section = outline.sections[i]
      const prevSection = i > 0 ? sections[sections.length - 1].slice(-500) : hookResult.text.slice(-500)

      const sectionResult = await generateText({
        model: openai('gpt-4o'),
        system: `You are writing a section for "${project.title}".
Match the established tone. Use concrete examples and smooth transitions.`,
        prompt: `CHAPTER ${chapterNumber}: "${chapter.title}"
SECTION: "${section.title}"

KEY POINTS TO COVER:
${section.keyPoints.map(p => `- ${p}`).join('\n')}

PREVIOUS TEXT ENDED WITH:
"${prevSection}"

SOURCE MATERIAL:
${sourceContent.slice(0, 5000)}

Write approximately ${section.targetWords} words. Connect smoothly from the previous text.`,
      })

      sections.push(`\n\n## ${section.title}\n\n${sectionResult.text}`)
    }

    // Write the bridge to next chapter
    if (nextChapter) {
      const bridgeResult = await generateText({
        model: openai('gpt-4o'),
        system: `You are writing a transition at the end of a chapter.`,
        prompt: `End Chapter ${chapterNumber}: "${chapter.title}" with a bridge to the next chapter: "${nextChapter.title}"

BRIDGE DIRECTION: ${outline.bridge}

LAST SECTION ENDED WITH:
"${sections[sections.length - 1].slice(-500)}"

Write 2-3 sentences that create anticipation for what's coming next.`,
      })

      sections.push(`\n\n${bridgeResult.text}`)
    }

    // Combine all sections
    const fullContent = `# Chapter ${chapterNumber}: ${chapter.title}\n\n${sections.join('')}`
    const wordCount = fullContent.split(/\s+/).length

    // Save the completed chapter
    await supabase
      .from('book_chapters')
      .update({
        content: fullContent,
        word_count: wordCount,
        status: 'done',
      })
      .eq('id', chapter.id)

    console.log(`[Write] Chapter ${chapterNumber} complete: ${wordCount} words`)

    return NextResponse.json({
      success: true,
      chapterNumber,
      wordCount,
    })

  } catch (error) {
    console.error('[Write] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write chapter' },
      { status: 500 }
    )
  }
}

