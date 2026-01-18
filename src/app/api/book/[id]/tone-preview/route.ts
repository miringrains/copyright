import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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
 * POST /api/book/[id]/tone-preview - Generate a sample passage for tone approval
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const body = await request.json()
    const { feedback } = body

    const supabase = getServerClient()

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('book_projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get first chapter
    const { data: chapters } = await supabase
      .from('book_chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('chapter_number')
      .limit(1)

    const firstChapter = chapters?.[0]

    // Get some sample content from chunks
    const { data: chunks } = await supabase
      .from('book_chunks')
      .select('content')
      .eq('project_id', projectId)
      .limit(5)

    const sampleContent = chunks?.map(c => c.content).join('\n\n').slice(0, 3000) || ''

    // Build the prompt
    let adjustments = ''
    if (feedback) {
      adjustments = `\n\nUSER FEEDBACK - ADJUST ACCORDINGLY:\n${feedback}`
    }

    const result = await generateText({
      model: openai('gpt-4o'),
      system: `You are writing a sample passage to demonstrate the writing style for a practical non-fiction book.

${WRITING_STYLE}${adjustments}`,
      prompt: `Write a sample opening passage (~400 words) for:

BOOK: "${project.title}"${project.subtitle ? `\nSubtitle: ${project.subtitle}` : ''}
FIRST CHAPTER: "${firstChapter?.title || 'Introduction'}"

SOURCE MATERIAL TO DRAW FROM:
${sampleContent}

Write a sample that demonstrates clear, direct, practical teaching. Start with a concrete fact or statement, not "imagine" or scene-setting. Every sentence should either teach something or set up the next thing you'll teach.`,
    })

    // Save the sample
    const toneSettings = {
      ...((project.tone_settings as Record<string, unknown>) || {}),
      lastFeedback: feedback,
      generatedAt: new Date().toISOString(),
    }

    await supabase
      .from('book_projects')
      .update({ 
        tone_settings: toneSettings,
        approved_tone_sample: result.text,
      })
      .eq('id', projectId)

    return NextResponse.json({
      sample: result.text,
      wordCount: result.text.split(/\s+/).length,
    })

  } catch (error) {
    console.error('[Tone Preview] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tone preview' },
      { status: 500 }
    )
  }
}
