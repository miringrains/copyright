'use client'

import { useState, useRef } from 'react'
import { X, Printer, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Chapter {
  number: number
  title: string
  content: string
  wordCount?: number
}

interface PrintPreviewProps {
  bookTitle: string
  bookSubtitle?: string
  chapters: Chapter[]
  onClose: () => void
}

// Approximate words per page for estimation (varies with content)
const WORDS_PER_PAGE = 250

export function PrintPreview({ bookTitle, bookSubtitle, chapters, onClose }: PrintPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Build all pages
  const pages = buildPages(bookTitle, bookSubtitle, chapters)
  
  const goToPrev = () => setCurrentPage(p => Math.max(0, p - 1))
  const goToNext = () => setCurrentPage(p => Math.min(pages.length - 1, p + 1))
  
  const handlePrint = () => {
    window.print()
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/95 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="h-4 w-4 mr-2" />
            Close Preview
          </Button>
          <span className="text-neutral-500 text-sm">
            Page {currentPage + 1} of {pages.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrev} disabled={currentPage === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNext} disabled={currentPage === pages.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-neutral-700 mx-2" />
          <Button variant="outline" size="sm" onClick={handlePrint} className="border-neutral-700">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
      
      {/* Page viewer */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-8 bg-neutral-800/50">
        <div className="flex gap-4">
          {/* Left page (even) */}
          {currentPage > 0 && (
            <Page 
              content={pages[currentPage - 1]} 
              pageNumber={currentPage} 
              isLeft={true}
              bookTitle={bookTitle}
            />
          )}
          
          {/* Right page (odd) or single page */}
          <Page 
            content={pages[currentPage]} 
            pageNumber={currentPage + 1} 
            isLeft={currentPage === 0}
            bookTitle={bookTitle}
          />
        </div>
      </div>
      
      {/* Print stylesheet (hidden in browser, used for print) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-page, .print-page * {
            visibility: visible;
          }
          .print-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  )
}

interface PageContent {
  type: 'title' | 'half-title' | 'chapter-start' | 'body'
  title?: string
  subtitle?: string
  chapterNumber?: number
  chapterTitle?: string
  text?: string
}

function Page({ 
  content, 
  pageNumber, 
  isLeft,
  bookTitle 
}: { 
  content: PageContent
  pageNumber: number
  isLeft: boolean
  bookTitle: string
}) {
  return (
    <div 
      className="print-page bg-white shadow-2xl"
      style={{
        width: '5.5in',
        height: '8.5in',
        padding: '0.75in',
        fontFamily: '"adobe-garamond-pro", Georgia, serif',
      }}
    >
      {/* Running header */}
      {content.type === 'body' && (
        <div 
          className="flex justify-between text-xs tracking-widest uppercase mb-8"
          style={{ color: '#666' }}
        >
          {isLeft ? (
            <>
              <span>{pageNumber}</span>
              <span>{bookTitle}</span>
            </>
          ) : (
            <>
              <span>{content.chapterTitle}</span>
              <span>{pageNumber}</span>
            </>
          )}
        </div>
      )}
      
      {/* Title page */}
      {content.type === 'title' && (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ fontWeight: 700, letterSpacing: '0.05em' }}
          >
            {content.title}
          </h1>
          {content.subtitle && (
            <p 
              className="text-lg italic"
              style={{ fontStyle: 'italic', color: '#444' }}
            >
              {content.subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Half-title (simple title before chapter) */}
      {content.type === 'half-title' && (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <h1 
            className="text-2xl"
            style={{ fontWeight: 400, letterSpacing: '0.1em' }}
          >
            {content.title}
          </h1>
        </div>
      )}
      
      {/* Chapter start */}
      {content.type === 'chapter-start' && (
        <div className="pt-24">
          <div 
            className="text-center mb-2 text-sm tracking-widest uppercase"
            style={{ color: '#888' }}
          >
            Chapter {content.chapterNumber}
          </div>
          <h2 
            className="text-center text-2xl mb-12"
            style={{ fontWeight: 400 }}
          >
            {content.chapterTitle}
          </h2>
          {content.text && (
            <div 
              className="text-base leading-relaxed"
              style={{ 
                lineHeight: 1.7,
                textAlign: 'justify',
                hyphens: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: formatText(content.text) }}
            />
          )}
        </div>
      )}
      
      {/* Body text */}
      {content.type === 'body' && content.text && (
        <div 
          className="text-base leading-relaxed"
          style={{ 
            lineHeight: 1.7,
            textAlign: 'justify',
            hyphens: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: formatText(content.text) }}
        />
      )}
      
      {/* Page number for title/half-title pages */}
      {(content.type === 'title' || content.type === 'half-title' || content.type === 'chapter-start') && (
        <div className="absolute bottom-8 left-0 right-0 text-center text-sm" style={{ color: '#888' }}>
          {content.type !== 'title' && pageNumber}
        </div>
      )}
    </div>
  )
}

// Format markdown-like text to HTML
function formatText(text: string): string {
  return text
    // Headers
    .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-3" style="font-weight: 600;">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold mt-4 mb-2" style="font-weight: 600;">$1</h4>')
    // Remove chapter title from content (it's shown separately)
    .replace(/^# Chapter \d+:.+$/gm, '')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // Wrap in paragraph
    .replace(/^(.+)/, '<p class="mb-4">$1')
    .replace(/(.+)$/, '$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="mb-4"><\/p>/g, '')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

// Build page array from chapters
function buildPages(
  bookTitle: string, 
  bookSubtitle: string | undefined, 
  chapters: Chapter[]
): PageContent[] {
  const pages: PageContent[] = []
  
  // Title page
  pages.push({
    type: 'title',
    title: bookTitle,
    subtitle: bookSubtitle,
  })
  
  // Half-title page (optional, adds a blank back)
  pages.push({
    type: 'half-title',
    title: bookTitle,
  })
  
  // Process each chapter
  for (const chapter of chapters) {
    if (!chapter.content) continue
    
    // Split content into pages
    const contentWithoutTitle = chapter.content
      .replace(/^# Chapter \d+:.+\n\n?/, '') // Remove chapter heading
    
    const paragraphs = contentWithoutTitle.split(/\n\n/)
    let currentPageText = ''
    let currentWordCount = 0
    let isFirstPage = true
    
    for (const para of paragraphs) {
      const paraWords = para.split(/\s+/).length
      
      // Check if we need a new page
      if (currentWordCount + paraWords > WORDS_PER_PAGE && currentPageText) {
        pages.push({
          type: isFirstPage ? 'chapter-start' : 'body',
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          text: currentPageText.trim(),
        })
        currentPageText = ''
        currentWordCount = 0
        isFirstPage = false
      }
      
      currentPageText += para + '\n\n'
      currentWordCount += paraWords
    }
    
    // Don't forget the last page of the chapter
    if (currentPageText.trim()) {
      pages.push({
        type: isFirstPage ? 'chapter-start' : 'body',
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        text: currentPageText.trim(),
      })
    }
  }
  
  return pages
}
