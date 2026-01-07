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

// Writing style - James Clear meets a witty friend
const WRITING_STYLE = `
STYLE: Write like James Clear (Atomic Habits) or Dale Carnegie (How to Win Friends) — but with occasional dry humor.

WORD CHOICE:
- Use everyday words. "Important" not "fundamental." "Thousands of years" not "millennia."
- If a 5th grader wouldn't know the word, find a simpler one.
- Short words beat long ones. "Use" not "utilize." "Help" not "facilitate."
- Cut filler: "it's important to note" → just say the thing.

SENTENCES:
- Lead with the point. "Wool shrinks in hot water" not "When considering wool care..."
- One idea per sentence. Break up long compound sentences.
- Mix lengths: short for impact, medium for explanation.

TONE:
- Talk to the reader like a smart friend explaining something useful.
- Be direct. "Here's why" not "The reason for this is."
- Skip buildup. Don't "set the stage" - just teach.

HUMOR (use sparingly, maybe once per section):
- Dry observations work best. Not jokes—just wry acknowledgment of reality.
- Example: "Wool absorbs 30% of its weight in moisture before feeling damp. Cotton gives up at about 7%. It's not even close."
- Example: "Your grandmother was right about washing wool in cold water. She just didn't explain why."
- Never force it. If nothing's funny, don't try.

BANNED:
- "Fundamental," "millennia," "myriad," "plethora," "utilize," "facilitate"
- "When you think of..." "Consider the fact that..." "It's worth noting..."
- "Imagine," "picture," "envision"
- Puns. Dad jokes. Forced humor.

BAD: "When you think of wool, you're considering a fiber that's been fundamental to human clothing for millennia."
GOOD: "For thousands of years, humans have relied on wool to keep them warm."

BAD: "structured with overlapping scales that give wool its unique property: felting"
GOOD: "covered in tiny scales that lock together when wet—which is why wool shrinks"

Write like you're explaining to a smart friend. Simple words. Clear sentences. Occasional wit.
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
