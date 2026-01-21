import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'

/**
 * POST /api/book/[id]/images - Upload an image for a chapter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const chapterNumber = formData.get('chapterNumber') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }
    
    const supabase = getServerClient()
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${projectId}/${chapterNumber || 'general'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('book-images')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      })
    
    if (error) {
      console.error('[Images] Upload error:', error)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(filename)
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    })
    
  } catch (error) {
    console.error('[Images] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/book/[id]/images - Delete an image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const { path } = await request.json()
    
    if (!path) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }
    
    // Verify the path belongs to this project
    if (!path.startsWith(`${projectId}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const supabase = getServerClient()
    
    const { error } = await supabase.storage
      .from('book-images')
      .remove([path])
    
    if (error) {
      console.error('[Images] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[Images] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
