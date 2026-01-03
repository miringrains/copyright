import mammoth from 'mammoth'
import type { ParsedDocument } from './pdf'

export async function parseWord(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    
    const content = result.value
      .replace(/\s+/g, ' ')
      .trim()
    
    // Log any warnings
    if (result.messages.length > 0) {
      console.warn('Mammoth warnings:', result.messages)
    }
    
    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
      },
    }
  } catch (error) {
    throw new Error(
      `Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export async function parseWordToHtml(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer })
    return result.value
  } catch (error) {
    throw new Error(
      `Failed to convert Word to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

