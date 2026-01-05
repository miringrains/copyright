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
  type: 'system' | 'info' | 'success' | 'error' | 'data'
  content: string
  delay?: number
}

interface SimpleTerminalProps {
  phase: Phase
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
// TYPEWRITER HOOK
// ============================================================================

function useTypewriter(text: string, speed: number = 20, startDelay: number = 0) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText('')
    setIsComplete(false)
    
    if (!text) {
      setIsComplete(true)
      return
    }

    let currentIndex = 0
    let timeoutId: NodeJS.Timeout

    const startTyping = () => {
      const typeNextChar = () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1))
          currentIndex++
          // Vary speed slightly for natural feel
          const variance = Math.random() * 10 - 5
          timeoutId = setTimeout(typeNextChar, speed + variance)
        } else {
          setIsComplete(true)
        }
      }
      typeNextChar()
    }

    const delayTimeout = setTimeout(startTyping, startDelay)

    return () => {
      clearTimeout(delayTimeout)
      clearTimeout(timeoutId)
    }
  }, [text, speed, startDelay])

  return { displayedText, isComplete }
}

// ============================================================================
// TYPING LINE COMPONENT
// ============================================================================

function TypingLine({ 
  content, 
  type, 
  onComplete,
  startDelay = 0 
}: { 
  content: string
  type: TerminalLine['type']
  onComplete?: () => void
  startDelay?: number
}) {
  const { displayedText, isComplete } = useTypewriter(content, 15, startDelay)

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete()
    }
  }, [isComplete, onComplete])

  const getLineStyle = () => {
    switch (type) {
      case 'system':
        return 'text-orange-400'
      case 'info':
        return 'text-zinc-500'
      case 'success':
        return 'text-emerald-400 font-medium'
      case 'error':
        return 'text-red-400'
      case 'data':
        return 'text-zinc-400'
      default:
        return 'text-zinc-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8
      }}
      className={`leading-relaxed ${getLineStyle()}`}
    >
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
      )}
    </motion.div>
  )
}

// ============================================================================
// CURSOR COMPONENT
// ============================================================================

function BlinkingCursor() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center h-5"
    >
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ 
          duration: 0.8, 
          repeat: Infinity, 
          repeatType: 'reverse',
          ease: 'easeInOut'
        }}
        className="text-orange-400 text-lg"
      >
        ▌
      </motion.span>
    </motion.div>
  )
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

export function SimpleTerminal({ phase, outline, error, timing }: SimpleTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingQueue, setTypingQueue] = useState<TerminalLine[]>([])
  const [currentTypingLine, setCurrentTypingLine] = useState<TerminalLine | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPhaseRef = useRef<Phase>('idle')

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Auto-scroll to bottom with smooth behavior
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [lines, currentTypingLine])

  // Process typing queue
  useEffect(() => {
    if (!isTyping && typingQueue.length > 0) {
      const [next, ...rest] = typingQueue
      setCurrentTypingLine(next)
      setTypingQueue(rest)
      setIsTyping(true)
    }
  }, [isTyping, typingQueue])

  // Handle typing completion
  const handleTypingComplete = useCallback(() => {
    if (currentTypingLine) {
      setLines(prev => [...prev, currentTypingLine])
      setCurrentTypingLine(null)
      setIsTyping(false)
    }
  }, [currentTypingLine])

  // Queue lines to type
  const queueLines = useCallback((newLines: Omit<TerminalLine, 'id'>[]) => {
    const linesWithIds = newLines.map(line => ({
      ...line,
      id: genId()
    }))
    setTypingQueue(prev => [...prev, ...linesWithIds])
  }, [])

  // Handle phase changes
  useEffect(() => {
    if (prevPhaseRef.current === phase) return
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (phase === 'scraping' && prevPhase === 'idle') {
      setLines([])
      setTypingQueue([])
      setCurrentTypingLine(null)
      setIsTyping(false)
      
      queueLines([
        { type: 'system', content: '> Initializing pipeline...' },
        { type: 'system', content: '> Scanning website...' },
      ])
    } else if (phase === 'outlining') {
      queueLines([
        { type: 'success', content: '✓ Website scanned' },
        { type: 'system', content: '> Analyzing content...' },
        { type: 'system', content: '> Creating outline...' },
      ])
    } else if (phase === 'writing') {
      const outlineLines: Omit<TerminalLine, 'id'>[] = [
        { type: 'success', content: '✓ Outline created' },
      ]
      
      if (outline) {
        outlineLines.push(
          { type: 'data', content: `  Topic: ${outline.topic}` },
          { type: 'data', content: `  Angle: ${outline.angle}` },
        )
        if (outline.facts_used.length > 0) {
          outlineLines.push(
            { type: 'data', content: `  Using: ${outline.facts_used[0].slice(0, 60)}...` }
          )
        }
      }
      
      outlineLines.push(
        { type: 'system', content: '> Writing email...' },
        { type: 'system', content: '> Generating variants...' },
      )
      
      queueLines(outlineLines)
    } else if (phase === 'done') {
      const doneLines: Omit<TerminalLine, 'id'>[] = [
        { type: 'success', content: '✓ Email generated' },
      ]
      
      if (timing) {
        const total = Math.round((timing.outline + timing.write + timing.variants) / 1000)
        doneLines.push(
          { type: 'info', content: `  Completed in ${total}s` }
        )
      }
      
      doneLines.push(
        { type: 'success', content: '' },
        { type: 'success', content: '━━━ Ready ━━━' },
      )
      
      queueLines(doneLines)
    } else if (phase === 'error') {
      queueLines([
        { type: 'error', content: `✗ ${error || 'Something went wrong'}` },
      ])
    }
  }, [phase, outline, timing, error, queueLines])

  const isActive = phase !== 'idle' && phase !== 'done' && phase !== 'error'
  const showCursor = isActive && !isTyping && !currentTypingLine

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ 
          type: 'spring',
          stiffness: 400,
          damping: 25,
          mass: 0.8
        }}
      >
        <Card className="border bg-zinc-950 text-zinc-100 font-mono text-sm overflow-hidden shadow-2xl">
          <CardHeader className="py-2.5 px-4 border-b border-zinc-800 bg-zinc-900/80">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <motion.div
                animate={isActive ? { 
                  rotate: [0, 5, -5, 0],
                } : {}}
                transition={{ 
                  duration: 2, 
                  repeat: isActive ? Infinity : 0,
                  ease: 'easeInOut'
                }}
              >
                <Terminal className="h-3.5 w-3.5 text-orange-400" />
              </motion.div>
              <span className="text-zinc-300">Copywriter</span>
              
              <AnimatePresence mode="wait">
                {phase === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 500,
                      damping: 25
                    }}
                    className="ml-auto"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </motion.div>
                )}
                {phase === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="ml-auto"
                  >
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </motion.div>
                )}
                {isActive && (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ml-auto flex items-center gap-1.5"
                  >
                    <motion.div
                      className="flex gap-1"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-orange-400"
                          animate={{ 
                            opacity: [0.3, 1, 0.3],
                            scale: [0.8, 1, 0.8]
                          }}
                          transition={{ 
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: 'easeInOut'
                          }}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div 
              ref={scrollRef}
              className="h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            >
              <div className="p-4 space-y-1.5">
                {/* Completed lines */}
                {lines.map((line) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 1 }}
                    className={`leading-relaxed ${
                      line.type === 'system' ? 'text-orange-400' :
                      line.type === 'success' ? 'text-emerald-400 font-medium' :
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'data' ? 'text-zinc-400' :
                      'text-zinc-500'
                    }`}
                  >
                    {line.content || '\u00A0'}
                  </motion.div>
                ))}
                
                {/* Currently typing line */}
                {currentTypingLine && (
                  <TypingLine
                    content={currentTypingLine.content}
                    type={currentTypingLine.type}
                    onComplete={handleTypingComplete}
                  />
                )}
                
                {/* Blinking cursor when waiting */}
                <AnimatePresence>
                  {showCursor && <BlinkingCursor />}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
