import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

/**
 * GET /api/book - List in-progress book projects for resume
 */
export async function GET() {
  try {
    const supabase = getServerClient()

    // Get all non-complete projects, most recent first
    const { data: projects, error } = await supabase
      .from('book_projects')
      .select('id, title, subtitle, status, progress, updated_at, created_at')
      .neq('status', 'complete')
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[Book API] Failed to list projects:', error)
      return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 })
    }

    // Get chapter counts for each project
    const projectsWithProgress = await Promise.all(
      (projects || []).map(async (project) => {
        const { data: chapters } = await supabase
          .from('book_chapters')
          .select('status')
          .eq('project_id', project.id)

        const totalChapters = chapters?.length || 0
        const writtenChapters = chapters?.filter(c => c.status === 'done').length || 0

        return {
          id: project.id,
          title: project.title,
          subtitle: project.subtitle,
          status: project.status,
          progress: project.progress,
          updatedAt: project.updated_at,
          createdAt: project.created_at,
          chapters: {
            total: totalChapters,
            written: writtenChapters,
          },
        }
      })
    )

    return NextResponse.json({ projects: projectsWithProgress })

  } catch (error) {
    console.error('[Book API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Create the book project with initial progress state
    const initialProgress = {
      current_step: 'upload',
      chunks_reviewed: false,
      tone_approved: false,
      chapters_written: [],
      current_chapter: null,
      last_activity: new Date().toISOString(),
    }

    const { data: project, error } = await supabase
      .from('book_projects')
      .insert({
        title,
        subtitle: subtitle || null,
        table_of_contents: tableOfContents,
        status: 'draft',
        progress: initialProgress,
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

