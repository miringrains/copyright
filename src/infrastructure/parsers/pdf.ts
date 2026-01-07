import { extractText } from 'unpdf'

export interface ParsedDocument {
  content: string
  metadata: {
    title?: string
    author?: string
    pages?: number
    wordCount?: number
  }
}

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // unpdf is designed for serverless - no canvas required for text extraction
    const { text, totalPages } = await extractText(buffer, { mergePages: true })
    
    const content = (text as string)
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      content,
      metadata: {
        pages: totalPages,
        wordCount: content.split(/\s+/).length,
      },
    }
  } catch (error) {
    console.error('[PDF Parser] Error:', error)
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
