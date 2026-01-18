import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/book/[id]/export-chapter - Export a single chapter as PDF
 * 
 * Uses browser print-to-PDF approach by returning HTML that the client
 * can print via window.print() or we generate PDF server-side
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { bookTitle, bookSubtitle, chapterNumber, chapterTitle, content } = body

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    // Format content to HTML
    const formattedContent = formatContent(content)
    
    // Generate print-ready HTML
    const html = generatePrintHTML({
      bookTitle,
      bookSubtitle,
      chapterNumber,
      chapterTitle,
      content: formattedContent,
    })

    // Return HTML that client can use for printing
    // For true PDF generation, we'd need puppeteer or similar
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="Chapter ${chapterNumber} - ${chapterTitle}.html"`,
      },
    })

  } catch (error) {
    console.error('[Export Chapter] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export chapter' },
      { status: 500 }
    )
  }
}

function formatContent(content: string): string {
  return content
    // Remove chapter title (shown separately)
    .replace(/^# Chapter \d+:.+\n\n?/m, '')
    // H2 headers
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // H3 headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Paragraphs
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p)
    .map(p => p.startsWith('<h') ? p : `<p>${p}</p>`)
    .join('\n')
}

interface ChapterData {
  bookTitle: string
  bookSubtitle?: string
  chapterNumber: number
  chapterTitle: string
  content: string
}

function generatePrintHTML(data: ChapterData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chapter ${data.chapterNumber}: ${data.chapterTitle}</title>
  <link rel="stylesheet" href="https://use.typekit.net/vkz3swl.css">
  <style>
    @page {
      size: 6in 9in;
      margin: 0.875in 0.75in;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      font-family: "adobe-garamond-pro", Georgia, serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1a1a1a;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    .page {
      width: 100%;
      max-width: 100%;
    }
    
    .running-header {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #888;
      margin-bottom: 0.5in;
      padding-bottom: 0.25in;
      border-bottom: 0.5pt solid #ddd;
    }
    
    .chapter-header {
      text-align: center;
      margin-bottom: 1.5in;
      padding-top: 1in;
    }
    
    .chapter-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      color: #666;
      margin-bottom: 0.75rem;
    }
    
    .chapter-title {
      font-size: 26pt;
      font-weight: 400;
      margin: 0;
      letter-spacing: 0.01em;
    }
    
    .content {
      column-count: 1;
    }
    
    h2 {
      font-size: 13pt;
      font-weight: 600;
      margin-top: 1.25em;
      margin-bottom: 0.6em;
      letter-spacing: 0.01em;
    }
    
    h3 {
      font-size: 11pt;
      font-weight: 600;
      margin-top: 1em;
      margin-bottom: 0.4em;
    }
    
    p {
      margin: 0 0 0.75em 0;
      text-align: justify;
      hyphens: auto;
      -webkit-hyphens: auto;
    }
    
    p + p {
      text-indent: 1.5em;
      margin-top: 0;
    }
    
    h2 + p, h3 + p {
      text-indent: 0;
    }
    
    strong {
      font-weight: 700;
    }
    
    em {
      font-style: italic;
    }
    
    .page-number {
      text-align: center;
      font-size: 9pt;
      color: #888;
      margin-top: 0.5in;
      padding-top: 0.25in;
    }
    
    @media print {
      .print-button {
        display: none !important;
      }
      
      .page {
        padding: 0;
      }
      
      .running-header {
        position: running(header);
      }
    }
    
    @media screen {
      html {
        background: #525659;
      }
      
      body {
        padding: 2rem;
      }
      
      .page {
        background: white;
        width: 6in;
        min-height: 9in;
        margin: 0 auto;
        padding: 0.875in 0.75in;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      
      .print-button {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #1a1a1a;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        cursor: pointer;
        border-radius: 4px;
        z-index: 100;
      }
      
      .print-button:hover {
        background: #333;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">⌘P &nbsp;Save as PDF</button>
  
  <div class="page">
    <div class="running-header">
      <span>${data.bookTitle.toUpperCase()}</span>
      <span>CHAPTER ${data.chapterNumber}</span>
    </div>
    
    <div class="chapter-header">
      <div class="chapter-label">Chapter ${data.chapterNumber}</div>
      <h1 class="chapter-title">${data.chapterTitle}</h1>
    </div>
    
    <div class="content">
      ${data.content}
    </div>
  </div>
</body>
</html>`
}
