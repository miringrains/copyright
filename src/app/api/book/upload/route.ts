import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/infrastructure/parsers'
import { chunkDocument } from '@/infrastructure/chunker/semantic-chunker'
import { getServerClient } from '@/infrastructure/supabase/client'

/**
 * POST /api/book/upload - Upload and process a document
 * 
 * Flow:
 * 1. Parse document (PDF/DOCX/TXT)
 * 2. Chunk into ~500 word segments
 * 3. Store chunks in Supabase
 * 
 * Embeddings are generated later during the organize step, not here.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`[Book Upload] Processing: ${file.name} (${file.size} bytes)`)

    // Parse the document
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let parsed
    try {
      parsed = await parseFile(buffer, file.type, file.name)
    } catch (parseError) {
      console.error('[Book Upload] Parse error:', parseError)
      return NextResponse.json(
        { error: `Failed to parse ${file.name}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    if (!parsed || !parsed.content || parsed.content.length < 100) {
      return NextResponse.json(
        { error: 'Document appears to be empty or could not be read' },
        { status: 400 }
      )
    }

    console.log(`[Book Upload] Extracted ${parsed.content.length} characters`)

    // Chunk the document
    const chunks = chunkDocument(parsed.content, file.name)
    console.log(`[Book Upload] Created ${chunks.length} chunks`)

    // Store chunks in database
    if (projectId && chunks.length > 0) {
      const supabase = getServerClient()

      const chunkRecords = chunks.map((chunk) => ({
        project_id: projectId,
        content: chunk.content,
        source_file: file.name,
        chunk_index: chunk.index,
        metadata: {
          headings: chunk.metadata.headings,
          wordCount: chunk.metadata.wordCount,
        },
      }))

      const { error } = await supabase
        .from('book_chunks')
        .insert(chunkRecords)

      if (error) {
        console.error('[Book Upload] Database error:', error)
        return NextResponse.json(
          { error: 'Failed to save document chunks' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      chunks: chunks.length,
      totalWords: chunks.reduce((sum, c) => sum + c.metadata.wordCount, 0),
    })

  } catch (error) {
    console.error('[Book Upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    )
  }
}
