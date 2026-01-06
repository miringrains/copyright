'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

type ArticlePhase = 'idle' | 'input' | 'discovering' | 'scrape' | 'topics' | 'keywords' | 'outline' | 'write' | 'images' | 'assemble' | 'complete' | 'error'

interface TerminalLine {
  id: string
  type: 'cmd' | 'info' | 'success' | 'error'
  content: string
}

interface ArticleTerminalProps {
  phase: ArticlePhase
  websiteUrl?: string
  topic?: string
  error?: string | null
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

export function ArticleTerminal({ phase, websiteUrl, topic, error }: ArticleTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPhaseRef = useRef<ArticlePhase>('idle')

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [lines])

  // Handle phase changes
  useEffect(() => {
    if (prevPhaseRef.current === phase) return
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    const domain = websiteUrl ? new URL(websiteUrl).hostname : 'website'

    const addLines = (newLines: Omit<TerminalLine, 'id'>[]) => {
      newLines.forEach((line, i) => {
        setTimeout(() => {
          setLines(prev => [...prev, { ...line, id: genId() }])
        }, i * 100)
      })
    }

    if (phase === 'scrape' && (prevPhase === 'idle' || prevPhase === 'input')) {
      setLines([])
      addLines([
        { type: 'cmd', content: `Scraping ${domain}...` },
      ])
    } else if (phase === 'topics') {
      addLines([
        { type: 'success', content: `✓ Website scraped` },
        { type: 'cmd', content: `Analyzing content...` },
      ])
    } else if (phase === 'keywords') {
      addLines([
        { type: 'success', content: `✓ Topic selected: "${topic?.slice(0, 40)}..."` },
        { type: 'cmd', content: `Researching keywords & sources...` },
      ])
    } else if (phase === 'outline') {
      addLines([
        { type: 'success', content: `✓ Found keywords and reference sources` },
        { type: 'cmd', content: `Creating article outline...` },
      ])
    } else if (phase === 'write') {
      addLines([
        { type: 'success', content: `✓ Outline created` },
        { type: 'cmd', content: `Writing article...` },
      ])
    } else if (phase === 'images') {
      addLines([
        { type: 'success', content: `✓ Article written` },
        { type: 'cmd', content: `Generating images...` },
      ])
    } else if (phase === 'assemble') {
      addLines([
        { type: 'success', content: `✓ Images generated` },
        { type: 'cmd', content: `Assembling final article...` },
      ])
    } else if (phase === 'complete') {
      addLines([
        { type: 'success', content: `✓ Article complete!` },
      ])
    } else if (phase === 'error') {
      addLines([
        { type: 'error', content: `✗ Error: ${error || 'Something went wrong'}` },
      ])
    }
  }, [phase, websiteUrl, topic, error])

  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'cmd': return 'text-zinc-300'
      case 'info': return 'text-zinc-400'
      case 'success': return 'text-emerald-400'
      case 'error': return 'text-red-400'
      default: return 'text-zinc-400'
    }
  }

  const isActive = !['idle', 'input', 'complete', 'error'].includes(phase)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border bg-zinc-950 text-zinc-100 font-mono text-sm overflow-hidden">
        <CardHeader className="py-2.5 px-4 border-b border-zinc-800 bg-zinc-900/50">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-400">Progress</span>
            
            <div className="ml-auto flex items-center gap-2">
              {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              {phase === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              {phase === 'error' && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <div ref={scrollRef} className="h-[200px] overflow-y-auto p-4 space-y-1.5">
            <AnimatePresence>
              {lines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${getLineStyle(line.type)} leading-relaxed`}
                >
                  {line.type === 'cmd' && isActive && (
                    <Loader2 className="inline h-3 w-3 mr-2 animate-spin" />
                  )}
                  {line.content}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
