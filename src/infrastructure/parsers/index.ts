import { parsePdf, type ParsedDocument } from './pdf'
import { parseWord } from './word'

export type { ParsedDocument }

export type SupportedFileType = 'pdf' | 'docx' | 'doc' | 'txt'

const MIME_TYPE_MAP: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'text/plain': 'txt',
}

const EXTENSION_MAP: Record<string, SupportedFileType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'doc',
  '.txt': 'txt',
}

export function getFileType(
  mimeType?: string,
  filename?: string
): SupportedFileType | null {
  if (mimeType && MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType]
  }
  
  if (filename) {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (ext && EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext]
    }
  }
  
  return null
}

export async function parseDocument(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<ParsedDocument> {
  switch (fileType) {
    case 'pdf':
      return parsePdf(buffer)
    
    case 'docx':
    case 'doc':
      return parseWord(buffer)
    
    case 'txt':
      const content = buffer.toString('utf-8').trim()
      return {
        content,
        metadata: {
          wordCount: content.split(/\s+/).length,
        },
      }
    
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export async function parseFile(
  buffer: Buffer,
  mimeType?: string,
  filename?: string
): Promise<ParsedDocument> {
  const fileType = getFileType(mimeType, filename)
  
  if (!fileType) {
    throw new Error(
      `Unsupported file type. Supported types: PDF, DOCX, DOC, TXT`
    )
  }
  
  return parseDocument(buffer, fileType)
}

