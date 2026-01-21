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
  sections: z.array(z.object({
    title: z.string().describe('Section heading (concise, descriptive)'),
    purpose: z.string().describe('What this section accomplishes for the reader'),
    keyContent: z.array(z.string()).describe('3-5 specific points to cover'),
    targetWords: z.number().describe('Word count target for this section'),
  })).describe('4-7 sections that structure the chapter from intro through practical application'),
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

CHAPTER STRUCTURE:
- HOOK: Open with something SPECIFIC — a fact, a story, a problem. Not a topic sentence.
- UNDERSTANDING: Build the "why" — history, science, how it works. This earns trust.
- PRACTICAL APPLICATION: Deliver genuinely useful information — where you find this, how to handle it, what to do and avoid.
- Use section headers to help readers navigate longer chapters. Headers should be clear and useful, not clever.
- Each section flows into the next. Transitions should feel natural, not forced.

PROSE CRAFT:
- Vary sentence length. Short punches. Longer ones unspool complexity.
- Concrete nouns, active verbs.
- SIMPLE WORDS. Always prefer the common word over the fancy one.
- Write like you're explaining to a friend who genuinely wants to understand.
- Occasional dry humor when it fits. Never forced.

WORD CHOICE — ALWAYS SIMPLER:
- "careful" not "meticulous"
- "delicate" not "ethereal"  
- "beautiful" not "resplendent"
- "change" not "transformation"
- "use" not "utilize"
- "help" not "facilitate"
- "important" not "fundamental" or "paramount"
- "old" not "ancient" (unless literally ancient)
- "many" not "myriad" or "plethora"
- "complex" not "intricate" or "labyrinthine"

BANNED PHRASES:
- "When you think of..." "Consider the fact that..." "It's worth noting..."
- "Imagine," "picture," "envision"
- "Faustian bargain," "Achilles' heel," "double-edged sword" (clichés)
- "In the realm of..." "In the world of..."
- "Journey" (as metaphor), "dance" (as metaphor), "symphony"
- Generic topic sentences ("X is important because...")
- Throat-clearing openings
- Em dashes — use commas, periods, or restructure
- "Now let's turn to..." "Speaking of which..."

WHAT PULLS READERS FORWARD:
- Questions raised and answered
- Specific examples that illuminate
- The feeling of "I never thought about it that way"
- Practical wisdom they can actually use
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
      system: `You are planning a comprehensive book chapter.

Your job is to structure a FULL chapter (3000-5000 words) that:
1. Opens with an engaging hook that pulls readers in
2. Builds understanding — the "why" behind the subject (history, science, how it works)
3. Delivers practical value — where you find this in real life, how to handle it, what to do

A good chapter has 4-7 sections. Structure typically follows:
- HOOK/INTRO: Engaging opening that establishes relevance (300-500 words)
- UNDERSTANDING sections: History, how it works, what makes it unique (1000-2000 words total)
- PRACTICAL sections: Where you find it, how to care for it, common mistakes, best practices (1000-2000 words total)
- CLOSING: Landing the insight, what to remember (200-400 words)

Each section needs a clear purpose and should flow naturally into the next.`,
      prompt: `BOOK: "${project.title}"
CHAPTER ${chapterNumber}: "${chapter.title}"

${prevChapter ? `PREVIOUS CHAPTER: "${prevChapter.title}"` : 'This is the first chapter.'}
${nextChapter ? `NEXT CHAPTER: "${nextChapter.title}"` : 'This is the final chapter.'}

SOURCE MATERIAL:
${sourceContent.slice(0, 25000)}

Plan this chapter with 4-7 sections:

1. What's the central question this chapter answers?
2. What specific hook opens it? (A vivid moment, surprising fact, or relatable problem)
3. Plan 4-7 sections that cover:
   - An engaging introduction
   - Understanding the subject (history, how it works, what makes it unique)
   - Practical application (where you find it, how to handle it, care tips, common mistakes)
   - A satisfying close
4. What does the reader understand by the end?
5. What thread ties it together?

For each section, specify:
- A clear title
- Its purpose (what it accomplishes)
- 3-5 specific points to cover
- Target word count

Total chapter should be 3000-5000 words. Make it comprehensive and genuinely useful.`,
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
    // STEP 2: WRITE THE FULL CHAPTER
    // ========================================================================

    const sectionsDescription = plan.sections.map((section, i) => 
      `## ${section.title} (~${section.targetWords} words)
Purpose: ${section.purpose}
Cover:
${section.keyContent.map(point => `- ${point}`).join('\n')}`
    ).join('\n\n')

    const totalTargetWords = plan.sections.reduce((sum, s) => sum + s.targetWords, 0)

    const draftResult = await generateText({
      model: openai('gpt-4o'),
      system: `You are writing a chapter for "${project.title}".

${WRITING_STYLE}

${project.approved_tone_sample ? `APPROVED TONE (match this voice):\n${project.approved_tone_sample}\n---` : ''}

CHAPTER STRUCTURE:
- Use the section headers provided. They help readers navigate.
- Each section should flow naturally into the next — don't just dump information.
- Within sections, vary paragraph length. Mix explanation with examples.
- The chapter should feel like ONE coherent piece, not disconnected chunks.
- Hit the word count targets for each section. This is a FULL chapter, not a summary.`,
      prompt: `Write Chapter ${chapterNumber}: "${chapter.title}"

CENTRAL QUESTION: ${plan.centralQuestion}
OPENING HOOK: ${plan.openingHook}
THROUGH-LINE: ${plan.throughLine}
PAYOFF: ${plan.payoff}

SECTIONS TO WRITE:
${sectionsDescription}

${prevEnding ? `PREVIOUS CHAPTER ENDED WITH:\n"${prevEnding}"\n\nTransition naturally from there.\n` : ''}

${nextChapter ? `NEXT CHAPTER: "${nextChapter.title}" — Set this up at the end.\n` : ''}

SOURCE MATERIAL (ground everything in this):
${sourceContent.slice(0, 30000)}

REQUIREMENTS:
- Total: ${totalTargetWords} words minimum
- START with the hook — vivid and specific, not "This chapter discusses..."
- USE the section headers as provided
- COVER all the key content points in each section
- WEAVE the through-line throughout for cohesion
- END with the payoff — the reader should feel they learned something useful
- Use SIMPLE words. "Careful" not "meticulous". "Delicate" not "ethereal".

Write the full chapter now.`,
    })

    let chapterContent = draftResult.text

    // ========================================================================
    // STEP 3: EDITORIAL PASS — SIMPLIFY, TIGHTEN, FLOW
    // ========================================================================

    const editedResult = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: `You are an editor improving a book chapter. Your priorities:

1. SIMPLIFY WORD CHOICE — Replace fancy words with simple ones:
   - "meticulous" → "careful"
   - "ethereal" → "delicate" or "light"
   - "transformation" → "change"
   - "utilize" → "use"
   - "fundamental" → "important" or "basic"
   - "myriad" → "many"
   - "intricate" → "complex" or "detailed"
   - "commence" → "start" or "begin"
   - "facilitate" → "help"
   - "paramount" → "important"

2. CUT CLICHÉS AND PURPLE PROSE:
   - "Faustian bargain" — just describe the tradeoff
   - "Achilles' heel" — just say "weakness"
   - "double-edged sword" — describe the tradeoff
   - "dance" as metaphor (e.g., "delicate dance") — just describe what's happening
   - "symphony of..." — cut entirely
   - "journey" as metaphor — cut or simplify
   - "in the realm of" — cut

3. TIGHTEN PROSE:
   - Cut throat-clearing phrases
   - Remove redundancy
   - Strengthen weak transitions

4. KEEP SECTION HEADERS — They help readers navigate.

You CANNOT:
- Add new factual information
- Change the fundamental structure
- Remove section headers (keep them)`,
      prompt: `Edit this chapter. Priority: simplify word choice and cut purple prose.

${chapterContent}

Replace every fancy word with a simpler alternative. Cut clichés. Keep headers. Return the improved chapter.`,
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
