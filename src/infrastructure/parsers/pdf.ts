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
    // pdf-parse v2 uses class-based API
    const { PDFParse } = await import('pdf-parse')
    
    // Convert Buffer to Uint8Array for pdf-parse v2
    const uint8Array = new Uint8Array(buffer)
    
    // Create parser instance with data
    const parser = new PDFParse({ data: uint8Array })
    
    // Get text content
    const textResult = await parser.getText()
    
    // Get metadata
    let info: { Title?: string; Author?: string } = {}
    let numPages = 0
    try {
      const infoResult = await parser.getInfo()
      info = infoResult.info || {}
      numPages = infoResult.total || textResult.pages?.length || 0
    } catch {
      // Info extraction may fail on some PDFs
      numPages = textResult.pages?.length || 0
    }
    
    // Clean up
    await parser.destroy()
    
    const content = textResult.text
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      content,
      metadata: {
        title: info.Title,
        author: info.Author,
        pages: numPages,
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
