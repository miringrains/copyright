import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/infrastructure/parsers'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse the file
    const result = await parseFile(buffer, file.type, file.name)

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: {
        ...result.metadata,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process file' 
      },
      { status: 500 }
    )
  }
}

