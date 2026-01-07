import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, Table, TableRow, TableCell, WidthType, ImageRun, BorderStyle } from 'docx'

/**
 * GET /api/book/[id]/export - Export book as DOCX
 * 
 * Query params:
 * - includeVisuals: 'true' | 'false' (default true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { searchParams } = new URL(request.url)
  const includeVisuals = searchParams.get('includeVisuals') !== 'false'
  
  try {
    const supabase = getServerClient()

    // Get project
    const { data: project } = await supabase
      .from('book_projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all chapters in order
    const { data: chapters } = await supabase
      .from('book_chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('chapter_number')

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ error: 'No chapters found' }, { status: 400 })
    }

    // Build document sections
    const docSections: (Paragraph | Table)[] = []

    // Title page
    docSections.push(
      new Paragraph({
        children: [new TextRun({ text: '', break: 5 })], // Spacing
      }),
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun({
            text: project.title,
            bold: true,
            size: 72,
          }),
        ],
        alignment: 'center' as const,
      })
    )

    if (project.subtitle) {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: project.subtitle,
              size: 36,
              italics: true,
            }),
          ],
          alignment: 'center' as const,
        })
      )
    }

    docSections.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    )

    // Table of Contents
    docSections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'Table of Contents', bold: true })],
      }),
      new Paragraph({ children: [new TextRun({ text: '' })] })
    )

    for (const chapter of chapters) {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Chapter ${chapter.chapter_number}: ${chapter.title}`,
            }),
          ],
        })
      )
    }

    docSections.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    )

    // Chapters
    for (const chapter of chapters) {
      if (!chapter.content) continue

      // Parse markdown-style content with visual support
      const elements = parseMarkdownContent(chapter.content, includeVisuals)
      
      for (const element of elements) {
        if (element.type === 'heading1') {
          docSections.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: element.text, bold: true })],
              pageBreakBefore: true,
            })
          )
        } else if (element.type === 'heading2') {
          docSections.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: element.text, bold: true })],
              spacing: { before: 400, after: 200 },
            })
          )
        } else if (element.type === 'heading3') {
          docSections.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text: element.text, bold: true })],
              spacing: { before: 300, after: 150 },
            })
          )
        } else if (element.type === 'paragraph') {
          docSections.push(
            new Paragraph({
              children: [new TextRun({ text: element.text })],
              spacing: { after: 200 },
            })
          )
        } else if (element.type === 'table' && element.table) {
          docSections.push(createDocxTable(element.table.headers, element.table.rows))
          docSections.push(new Paragraph({ children: [] })) // Spacing after table
        } else if (element.type === 'image' && element.imageUrl) {
          // For images, we'll add a placeholder text since fetching images 
          // requires async and complicates the export
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `[Image: ${element.alt || 'Illustration'}]`,
                  italics: true,
                  color: '666666',
                }),
              ],
              spacing: { before: 200, after: 200 },
            })
          )
        } else if (element.type === 'mermaid') {
          // Mermaid diagrams can't be directly rendered in DOCX
          // Add a note about the diagram
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `[Diagram: See digital version for interactive diagram]`,
                  italics: true,
                  color: '666666',
                }),
              ],
              spacing: { before: 200, after: 200 },
            })
          )
        }
      }
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docSections,
        },
      ],
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    // Return as downloadable file
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx"`,
      },
    })

  } catch (error) {
    console.error('[Export] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export book' },
      { status: 500 }
    )
  }
}

/**
 * Content element types from markdown parsing
 */
interface ContentElement {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'table' | 'image' | 'mermaid'
  text: string
  table?: { headers: string[]; rows: string[][] }
  imageUrl?: string
  alt?: string
}

/**
 * Parse markdown content into structured elements
 */
function parseMarkdownContent(content: string, includeVisuals: boolean): ContentElement[] {
  const elements: ContentElement[] = []
  const lines = content.split('\n')
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Check for mermaid code block
    if (line.trim().startsWith('```mermaid') && includeVisuals) {
      // Skip until closing ```
      let j = i + 1
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        j++
      }
      elements.push({ type: 'mermaid', text: 'diagram' })
      i = j + 1
      continue
    }
    
    // Check for markdown table
    if (line.includes('|') && includeVisuals) {
      const tableResult = parseMarkdownTable(lines, i)
      if (tableResult) {
        elements.push({
          type: 'table',
          text: '',
          table: tableResult.table,
        })
        i = tableResult.endIndex + 1
        continue
      }
    }
    
    // Check for image
    if (line.match(/!\[.*?\]\(.*?\)/) && includeVisuals) {
      const match = line.match(/!\[(.*?)\]\((.*?)\)/)
      if (match) {
        elements.push({
          type: 'image',
          text: '',
          alt: match[1],
          imageUrl: match[2],
        })
        i++
        continue
      }
    }
    
    // Headings
    if (line.startsWith('# ')) {
      elements.push({ type: 'heading1', text: line.replace('# ', '') })
    } else if (line.startsWith('## ')) {
      elements.push({ type: 'heading2', text: line.replace('## ', '') })
    } else if (line.startsWith('### ')) {
      elements.push({ type: 'heading3', text: line.replace('### ', '') })
    } else if (line.trim()) {
      elements.push({ type: 'paragraph', text: line })
    }
    
    i++
  }
  
  return elements
}

/**
 * Parse a markdown table starting at a given line
 */
function parseMarkdownTable(
  lines: string[],
  startIndex: number
): { table: { headers: string[]; rows: string[][] }; endIndex: number } | null {
  const headerLine = lines[startIndex]
  
  // Must have pipes and content
  if (!headerLine.includes('|')) return null
  
  // Parse header
  const headers = headerLine
    .split('|')
    .map(h => h.trim())
    .filter(h => h.length > 0)
  
  if (headers.length < 2) return null
  
  // Check for separator line (| --- | --- |)
  const separatorIndex = startIndex + 1
  if (separatorIndex >= lines.length) return null
  
  const separator = lines[separatorIndex]
  if (!separator.match(/\|[\s-]+\|/)) return null
  
  // Parse rows
  const rows: string[][] = []
  let endIndex = separatorIndex
  
  for (let i = separatorIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('|')) break
    
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(c => c.length > 0)
    
    if (cells.length > 0) {
      rows.push(cells)
      endIndex = i
    } else {
      break
    }
  }
  
  if (rows.length === 0) return null
  
  return {
    table: { headers, rows },
    endIndex,
  }
}

/**
 * Create a DOCX table from headers and rows
 */
function createDocxTable(headers: string[], rows: string[][]): Table {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: 'CCCCCC',
  }
  
  const borders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  }

  // Header row
  const headerRow = new TableRow({
    children: headers.map(header =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: header, bold: true })],
          }),
        ],
        borders,
        shading: { fill: 'F5F5F5' },
      })
    ),
  })

  // Data rows
  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: cell })],
            }),
          ],
          borders,
        })
      ),
    })
  )

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  })
}

