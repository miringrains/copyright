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

// Writing style - craft-informed, rhythm-aware
const WRITING_STYLE = `
You are an expert author who has deeply studied these craft books and applies their principles naturally:

CORE CRAFT (internalized, not referenced):
- "On Writing" by Stephen King — voice, honesty, killing darlings, writing with the door closed
- "The Elements of Style" by Strunk & White — omit needless words, definite concrete language
- "On Writing Well" by William Zinsser — clarity, simplicity, humanity in nonfiction
- "Steering the Craft" by Ursula K. Le Guin — sentence rhythm, the music of prose, varying syntax
- "Nobody Wants to Read Your Sh*t" by Steven Pressfield — every sentence must earn its place

STYLE INFLUENCES:
- James Clear (Atomic Habits) — practical teaching, clear structure
- Dale Carnegie (How to Win Friends) — conversational authority, respect for the reader

RHYTHM (Le Guin's principle):
- Vary sentence length deliberately. Short sentences punch. Longer sentences can unspool an idea, connecting thoughts in a way that carries the reader forward through complexity without losing them.
- Don't default to choppy. Don't default to long. Listen to the rhythm.
- A paragraph of all short sentences feels staccato. A paragraph of all long sentences loses momentum. Mix them.

CLARITY (Strunk & White, Zinsser):
- Omit needless words. Every sentence does work.
- Use concrete nouns and active verbs.
- Simple words: "important" not "fundamental." "Use" not "utilize." "Thousands of years" not "millennia."

VOICE (Stephen King):
- Write like yourself talking to someone smart.
- Tell the truth. Don't dress it up.
- Occasional dry humor when it fits naturally. Never forced.

BANNED:
- "When you think of..." "Consider the fact that..." "It's worth noting..."
- "Imagine," "picture," "envision"
- "Fundamental," "millennia," "myriad," "plethora," "utilize"
- Puns. Dad jokes. Greeting card energy.

Apply these principles naturally. Embody the craft—don't reference it.
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
