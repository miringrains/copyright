import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Direct, practical writing style - clear and simple
const WRITING_STYLE = `
STYLE: Write for smart adults who prefer simple language.

WORD CHOICE:
- Use everyday words. "Important" not "fundamental." "Thousands of years" not "millennia."
- If a 5th grader wouldn't know the word, find a simpler one.
- Short words beat long ones. "Use" not "utilize." "Help" not "facilitate."
- Cut filler phrases: "it's important to note that" → just say the thing.

SENTENCE STRUCTURE:
- Lead with the point. "Wool shrinks in hot water" not "When considering wool care..."
- One idea per sentence. Break up compound sentences.
- Mix lengths: short for impact, medium for explanation. Rarely go long.

TONE:
- Talk to the reader like a friend explaining something useful.
- Be direct, not formal. "Here's why" not "The reason for this is."
- Skip the buildup. Don't "set the stage" - just teach.

BANNED:
- "Fundamental," "millennia," "myriad," "plethora," "utilize"
- "When you think of..." "Consider the fact that..." "It's worth noting..."
- Any word you'd never say out loud to a friend

GOOD EXAMPLE:
"Wool has kept humans warm for thousands of years. Over 200 sheep breeds exist, each producing different types of wool.

What makes wool special? Three things.

First, it stays warm when wet. Get cotton wet and it loses almost all its insulation. Wool keeps most of its warmth because the fibers trap air in tiny crimped pockets.

Second, it handles sweat well. Wool absorbs up to 30% of its weight in moisture before it feels damp. That's why wool socks work for hiking—they pull sweat away from your skin."
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
