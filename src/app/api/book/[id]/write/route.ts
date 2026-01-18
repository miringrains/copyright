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

// Writing style - craft-informed, rhythm-aware, mental-model focused
const WRITING_STYLE = `
TEACHING PHILOSOPHY (the soul of the writing):

Your job is not to list facts. It's to help the reader THINK about this subject.

A great guide succeeds when the reader no longer needs the guide.

Core approach:
- Before telling what to do, explain why it works this way
- Properties first, instructions second — rules feel earned when the reader understands structure
- History explains behavior, it's not decoration — use the past as a causal engine
- Acknowledge tradeoffs — what it's good at, where it compromises, when it fails
- Teach failure modes — readers remember consequences, not instructions
- The goal is independent judgment, not memorization

When you explain WHY something behaves a certain way, the reader can predict outcomes and make decisions without re-reading. That's the target.

---

PROSE CRAFT (how the words land):

Internalized from: King (On Writing), Strunk & White, Zinsser (On Writing Well), Le Guin (Steering the Craft), Pressfield.

RHYTHM:
- Vary sentence length deliberately. Short sentences punch. Longer sentences can unspool an idea, connecting thoughts in a way that carries the reader forward through complexity without losing them.
- A paragraph of all short sentences feels staccato. All long loses momentum. Mix them.

CLARITY:
- Omit needless words. Every sentence does work.
- Concrete nouns, active verbs.
- Simple words: "important" not "fundamental." "Use" not "utilize."

VOICE:
- Write like yourself talking to someone smart who genuinely wants to understand.
- Tell the truth. Don't dress it up.
- Occasional dry humor when it fits naturally. Never forced.

BANNED:
- "When you think of..." "Consider the fact that..." "It's worth noting..."
- "Imagine," "picture," "envision"
- "Fundamental," "millennia," "myriad," "plethora," "utilize"
- Puns. Dad jokes. Greeting card energy.
- Lists where conditional logic ("if X, then Y") would serve better
- Em dashes (—) and en dashes (–) — use commas, periods, or restructure instead
- Hyphenated compound modifiers unless absolutely necessary for clarity

The reader should finish a section feeling oriented, not just informed.
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

    // Get relevant chunks for this chapter - only high relevance, primary topic
    const { data: chunks } = await supabase
      .from('book_chunks')
      .select('content, metadata, relevance_score')
      .eq('project_id', projectId)
      .contains('assigned_chapters', [chapterNumber])
      .gte('relevance_score', 0.7) // Only chunks that are PRIMARILY about this topic
      .order('relevance_score', { ascending: false })
      .limit(15)

    // Join chunks but remind AI to filter strictly
    const sourceContent = chunks?.map(c => c.content).join('\n\n---\n\n') || ''
    
    // Add topic context to help AI filter
    const topicReminder = `TOPIC: This chapter is about "${chapter.title}" ONLY. 
Ignore any information in the source material that's about other topics.
If source material mentions other subjects, skip those parts.`

    console.log(`[Write] Chapter ${chapterNumber}: "${chapter.title}" - ${chunks?.length || 0} source chunks`)

    // Step 1: Generate chapter outline with Claude - focus on mental model building
    const outlineResult = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: ChapterOutlineSchema,
      system: `You are planning a chapter for a practical non-fiction guide.

Your goal is to help the reader BUILD A MENTAL MODEL, not memorize facts.

Structure the chapter so that:
1. CLASSIFICATION first — what kind of thing is this? What category does it belong to?
2. STRUCTURE/PROPERTIES — how is it made? What defines its behavior?
3. BEHAVIOR UNDER USE — what happens when you use it? Strengths and failure modes.
4. CARE/HANDLING — now instructions make sense because the reader understands WHY

This order matters. Rules feel arbitrary without understanding. Properties first, instructions second.

${topicReminder}`,
      prompt: `BOOK: "${project.title}"
CHAPTER ${chapterNumber}: "${chapter.title}"

${prevEnding ? `PREVIOUS CHAPTER ENDED WITH:\n${prevEnding}\n` : ''}
${nextChapter ? `NEXT CHAPTER IS: "${nextChapter.title}"` : 'This is the final chapter.'}

SOURCE MATERIAL (filter for ${chapter.title} only):
${sourceContent.slice(0, 15000)}

Create an outline that builds understanding progressively:
- Start with what this thing IS (classification, origin)
- Move to how it WORKS (structure, properties)
- Then how it BEHAVES (under use, stress, time)
- End with how to HANDLE it (care that preserves its nature)

The reader should finish understanding WHY things work the way they do, not just WHAT to do.

Target 1500-2500 words total. Focus on "${chapter.title}" only.`,
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

${topicReminder}

${project.approved_tone_sample ? `APPROVED TONE SAMPLE:\n${project.approved_tone_sample.slice(0, 1000)}` : ''}`,
      prompt: `Write the opening of Chapter ${chapterNumber}: "${chapter.title}"

MAIN POINT TO ESTABLISH: ${outline.openingPoint}

${prevEnding ? `Previous chapter ended with: "${prevEnding}"\nConnect briefly, then move on.` : ''}

SOURCE MATERIAL (use ONLY information about ${chapter.title}):
${sourceContent.slice(0, 5000)}

Write 200-300 words about "${chapter.title}" ONLY. Start with your main point. No "imagine" or "picture" openings.`,
    })

    sections.push(hookResult.text)

    // Write each section with FULL chapter context for continuity
    for (let i = 0; i < outline.sections.length; i++) {
      const section = outline.sections[i]
      
      // Build context: what's been written so far in this chapter
      const writtenSoFar = sections.join('\n\n')
      const lastParagraph = sections[sections.length - 1].split('\n\n').slice(-1)[0] || ''
      
      // What sections are coming next (for flow awareness)
      const upcomingSections = outline.sections.slice(i + 1).map(s => s.title)

      const sectionResult = await generateText({
        model: openai('gpt-4o'),
        system: `You are writing a section for a practical guide.

${WRITING_STYLE}

${topicReminder}

CONTINUITY IS CRITICAL:
- Read what's been written so far. Your section must flow naturally from it.
- Don't repeat information already covered.
- Don't use jarring transitions. The chapter should read as one cohesive piece.
- You're continuing a conversation, not starting a new one.`,
        prompt: `CHAPTER ${chapterNumber}: "${chapter.title}"
SECTION: "${section.title}"

WHAT'S BEEN WRITTEN SO FAR IN THIS CHAPTER:
---
${writtenSoFar.slice(-2000)}
---

LAST PARAGRAPH (transition from here):
"${lastParagraph}"

${upcomingSections.length > 0 ? `SECTIONS STILL TO COME: ${upcomingSections.join(', ')}` : 'This is the final section before the closing.'}

KEY POINTS TO COVER (about ${chapter.title} only):
${section.keyPoints.map(p => `- ${p}`).join('\n')}

SOURCE MATERIAL (ONLY use information about ${chapter.title}):
${sourceContent.slice(0, 5000)}

Write ${section.targetWords} words about "${chapter.title}" ONLY. Continue naturally from where the chapter left off. Don't repeat what's already been said. Ignore any source material about other topics.`,
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
    const rawContent = `# Chapter ${chapterNumber}: ${chapter.title}\n\n${sections.join('')}`
    
    // CONTINUITY PASS: Smooth transitions and fix abrupt changes
    const smoothedResult = await generateText({
      model: openai('gpt-4o'),
      system: `You are editing a chapter for flow and continuity.

Your ONLY job is to smooth transitions between sections. Fix:
- Abrupt topic changes (add a bridging sentence if needed)
- Repeated information (remove redundancy)
- Jarring sentence-to-sentence jumps

DO NOT:
- Rewrite content
- Add new information
- Change the meaning or facts
- Remove substantial content
- Make it longer

Return the chapter with smooth, natural transitions. Changes should be subtle - just enough to make it read like one cohesive piece.`,
      prompt: `Smooth the transitions in this chapter. Make minimal edits for continuity.

${rawContent}`,
    })

    const fullContent = smoothedResult.text || rawContent
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
