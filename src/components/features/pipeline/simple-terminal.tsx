'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'idle' | 'scraping' | 'outlining' | 'writing' | 'done' | 'error'

interface TerminalLine {
  id: string
  type: 'command' | 'output' | 'success' | 'error' | 'dim'
  content: string
}

interface SimpleTerminalProps {
  phase: Phase
  websiteUrl?: string
  companyName?: string
  emailType?: string
  outline?: {
    topic: string
    angle: string
    facts_used: string[]
  } | null
  error?: string | null
  timing?: {
    outline: number
    write: number
    variants: number
  } | null
}

// ============================================================================
// PROCESSING INDICATOR
// ============================================================================

function ProcessingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-orange-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ 
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </span>
  )
}

// ============================================================================
// TYPING LINE COMPONENT  
// ============================================================================

function TypingLine({ 
  content, 
  type, 
  onComplete,
  isProcessing = false
}: { 
  content: string
  type: TerminalLine['type']
  onComplete?: () => void
  isProcessing?: boolean
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText('')
    setIsComplete(false)
    
    if (!content) {
      setIsComplete(true)
      onComplete?.()
      return
    }

    let currentIndex = 0
    const speed = type === 'command' ? 12 : 8 // Commands type slower

    const typeNextChar = () => {
      if (currentIndex < content.length) {
        setDisplayedText(content.slice(0, currentIndex + 1))
        currentIndex++
        setTimeout(typeNextChar, speed + Math.random() * 6)
      } else {
        setIsComplete(true)
        // Small delay before calling complete to let the line settle
        setTimeout(() => onComplete?.(), 100)
      }
    }

    const timeout = setTimeout(typeNextChar, 50)
    return () => clearTimeout(timeout)
  }, [content, type, onComplete])

  const getLineStyle = () => {
    switch (type) {
      case 'command':
        return 'text-orange-400'
      case 'output':
        return 'text-zinc-300'
      case 'success':
        return 'text-emerald-400'
      case 'error':
        return 'text-red-400'
      case 'dim':
        return 'text-zinc-500'
      default:
        return 'text-zinc-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`leading-relaxed ${getLineStyle()}`}
    >
      {type === 'command' && <span className="text-zinc-500 mr-2">$</span>}
      {displayedText}
      {!isComplete && isProcessing && <ProcessingDots />}
    </motion.div>
  )
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

export function SimpleTerminal({ 
  phase, 
  websiteUrl,
  companyName,
  emailType,
  outline, 
  error, 
  timing 
}: SimpleTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [typingQueue, setTypingQueue] = useState<TerminalLine[]>([])
  const [currentTypingLine, setCurrentTypingLine] = useState<TerminalLine | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPhaseRef = useRef<Phase>('idle')

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [lines, currentTypingLine])

  // Process queue
  useEffect(() => {
    if (!isTyping && typingQueue.length > 0) {
      const [next, ...rest] = typingQueue
      setCurrentTypingLine(next)
      setTypingQueue(rest)
      setIsTyping(true)
      // Show processing dots on last line of a batch if we're still processing
      setShowProcessing(rest.length === 0 && phase !== 'done' && phase !== 'error')
    }
  }, [isTyping, typingQueue, phase])

  const handleTypingComplete = useCallback(() => {
    if (currentTypingLine) {
      setLines(prev => [...prev, currentTypingLine])
      setCurrentTypingLine(null)
      setIsTyping(false)
      setShowProcessing(false)
    }
  }, [currentTypingLine])

  const queueLines = useCallback((newLines: Omit<TerminalLine, 'id'>[]) => {
    const linesWithIds = newLines.map(line => ({ ...line, id: genId() }))
    setTypingQueue(prev => [...prev, ...linesWithIds])
  }, [])

  // Handle phase changes with real information
  useEffect(() => {
    if (prevPhaseRef.current === phase) return
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    const domain = websiteUrl ? new URL(websiteUrl).hostname : 'website'
    const type = emailType?.replace('_', ' ') || 'email'

    if (phase === 'scraping' && prevPhase === 'idle') {
      setLines([])
      setTypingQueue([])
      setCurrentTypingLine(null)
      setIsTyping(false)
      
      queueLines([
        { type: 'command', content: `scrape ${domain}` },
      ])
    } else if (phase === 'outlining') {
      queueLines([
        { type: 'success', content: `✓ scraped ${domain}` },
        { type: 'command', content: `outline --type="${type}" --company="${companyName || 'company'}"` },
      ])
    } else if (phase === 'writing') {
      const outlineLines: Omit<TerminalLine, 'id'>[] = [
        { type: 'success', content: '✓ outline created' },
      ]
      
      if (outline) {
        outlineLines.push(
          { type: 'dim', content: `  topic: "${outline.topic}"` },
          { type: 'dim', content: `  angle: "${outline.angle}"` },
        )
      }
      
      outlineLines.push(
        { type: 'command', content: `write --variants=3` },
      )
      
      queueLines(outlineLines)
    } else if (phase === 'done') {
      const doneLines: Omit<TerminalLine, 'id'>[] = [
        { type: 'success', content: '✓ email generated' },
        { type: 'success', content: '✓ variants created' },
      ]
      
      if (timing) {
        const total = ((timing.outline + timing.write + timing.variants) / 1000).toFixed(1)
        doneLines.push(
          { type: 'dim', content: `  completed in ${total}s` }
        )
      }
      
      queueLines(doneLines)
    } else if (phase === 'error') {
      queueLines([
        { type: 'error', content: `✗ error: ${error || 'something went wrong'}` },
      ])
    }
  }, [phase, websiteUrl, companyName, emailType, outline, timing, error, queueLines])

  const isActive = phase !== 'idle' && phase !== 'done' && phase !== 'error'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <Card className="border border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-[13px] overflow-hidden">
          <CardHeader className="py-2 px-3 border-b border-zinc-800/50 bg-zinc-900/50">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-400">copywriter</span>
              
              <div className="ml-auto flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.span
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-zinc-500 uppercase tracking-wider"
                    >
                      running
                    </motion.span>
                  )}
                  {phase === 'done' && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider">done</span>
                    </motion.div>
                  )}
                  {phase === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-[10px] text-red-400 uppercase tracking-wider">failed</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div 
              ref={scrollRef}
              className="h-[180px] overflow-y-auto"
            >
              <div className="p-3 space-y-1">
                {/* Completed lines */}
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className={`leading-relaxed ${
                      line.type === 'command' ? 'text-orange-400' :
                      line.type === 'success' ? 'text-emerald-400' :
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'dim' ? 'text-zinc-500' :
                      'text-zinc-300'
                    }`}
                  >
                    {line.type === 'command' && <span className="text-zinc-500 mr-2">$</span>}
                    {line.content}
                  </div>
                ))}
                
                {/* Currently typing */}
                {currentTypingLine && (
                  <TypingLine
                    content={currentTypingLine.content}
                    type={currentTypingLine.type}
                    onComplete={handleTypingComplete}
                    isProcessing={showProcessing}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
