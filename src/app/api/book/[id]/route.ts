import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

/**
 * DELETE /api/book/[id] - Delete a book project and all related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const supabase = getServerClient()

    // Delete related data in order (due to foreign keys)
    // 1. Delete chunks
    await supabase
      .from('book_chunks')
      .delete()
      .eq('project_id', projectId)

    // 2. Delete chapters
    await supabase
      .from('book_chapters')
      .delete()
      .eq('project_id', projectId)

    // 3. Delete the project
    const { error } = await supabase
      .from('book_projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('[Book API] Failed to delete project:', error)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Book API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/book/[id] - Get a specific book project
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
      .select('*')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get chapters
    const { data: chapters } = await supabase
      .from('book_chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('chapter_number')

    return NextResponse.json({
      ...project,
      chapters: chapters || [],
    })

  } catch (error) {
    console.error('[Book API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
