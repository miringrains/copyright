import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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

    // Build the tone adjustment instructions
    let toneInstructions = ''
    if (feedback) {
      toneInstructions = `\n\nADJUSTMENTS REQUESTED:\n${feedback}`
    }

    const result = await generateText({
      model: openai('gpt-4o'),
      system: `You are a skilled non-fiction author. Write a sample opening passage (~500 words) for a book chapter that demonstrates your writing style.

WRITING PRINCIPLES:
1. Open with a hook - a compelling question, surprising fact, or vivid scene
2. Use concrete examples and specific details, not abstractions
3. Vary sentence length for rhythm
4. Include at least one brief story or example
5. Bridge naturally from the hook to the main topic
6. Write in a way that flows - each paragraph should lead to the next
7. Be authoritative but approachable
8. Show, don't tell - use examples to illustrate points

AVOID:
- Clichés and generic openers ("In today's fast-paced world...")
- Listicle-style writing
- Dry, academic tone
- Empty enthusiasm without substance
- Abrupt transitions${toneInstructions}`,
      prompt: `Write a sample opening passage for:

BOOK: "${project.title}"${project.subtitle ? `\nSubtitle: ${project.subtitle}` : ''}

FIRST CHAPTER: "${firstChapter?.title || 'Introduction'}"

SAMPLE SOURCE MATERIAL:
${sampleContent}

Write approximately 500 words that demonstrates the tone, style, and approach for this book. This is a sample for the author to approve before we write the full book.`,
    })

    // Save the approved sample if this is final approval
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

