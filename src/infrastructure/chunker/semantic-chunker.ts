/**
 * Semantic Chunker
 * 
 * Splits documents into meaningful chunks for embedding and retrieval.
 * Prioritizes:
 * 1. Heading-based splits (H1, H2, H3 in markdown)
 * 2. Paragraph boundaries
 * 3. Word count limits (~500 words per chunk)
 */

export interface Chunk {
  content: string
  index: number
  sourceFile: string
  metadata: {
    headings: string[]
    wordCount: number
    startLine?: number
    endLine?: number
  }
}

interface ChunkOptions {
  maxWords?: number
  minWords?: number
  overlapWords?: number
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxWords: 500,
  minWords: 100,
  overlapWords: 50,
}

/**
 * Split text into semantic chunks
 */
export function chunkText(
  text: string,
  sourceFile: string,
  options: ChunkOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: Chunk[] = []
  
  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n')
  
  // Split by headings first (markdown style)
  const headingSections = splitByHeadings(normalizedText)
  
  let chunkIndex = 0
  
  for (const section of headingSections) {
    const sectionChunks = splitSection(section, opts)
    
    for (const content of sectionChunks) {
      const wordCount = countWords(content)
      
      if (wordCount >= opts.minWords) {
        chunks.push({
          content: content.trim(),
          index: chunkIndex++,
          sourceFile,
          metadata: {
            headings: section.headings,
            wordCount,
          },
        })
      }
    }
  }
  
  return chunks
}

interface HeadingSection {
  headings: string[]
  content: string
}

/**
 * Split text by markdown headings
 */
function splitByHeadings(text: string): HeadingSection[] {
  const lines = text.split('\n')
  const sections: HeadingSection[] = []
  
  let currentHeadings: string[] = []
  let currentContent: string[] = []
  
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    
    if (headingMatch) {
      // Save previous section if it has content
      if (currentContent.length > 0) {
        sections.push({
          headings: [...currentHeadings],
          content: currentContent.join('\n'),
        })
        currentContent = []
      }
      
      const level = headingMatch[1].length
      const headingText = headingMatch[2].trim()
      
      // Update heading stack based on level
      if (level === 1) {
        currentHeadings = [headingText]
      } else if (level === 2) {
        currentHeadings = [currentHeadings[0] || '', headingText]
      } else if (level === 3) {
        currentHeadings = [
          currentHeadings[0] || '',
          currentHeadings[1] || '',
          headingText,
        ]
      }
    } else {
      currentContent.push(line)
    }
  }
  
  // Don't forget the last section
  if (currentContent.length > 0) {
    sections.push({
      headings: [...currentHeadings],
      content: currentContent.join('\n'),
    })
  }
  
  // If no headings found, return entire text as one section
  if (sections.length === 0) {
    sections.push({
      headings: [],
      content: text,
    })
  }
  
  return sections
}

/**
 * Split a section into chunks respecting word limits
 */
function splitSection(
  section: HeadingSection,
  opts: Required<ChunkOptions>
): string[] {
  const words = section.content.split(/\s+/).filter(Boolean)
  
  // If section is small enough, return as-is
  if (words.length <= opts.maxWords) {
    return [section.content]
  }
  
  // Split by paragraphs first
  const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim())
  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentWordCount = 0
  
  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph)
    
    // If adding this paragraph exceeds max, save current chunk
    if (currentWordCount + paragraphWords > opts.maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'))
      
      // Add overlap from end of previous chunk
      const overlapText = getOverlapText(currentChunk, opts.overlapWords)
      currentChunk = overlapText ? [overlapText] : []
      currentWordCount = countWords(overlapText || '')
    }
    
    // If single paragraph is too long, split it
    if (paragraphWords > opts.maxWords) {
      const splitParagraphs = splitLongParagraph(paragraph, opts.maxWords)
      for (const sp of splitParagraphs) {
        if (currentWordCount + countWords(sp) > opts.maxWords && currentChunk.length > 0) {
          chunks.push(currentChunk.join('\n\n'))
          currentChunk = []
          currentWordCount = 0
        }
        currentChunk.push(sp)
        currentWordCount += countWords(sp)
      }
    } else {
      currentChunk.push(paragraph)
      currentWordCount += paragraphWords
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'))
  }
  
  return chunks
}

/**
 * Split a long paragraph into smaller pieces at sentence boundaries
 */
function splitLongParagraph(paragraph: string, maxWords: number): string[] {
  // Split by sentences (rough approximation)
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
  const chunks: string[] = []
  let current: string[] = []
  let wordCount = 0
  
  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence)
    
    if (wordCount + sentenceWords > maxWords && current.length > 0) {
      chunks.push(current.join(' '))
      current = []
      wordCount = 0
    }
    
    current.push(sentence.trim())
    wordCount += sentenceWords
  }
  
  if (current.length > 0) {
    chunks.push(current.join(' '))
  }
  
  return chunks
}

/**
 * Get overlap text from the end of chunks for context continuity
 */
function getOverlapText(chunks: string[], overlapWords: number): string | null {
  if (chunks.length === 0) return null
  
  const lastChunk = chunks[chunks.length - 1]
  const words = lastChunk.split(/\s+/)
  
  if (words.length <= overlapWords) {
    return lastChunk
  }
  
  return words.slice(-overlapWords).join(' ')
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Chunk a document that may be plain text or markdown
 */
export function chunkDocument(
  content: string,
  filename: string,
  options?: ChunkOptions
): Chunk[] {
  // Detect if content looks like markdown
  const isMarkdown = /^#{1,6}\s+/m.test(content) || filename.endsWith('.md')
  
  if (isMarkdown) {
    return chunkText(content, filename, options)
  }
  
  // For plain text, use paragraph-based chunking
  return chunkText(content, filename, {
    ...options,
    // Plain text might need slightly different handling
  })
}

