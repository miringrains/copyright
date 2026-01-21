import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// ============================================================================
// NARRATIVE PLANNING SCHEMA
// ============================================================================

const NarrativePlanSchema = z.object({
  centralQuestion: z.string().describe('The ONE question this chapter answers for the reader'),
  openingHook: z.string().describe('A specific fact, story, or observation that pulls the reader in (not generic)'),
  journey: z.array(z.string()).describe('3-5 key moves the chapter makes, in order, to answer the central question'),
  payoff: z.string().describe('What the reader understands by the end that they didn\'t at the start'),
  throughLine: z.string().describe('The connecting thread or example that recurs throughout to create cohesion'),
})

// ============================================================================
// WRITING STYLE
// ============================================================================

const WRITING_STYLE = `
THE SOUL OF GOOD TEACHING:

Your job is not to cover topics. It's to take the reader on a journey from confusion to clarity.

Every chapter answers ONE central question. Everything in the chapter serves that answer.

STRUCTURE THAT FLOWS:
- Open with something SPECIFIC: a fact, a story, a problem, a moment. Not a topic sentence.
- Each paragraph earns the next. The reader should feel pulled forward.
- Build understanding progressively. Don't dump, reveal.
- Close by landing the insight. The reader should feel the click of understanding.

NARRATIVE, NOT SECTIONS:
- Write as ONE continuous piece. Not a series of disconnected sections.
- Use headers SPARINGLY — only when a genuine topic shift helps the reader navigate.
- Transitions aren't bridges between islands. Each idea should flow naturally into the next.
- If you need a header every 300 words, you've structured it wrong.

PROSE CRAFT:
- Vary sentence length deliberately. Short punches. Longer ones unspool complexity.
- Concrete nouns, active verbs, simple words.
- Write like you're explaining to someone smart who genuinely wants to understand.
- Occasional dry humor when it fits. Never forced.

BANNED:
- "When you think of..." "Consider the fact that..." "It's worth noting..."
- "Imagine," "picture," "envision"
- "Fundamental," "millennia," "myriad," "plethora," "utilize"
- Generic topic sentences ("X is important because...")
- Throat-clearing openings. Start with substance.
- Em dashes — use commas, periods, or restructure
- Forced segues ("Now let's turn to..." "Speaking of which...")

WHAT PULLS READERS FORWARD:
- Questions raised and answered
- Specific examples that illuminate
- The feeling of "I never thought about it that way"
- Tension between what seems true and what is true
- The promise of understanding something they didn't before
`

// ============================================================================
// MAIN HANDLER
// ============================================================================

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

    // Get project
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
      ? prevChapter.content.split('\n\n').slice(-2).join('\n\n')
      : null

    // Get next chapter title (for bridge)
    const { data: nextChapter } = await supabase
      .from('book_chapters')
      .select('title')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber + 1)
      .single()

    // Get ALL chunks for this chapter with decent relevance
    const { data: chunks } = await supabase
      .from('book_chunks')
      .select('content, metadata, relevance_score')
      .eq('project_id', projectId)
      .contains('assigned_chapters', [chapterNumber])
      .gte('relevance_score', 0.6)
      .order('relevance_score', { ascending: false })
      .limit(20)

    const sourceContent = chunks?.map(c => c.content).join('\n\n---\n\n') || ''
    
    console.log(`[Write] Chapter ${chapterNumber}: "${chapter.title}" - ${chunks?.length || 0} source chunks`)

    // ========================================================================
    // STEP 1: NARRATIVE PLANNING
    // ========================================================================
    
    const narrativePlan = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: NarrativePlanSchema,
      system: `You are planning the narrative arc of a book chapter.

Your job is to find the STORY in the material — not just what topics to cover, but:
- What question does the reader have that this chapter answers?
- What journey takes them from not-knowing to understanding?
- What specific example, story, or thread can tie it all together?

Think like a documentary filmmaker, not a textbook writer. What's the through-line?`,
      prompt: `BOOK: "${project.title}"
CHAPTER ${chapterNumber}: "${chapter.title}"

${prevChapter ? `PREVIOUS CHAPTER: "${prevChapter.title}"` : 'This is the first chapter.'}
${nextChapter ? `NEXT CHAPTER: "${nextChapter.title}"` : 'This is the final chapter.'}

SOURCE MATERIAL:
${sourceContent.slice(0, 20000)}

Plan this chapter's narrative:
1. What's the ONE central question this chapter answers?
2. What specific hook opens it? (A fact, story, or observation — not "This chapter will discuss...")
3. What 3-5 moves does the chapter make to answer the question? (Not topics — moves. "First we see X, which makes us wonder Y, which leads to Z...")
4. What does the reader understand by the end that they didn't before?
5. What recurring example or thread ties it together?

Make the material INTERESTING. Find the story.`,
    })

    const plan = narrativePlan.object

    // Save the narrative plan
    await supabase
      .from('book_chapters')
      .update({ 
        hook: plan.openingHook,
        outline: plan,
        status: 'writing',
      })
      .eq('id', chapter.id)

    // ========================================================================
    // STEP 2: WRITE THE FULL CHAPTER IN ONE PASS
    // ========================================================================

    const journeyDescription = plan.journey.map((move, i) => `${i + 1}. ${move}`).join('\n')

    const draftResult = await generateText({
      model: openai('gpt-4o'),
      system: `You are writing a chapter for "${project.title}".

${WRITING_STYLE}

${project.approved_tone_sample ? `APPROVED TONE (match this voice):\n${project.approved_tone_sample}\n---` : ''}

CRITICAL: Write the ENTIRE chapter as ONE continuous, flowing piece. 
- Use headers ONLY if absolutely necessary for navigation (maybe 1-2, or none).
- Every paragraph should flow naturally into the next.
- Don't write disconnected sections. Write a cohesive narrative.`,
      prompt: `Write Chapter ${chapterNumber}: "${chapter.title}"

NARRATIVE PLAN:
- Central Question: ${plan.centralQuestion}
- Opening Hook: ${plan.openingHook}
- Journey:
${journeyDescription}
- Payoff: ${plan.payoff}
- Through-line: ${plan.throughLine}

${prevEnding ? `PREVIOUS CHAPTER ENDED WITH:\n"${prevEnding}"\n\nTransition naturally from there.\n` : ''}

${nextChapter ? `NEXT CHAPTER: "${nextChapter.title}" — Set this up subtly at the end.\n` : ''}

SOURCE MATERIAL (ground everything in this):
${sourceContent.slice(0, 25000)}

Write 1500-2500 words. 

START with the hook — something specific and interesting, not "This chapter discusses..."
FOLLOW the journey — each move should flow naturally into the next.
END with the payoff — the reader should feel the insight land.
WEAVE in the through-line — use it to create cohesion.

Write it as one continuous piece. Minimal or no headers. Let it flow.`,
    })

    let chapterContent = draftResult.text

    // ========================================================================
    // STEP 3: EDITORIAL PASS — RHYTHM, CLARITY, COHESION
    // ========================================================================

    const editedResult = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: `You are an editor improving a book chapter for flow, rhythm, and clarity.

You CAN:
- Restructure sentences for better flow
- Remove redundancy
- Strengthen weak transitions
- Vary sentence length for rhythm
- Cut throat-clearing phrases
- Remove unnecessary headers if they interrupt flow
- Tighten prose (cut needless words)

You CANNOT:
- Add new factual information
- Change the fundamental argument
- Alter the tone significantly
- Make it longer

The chapter should read like ONE conversation, not stitched-together sections.`,
      prompt: `Edit this chapter for flow, rhythm, and clarity. Make it read as one cohesive piece.

${chapterContent}

Return the edited chapter. Focus on:
1. Does each paragraph flow naturally into the next?
2. Is there sentence variety (short punches mixed with longer explanations)?
3. Are there any jarring transitions or repeated ideas?
4. Do any headers interrupt the flow unnecessarily?
5. Are there any throat-clearing phrases to cut?

Return the improved chapter.`,
    })

    const finalContent = `# Chapter ${chapterNumber}: ${chapter.title}\n\n${editedResult.text}`
    const wordCount = finalContent.split(/\s+/).length

    // Save the completed chapter
    await supabase
      .from('book_chapters')
      .update({
        content: finalContent,
        word_count: wordCount,
        status: 'done',
      })
      .eq('id', chapter.id)

    console.log(`[Write] Chapter ${chapterNumber} complete: ${wordCount} words`)

    return NextResponse.json({
      success: true,
      chapterNumber,
      wordCount,
      content: finalContent,
    })

  } catch (error) {
    console.error('[Write] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write chapter' },
      { status: 500 }
    )
  }
}
