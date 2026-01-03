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
    // Use dynamic require for pdf-parse as it doesn't support ESM properly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    
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
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
