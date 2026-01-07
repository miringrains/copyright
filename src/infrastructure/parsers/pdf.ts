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
    // pdf-parse v2 uses ESM - dynamic import
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = pdfParseModule.default || pdfParseModule
    
    // Convert Buffer to Uint8Array for pdf-parse v2
    const uint8Array = new Uint8Array(buffer)
    const data = await pdfParse(uint8Array)
    
    const content = data.text
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      content,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        pages: data.numpages,
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
