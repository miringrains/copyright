import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/infrastructure/parsers'
import { chunkDocument } from '@/infrastructure/chunker/semantic-chunker'
import { generateEmbeddings } from '@/infrastructure/embeddings/client'
import { getServerClient } from '@/infrastructure/supabase/client'

/**
 * POST /api/book/upload - Upload and process a document
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

    console.log(`[Book Upload] Processing file: ${file.name} (${file.size} bytes)`)

    // Parse the document
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const parsed = await parseFile(buffer, file.type, file.name)

    if (!parsed || !parsed.content) {
      return NextResponse.json(
        { error: 'Failed to parse document' },
        { status: 400 }
      )
    }

    const content = parsed.content
    console.log(`[Book Upload] Parsed ${content.length} characters`)

    // Chunk the document
    const chunks = chunkDocument(content, file.name)
    console.log(`[Book Upload] Created ${chunks.length} chunks`)

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks.map(c => c.content))
    console.log(`[Book Upload] Generated ${embeddings.length} embeddings`)

    // Store chunks in database if projectId provided
    if (projectId) {
      const supabase = getServerClient()

      const chunkRecords = chunks.map((chunk, i) => ({
        project_id: projectId,
        content: chunk.content,
        source_file: chunk.sourceFile,
        chunk_index: chunk.index,
        embedding: JSON.stringify(embeddings[i].embedding),
        metadata: {
          headings: chunk.metadata.headings,
          wordCount: chunk.metadata.wordCount,
        },
      }))

      const { error } = await supabase
        .from('book_chunks')
        .insert(chunkRecords)

      if (error) {
        console.error('[Book Upload] Failed to store chunks:', error)
        // Continue anyway, we'll return chunk count
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

