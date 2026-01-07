import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

export interface BookProgress {
  current_step: 'setup' | 'upload' | 'organize' | 'review_chunks' | 'tone' | 'writing' | 'export' | 'complete'
  chunks_reviewed: boolean
  tone_approved: boolean
  chapters_written: number[]
  current_chapter: number | null
  last_activity: string | null
}

/**
 * GET /api/book/[id]/progress - Get current progress state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const supabase = getServerClient()

    const { data: project, error } = await supabase
      .from('book_projects')
      .select('id, title, status, progress, updated_at')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get chapter counts for progress display
    const { data: chapters } = await supabase
      .from('book_chapters')
      .select('chapter_number, status, word_count')
      .eq('project_id', projectId)
      .order('chapter_number')

    const totalChapters = chapters?.length || 0
    const writtenChapters = chapters?.filter(c => c.status === 'done').length || 0

    return NextResponse.json({
      projectId: project.id,
      title: project.title,
      status: project.status,
      progress: project.progress as BookProgress,
      lastActivity: project.updated_at,
      chapters: {
        total: totalChapters,
        written: writtenChapters,
        details: chapters || [],
      },
    })

  } catch (error) {
    console.error('[Progress API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/book/[id]/progress - Update progress state
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const body = await request.json()
    const updates: Partial<BookProgress> = body

    const supabase = getServerClient()

    // Get current progress
    const { data: project } = await supabase
      .from('book_projects')
      .select('progress')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Merge updates with current progress
    const currentProgress = (project.progress || {}) as BookProgress
    const newProgress: BookProgress = {
      ...currentProgress,
      ...updates,
      last_activity: new Date().toISOString(),
    }

    // Update in database
    const { error } = await supabase
      .from('book_projects')
      .update({ 
        progress: newProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (error) {
      console.error('[Progress API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    return NextResponse.json({ success: true, progress: newProgress })

  } catch (error) {
    console.error('[Progress API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    )
  }
}

