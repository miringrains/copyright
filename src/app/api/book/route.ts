import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

/**
 * POST /api/book - Create a new book project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, subtitle, tableOfContents } = body

    if (!title || !tableOfContents || !Array.isArray(tableOfContents)) {
      return NextResponse.json(
        { error: 'Title and table of contents are required' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    // Create the book project
    const { data: project, error } = await supabase
      .from('book_projects')
      .insert({
        title,
        subtitle: subtitle || null,
        table_of_contents: tableOfContents,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('[Book API] Failed to create project:', error)
      return NextResponse.json(
        { error: 'Failed to create book project' },
        { status: 500 }
      )
    }

    // Create chapter records
    const chapters = tableOfContents.map((chapter: { number: number; title: string }) => ({
      project_id: project.id,
      chapter_number: chapter.number,
      title: chapter.title,
      status: 'pending',
    }))

    const { error: chaptersError } = await supabase
      .from('book_chapters')
      .insert(chapters)

    if (chaptersError) {
      console.error('[Book API] Failed to create chapters:', chaptersError)
      // Don't fail the whole request, chapters can be created later
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      chapterCount: tableOfContents.length,
    })

  } catch (error) {
    console.error('[Book API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

