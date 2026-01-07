import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Direct, practical writing style like Atomic Habits or How to Win Friends
const WRITING_STYLE = `
STYLE: Write like James Clear (Atomic Habits) or Dale Carnegie (How to Win Friends).

DO:
- Start paragraphs with your main point, not buildup
- Use specific examples: "Wool shrinks at 140°F" not "wool can shrink in hot water"
- Mix short punchy sentences with longer explanatory ones
- Speak directly to the reader using "you"
- Make every paragraph teach something practical
- Use numbers and specifics when available
- Be conversational but authoritative

DON'T:
- Use "imagine," "picture," or "envision" openings
- Write purple prose ("timeless textile," "marvel of engineering")
- Use vague language when specifics exist
- Add decorative sentences that don't teach anything
- Sound like you're performing - just explain clearly

EXAMPLE OF GOOD STYLE:
"Wool is one of humanity's oldest textiles. Sheep have been domesticated for their fleece for over 10,000 years. The reason is simple: wool does three things no other natural fiber does as well.

First, it insulates even when wet. Cotton loses 90% of its insulating ability when damp. Wool retains most of its warmth because the fibers trap air in crimped pockets that water can't easily displace.

Second, it regulates temperature. Wool absorbs up to 30% of its weight in moisture without feeling damp. As it absorbs your sweat, the absorption process actually releases heat, keeping you warm in cold weather. In warm weather, the evaporation reverses, cooling you down."
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
