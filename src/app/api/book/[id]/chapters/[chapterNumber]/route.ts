import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

interface ContentBlock {
  type: 'text' | 'image'
  id: string
  content?: string
  url?: string
  width?: number
  alt?: string
  path?: string
}

/**
 * GET /api/book/[id]/chapters/[chapterNumber] - Get a specific chapter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterNumber: string }> }
) {
  const { id: projectId, chapterNumber } = await params
  
  try {
    const supabase = getServerClient()
    
    const { data: chapter, error } = await supabase
      .from('book_chapters')
      .select('*')
      .eq('project_id', projectId)
      .eq('chapter_number', parseInt(chapterNumber))
      .single()
    
    if (error || !chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }
    
    return NextResponse.json(chapter)
    
  } catch (error) {
    console.error('[Chapters API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/book/[id]/chapters/[chapterNumber] - Update chapter content
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterNumber: string }> }
) {
  const { id: projectId, chapterNumber } = await params
  
  try {
    const body = await request.json()
    const { content, contentBlocks } = body as { 
      content?: string
      contentBlocks?: ContentBlock[]
    }
    
    const supabase = getServerClient()
    
    // Build update object
    const updates: Record<string, unknown> = {}
    
    if (content !== undefined) {
      updates.content = content
      updates.word_count = content.split(/\s+/).filter(Boolean).length
    }
    
    if (contentBlocks !== undefined) {
      updates.content_blocks = contentBlocks
      
      // If we have content blocks, also update the markdown content
      // for backward compatibility and export
      if (contentBlocks.length > 0) {
        const markdownContent = contentBlocks.map(block => {
          if (block.type === 'text') {
            return block.content || ''
          } else if (block.type === 'image') {
            const alt = block.alt || ''
            const widthAttr = block.width !== 100 ? `{width=${block.width}}` : ''
            return `![${alt}](${block.url})${widthAttr}`
          }
          return ''
        }).join('\n\n')
        
        updates.content = markdownContent
        updates.word_count = markdownContent.split(/\s+/).filter(Boolean).length
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }
    
    const { data: chapter, error } = await supabase
      .from('book_chapters')
      .update(updates)
      .eq('project_id', projectId)
      .eq('chapter_number', parseInt(chapterNumber))
      .select()
      .single()
    
    if (error) {
      console.error('[Chapters API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      chapter,
    })
    
  } catch (error) {
    console.error('[Chapters API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
