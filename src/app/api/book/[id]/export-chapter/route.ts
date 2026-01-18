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
      size: letter;
      margin: 1in;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      font-family: "adobe-garamond-pro", Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111;
      width: 100%;
    }
    
    .running-header {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #666;
      padding-bottom: 12pt;
      margin-bottom: 24pt;
      border-bottom: 0.5pt solid #ccc;
    }
    
    .chapter-header {
      text-align: center;
      padding-top: 72pt;
      margin-bottom: 72pt;
    }
    
    .chapter-label {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #666;
      margin-bottom: 8pt;
    }
    
    .chapter-title {
      font-size: 28pt;
      font-weight: 400;
      margin: 0;
    }
    
    h2 {
      font-size: 14pt;
      font-weight: 600;
      margin-top: 24pt;
      margin-bottom: 12pt;
    }
    
    h3 {
      font-size: 12pt;
      font-weight: 600;
      margin-top: 18pt;
      margin-bottom: 8pt;
    }
    
    p {
      margin: 0 0 12pt 0;
      text-align: justify;
    }
    
    p + p {
      text-indent: 24pt;
      margin-top: 0;
    }
    
    h2 + p, h3 + p {
      text-indent: 0;
    }
    
    strong { font-weight: 700; }
    em { font-style: italic; }
    
    .print-instructions {
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      z-index: 100;
    }
    
    @media print {
      .print-button, .print-instructions {
        display: none !important;
      }
    }
    
    @media screen {
      html { background: #444; }
      body { 
        max-width: 8.5in;
        margin: 0 auto;
        padding: 1in;
        background: white;
        min-height: 100vh;
      }
      .print-button {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #000;
        color: white;
        border: none;
        padding: 12px 24px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 6px;
        z-index: 100;
      }
      .print-button:hover { background: #222; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">⌘P Save as PDF</button>
  <div class="print-instructions">Set paper size to <strong>US Letter</strong> and margins to <strong>None</strong></div>
  
  <div class="running-header">
    <span>${data.bookTitle.toUpperCase()}</span>
    <span>CHAPTER ${data.chapterNumber}</span>
  </div>
  
  <div class="chapter-header">
    <div class="chapter-label">Chapter ${data.chapterNumber}</div>
    <h1 class="chapter-title">${data.chapterTitle}</h1>
  </div>
  
  ${data.content}
</body>
</html>`
}
