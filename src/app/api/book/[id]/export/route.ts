import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/infrastructure/supabase/client'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx'

/**
 * GET /api/book/[id]/export - Export book as DOCX
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
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
    const docSections: Paragraph[] = []

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

      // Parse markdown-style content
      const lines = chapter.content.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('# ')) {
          // Chapter title
          docSections.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: line.replace('# ', ''), bold: true })],
              pageBreakBefore: true,
            })
          )
        } else if (line.startsWith('## ')) {
          // Section header
          docSections.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: line.replace('## ', ''), bold: true })],
              spacing: { before: 400, after: 200 },
            })
          )
        } else if (line.startsWith('### ')) {
          // Subsection header
          docSections.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text: line.replace('### ', ''), bold: true })],
              spacing: { before: 300, after: 150 },
            })
          )
        } else if (line.trim()) {
          // Regular paragraph
          docSections.push(
            new Paragraph({
              children: [new TextRun({ text: line })],
              spacing: { after: 200 },
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

