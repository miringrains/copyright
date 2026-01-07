import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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
