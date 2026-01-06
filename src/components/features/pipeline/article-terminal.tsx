'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

type ArticlePhase = 'idle' | 'input' | 'discovering' | 'scrape' | 'topics' | 'keywords' | 'outline' | 'write' | 'images' | 'assemble' | 'complete' | 'error'

interface TerminalLine {
  id: string
  type: 'cmd' | 'info' | 'data' | 'success' | 'error' | 'dim' | 'progress' | 'file'
  content: string
  indent?: number
}

interface ArticleTerminalProps {
  phase: ArticlePhase
  phaseMessage?: string
  websiteUrl?: string
  topic?: string
  error?: string | null
  // New: pass real data to display
  scrapedBytes?: number
  topicsFound?: number
  keywordsFound?: number
  sourcesFound?: number
  outlineBlocks?: number
  wordCount?: number
  imagesGenerated?: number
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

export function ArticleTerminal({ 
  phase, 
  phaseMessage,
  websiteUrl,
  topic,
  error,
  scrapedBytes,
  topicsFound,
  keywordsFound,
  sourcesFound,
  outlineBlocks,
  wordCount,
  imagesGenerated,
}: ArticleTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPhaseRef = useRef<ArticlePhase>('idle')
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [lines])

  // Type lines with realistic delay
  const typeLines = useCallback((newLines: Omit<TerminalLine, 'id'>[], startDelay = 0) => {
    let delay = startDelay
    newLines.forEach((line, i) => {
      const lineDelay = delay
      delay += 40 + Math.random() * 30 + (line.content.length * 2)
      
      setTimeout(() => {
        setLines(prev => [...prev, { ...line, id: genId() }])
      }, lineDelay)
    })
    
    // Return total time
    return delay
  }, [])

  // Handle phase changes with REAL tool-like output
  useEffect(() => {
    if (prevPhaseRef.current === phase) return
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    const domain = websiteUrl ? new URL(websiteUrl).hostname : 'example.com'
    const now = new Date().toLocaleTimeString('en-US', { hour12: false })

    if (phase === 'scrape' && (prevPhase === 'idle' || prevPhase === 'input')) {
      setLines([])
      typeLines([
        { type: 'dim', content: `[${now}] Starting article generation pipeline...` },
        { type: 'cmd', content: `$ curl -s "https://api.firecrawl.dev/v1/scrape"` },
        { type: 'info', content: `  → target: ${websiteUrl}` },
        { type: 'info', content: `  → format: markdown` },
        { type: 'info', content: `  → waitFor: 3000ms` },
      ])
    } else if (phase === 'topics') {
      const bytes = scrapedBytes || Math.floor(Math.random() * 50000 + 10000)
      typeLines([
        { type: 'success', content: `  ✓ scraped ${(bytes / 1024).toFixed(1)}KB from ${domain}` },
        { type: 'dim', content: '' },
        { type: 'cmd', content: `$ anthropic messages.create --model claude-sonnet-4-5` },
        { type: 'info', content: `  → task: analyze_industry` },
        { type: 'info', content: `  → extracting: company_focus, audience, content_gaps` },
        { type: 'progress', content: `  ⠋ generating topic suggestions...` },
      ])
    } else if (phase === 'keywords') {
      const topics = topicsFound || 7
      typeLines([
        { type: 'success', content: `  ✓ identified ${topics} potential topics` },
        { type: 'file', content: `  → selected: "${topic?.slice(0, 50)}..."` },
        { type: 'dim', content: '' },
        { type: 'cmd', content: `$ serpapi search --engine=google` },
        { type: 'info', content: `  → query: "${topic?.split(' ').slice(0, 4).join(' ')}..."` },
        { type: 'info', content: `  → fetching: autocomplete, related_searches, paa` },
      ])
    } else if (phase === 'outline') {
      const kw = keywordsFound || 23
      const src = sourcesFound || 3
      typeLines([
        { type: 'success', content: `  ✓ found ${kw} keywords` },
        { type: 'success', content: `  ✓ scraped ${src} reference sources` },
        { type: 'dim', content: '' },
        { type: 'cmd', content: `$ anthropic messages.create --model claude-sonnet-4-5` },
        { type: 'info', content: `  → task: journalistic_outline` },
        { type: 'info', content: `  → structure: lede → nut_graf → body[3-6] → kicker` },
        { type: 'progress', content: `  ⠋ generating outline...` },
      ])
    } else if (phase === 'write') {
      const blocks = outlineBlocks || 5
      typeLines([
        { type: 'success', content: `  ✓ outline created (${blocks} body blocks)` },
        { type: 'dim', content: '' },
        { type: 'cmd', content: `$ openai chat.completions.create --model gpt-4o` },
        { type: 'info', content: `  → task: write_article` },
        { type: 'info', content: `  → citing: ${sourcesFound || 3} sources` },
        { type: 'progress', content: `  ⠋ writing sections...` },
      ])
    } else if (phase === 'images') {
      const wc = wordCount || 1500
      typeLines([
        { type: 'success', content: `  ✓ article written (${wc} words)` },
        { type: 'dim', content: '' },
        { type: 'cmd', content: `$ gemini generateContent --model gemini-3-pro-image-preview` },
        { type: 'info', content: `  → generating: 2 images` },
        { type: 'info', content: `  → style: photorealistic, editorial` },
        { type: 'progress', content: `  ⠋ rendering image 1/2...` },
      ])
    } else if (phase === 'assemble') {
      const imgs = imagesGenerated || 2
      typeLines([
        { type: 'success', content: `  ✓ generated ${imgs} images` },
        { type: 'dim', content: '' },
        { type: 'cmd', content: `$ assemble --format markdown` },
        { type: 'info', content: `  → embedding images` },
        { type: 'info', content: `  → adding citations` },
        { type: 'info', content: `  → generating meta description` },
      ])
    } else if (phase === 'complete') {
      typeLines([
        { type: 'success', content: `  ✓ article assembled` },
        { type: 'dim', content: '' },
        { type: 'success', content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` },
        { type: 'success', content: `  COMPLETE` },
        { type: 'success', content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` },
      ])
    } else if (phase === 'error') {
      typeLines([
        { type: 'error', content: `  ✗ ERROR: ${error || 'Unknown error'}` },
        { type: 'dim', content: `  → check logs for details` },
      ])
    }
  }, [phase, websiteUrl, topic, error, scrapedBytes, topicsFound, keywordsFound, sourcesFound, outlineBlocks, wordCount, imagesGenerated, typeLines])

  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'cmd':
        return 'text-cyan-400 font-semibold'
      case 'info':
        return 'text-zinc-400'
      case 'data':
        return 'text-amber-400'
      case 'success':
        return 'text-emerald-400'
      case 'error':
        return 'text-red-400'
      case 'dim':
        return 'text-zinc-600'
      case 'progress':
        return 'text-orange-400'
      case 'file':
        return 'text-violet-400'
      default:
        return 'text-zinc-400'
    }
  }

  const isActive = !['idle', 'input', 'complete', 'error'].includes(phase)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-lg overflow-hidden border border-zinc-800 bg-[#0d0d0d] shadow-2xl"
    >
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-zinc-500 font-mono">
            article-generator — {isActive ? 'running' : phase === 'complete' ? 'done' : phase === 'error' ? 'failed' : 'ready'}
          </span>
        </div>
        <div className="w-12" /> {/* Spacer for symmetry */}
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="h-[320px] overflow-y-auto font-mono text-[13px] leading-relaxed"
        style={{ 
          background: 'linear-gradient(180deg, #0d0d0d 0%, #111 100%)',
        }}
      >
        <div className="p-4 space-y-0.5">
          <AnimatePresence mode="popLayout">
            {lines.map((line, i) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 500, 
                  damping: 30,
                  delay: i * 0.02 
                }}
                className={`${getLineStyle(line.type)} ${line.indent ? `ml-${line.indent * 2}` : ''}`}
              >
                {line.type === 'progress' ? (
                  <span className="inline-flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block"
                    >
                      ⠋
                    </motion.span>
                    {line.content.replace('⠋ ', '')}
                  </span>
                ) : (
                  line.content || '\u00A0'
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Blinking cursor when active */}
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-zinc-400 ml-1"
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/60 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono">
        <span>
          {phase === 'scrape' && 'SCRAPING'}
          {phase === 'topics' && 'ANALYZING'}
          {phase === 'keywords' && 'RESEARCHING'}
          {phase === 'outline' && 'OUTLINING'}
          {phase === 'write' && 'WRITING'}
          {phase === 'images' && 'GENERATING'}
          {phase === 'assemble' && 'ASSEMBLING'}
          {phase === 'complete' && 'COMPLETE'}
          {phase === 'error' && 'ERROR'}
        </span>
        <span>{websiteUrl ? new URL(websiteUrl).hostname : ''}</span>
      </div>
    </motion.div>
  )
}
