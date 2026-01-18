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
      size: 5.5in 8.5in;
      margin: 0.75in;
      
      @top-left {
        content: "${data.bookTitle}";
        font-size: 9pt;
        font-family: "adobe-garamond-pro", Georgia, serif;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #666;
      }
      
      @top-right {
        content: "Chapter ${data.chapterNumber}";
        font-size: 9pt;
        font-family: "adobe-garamond-pro", Georgia, serif;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #666;
      }
      
      @bottom-center {
        content: counter(page);
        font-size: 10pt;
        font-family: "adobe-garamond-pro", Georgia, serif;
        color: #666;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: "adobe-garamond-pro", Georgia, serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 5.5in;
      margin: 0 auto;
      padding: 0.75in;
    }
    
    .chapter-header {
      text-align: center;
      margin-bottom: 2in;
      padding-top: 1.5in;
    }
    
    .chapter-label {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #666;
      margin-bottom: 0.5rem;
    }
    
    .chapter-title {
      font-size: 24pt;
      font-weight: 400;
      margin: 0;
      letter-spacing: 0.02em;
    }
    
    h2 {
      font-size: 14pt;
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      letter-spacing: 0.02em;
    }
    
    h3 {
      font-size: 12pt;
      font-weight: 600;
      margin-top: 1.25em;
      margin-bottom: 0.5em;
    }
    
    p {
      margin: 0 0 1em 0;
      text-align: justify;
      hyphens: auto;
      -webkit-hyphens: auto;
    }
    
    p:first-of-type {
      text-indent: 0;
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
    
    @media print {
      body {
        padding: 0;
        max-width: none;
      }
      
      .print-button {
        display: none;
      }
    }
    
    @media screen {
      body {
        background: #f5f5f5;
        padding: 2rem;
      }
      
      .page {
        background: white;
        padding: 0.75in;
        max-width: 5.5in;
        margin: 0 auto;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      }
      
      .print-button:hover {
        background: #333;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  
  <div class="page">
    <div class="chapter-header">
      <div class="chapter-label">Chapter ${data.chapterNumber}</div>
      <h1 class="chapter-title">${data.chapterTitle}</h1>
    </div>
    
    ${data.content}
  </div>
  
  <script>
    // Auto-trigger print dialog for PDF save
    // Uncomment if you want auto-print:
    // window.onload = () => window.print();
  </script>
</body>
</html>`
}
