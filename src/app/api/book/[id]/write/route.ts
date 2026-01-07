import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const ChapterOutlineSchema = z.object({
  openingPoint: z.string().describe('The main point to establish in the first paragraph'),
  sections: z.array(z.object({
    title: z.string(),
    keyPoints: z.array(z.string()),
    targetWords: z.number(),
  })),
  closingPoint: z.string().describe('The practical takeaway to end with'),
})

// Writing style guide - inspired by Atomic Habits, How to Win Friends
const WRITING_STYLE = `
WRITING RULES:
1. Be DIRECT. Start paragraphs with your point, not buildup.
2. NO "imagine," "picture," "envision" - just state the facts.
3. NO purple prose - no "timeless textile," "marvel of engineering," "delicate dance."
4. Use CONCRETE examples that teach. "Wool shrinks in hot water because the scales lock together."
5. Short sentences for impact. Longer ones for explanation. Mix them.
6. Write like you're explaining to a smart friend, not performing for an audience.
7. Every paragraph must teach something useful. Cut anything decorative.
8. Use "you" and "your" to speak directly to the reader.
9. Cite specific numbers, temperatures, percentages when available.
10. End sections with practical takeaways, not philosophical musing.

BAD: "Imagine wrapping yourself in a blanket so ancient, it once warmed the shoulders of ancient shepherds."
GOOD: "Wool is one of humanity's oldest textiles. Sheep have been domesticated for their fleece for over 10,000 years."

BAD: "The story of wool extends into the microscopic realm where each fiber is a marvel of natural engineering."
GOOD: "Under a microscope, wool fibers have overlapping scales. These scales are why wool shrinks—they lock together when agitated in water."

Write to TEACH, not to impress.
`

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
      ? prevChapter.content.split('\n').slice(-3).join('\n')
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
      system: `You are planning a chapter for a practical non-fiction book.
Create a structure that teaches clearly and directly.
Each section should cover one main topic with specific, useful information.
No fluff. No filler. Just clear teaching.`,
      prompt: `BOOK: "${project.title}"
CHAPTER ${chapterNumber}: "${chapter.title}"

${prevEnding ? `PREVIOUS CHAPTER ENDED WITH:\n${prevEnding}\n` : ''}
${nextChapter ? `NEXT CHAPTER IS: "${nextChapter.title}"` : 'This is the final chapter.'}

SOURCE MATERIAL:
${sourceContent.slice(0, 15000)}

Create an outline. Target 1500-2500 words total. Focus on practical information the reader can use.`,
    })

    const outline = outlineResult.object

    // Save outline
    await supabase
      .from('book_chapters')
      .update({ 
        hook: outline.openingPoint,
        outline: outline,
        status: 'writing',
      })
      .eq('id', chapter.id)

    // Step 2: Write the chapter with GPT-4o
    const sections: string[] = []

    // Write the opening
    const hookResult = await generateText({
      model: openai('gpt-4o'),
      system: `You are writing a chapter for "${project.title}".

${WRITING_STYLE}

${project.approved_tone_sample ? `APPROVED TONE SAMPLE:\n${project.approved_tone_sample.slice(0, 1000)}` : ''}`,
      prompt: `Write the opening of Chapter ${chapterNumber}: "${chapter.title}"

MAIN POINT TO ESTABLISH: ${outline.openingPoint}

${prevEnding ? `Previous chapter ended with: "${prevEnding}"\nConnect briefly, then move on.` : ''}

SOURCE MATERIAL:
${sourceContent.slice(0, 5000)}

Write 200-300 words. Start with your main point. No "imagine" or "picture" openings.`,
    })

    sections.push(hookResult.text)

    // Write each section
    for (let i = 0; i < outline.sections.length; i++) {
      const section = outline.sections[i]
      const prevText = sections[sections.length - 1].slice(-300)

      const sectionResult = await generateText({
        model: openai('gpt-4o'),
        system: `You are writing a section for a practical guide.

${WRITING_STYLE}`,
        prompt: `CHAPTER ${chapterNumber}: "${chapter.title}"
SECTION: "${section.title}"

KEY POINTS TO COVER:
${section.keyPoints.map(p => `- ${p}`).join('\n')}

PREVIOUS PARAGRAPH ENDED WITH:
"${prevText}"

SOURCE MATERIAL:
${sourceContent.slice(0, 5000)}

Write ${section.targetWords} words. Be direct. Teach something useful in every paragraph.`,
      })

      sections.push(`\n\n## ${section.title}\n\n${sectionResult.text}`)
    }

    // Write closing with practical takeaway
    const closingResult = await generateText({
      model: openai('gpt-4o'),
      system: `You are ending a chapter with a practical summary.`,
      prompt: `End Chapter ${chapterNumber}: "${chapter.title}"

CLOSING POINT: ${outline.closingPoint}
${nextChapter ? `NEXT CHAPTER: "${nextChapter.title}"` : 'This is the final chapter.'}

Write 2-4 sentences. Summarize the practical takeaway. ${nextChapter ? 'Set up what\'s next in one sentence.' : ''}`,
    })

    sections.push(`\n\n${closingResult.text}`)

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
      content: fullContent,
    })

  } catch (error) {
    console.error('[Write] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write chapter' },
      { status: 500 }
    )
  }
}
