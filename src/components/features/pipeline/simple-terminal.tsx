'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'idle' | 'scraping' | 'outlining' | 'writing' | 'done' | 'error'

interface TerminalLine {
  id: string
  type: 'system' | 'info' | 'success' | 'error' | 'data'
  content: string
  timestamp?: Date
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
// TERMINAL COMPONENT
// ============================================================================

export function SimpleTerminal({ phase, outline, error, timing }: SimpleTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPhaseRef = useRef<Phase>('idle')

  // Generate unique ID
  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Add line helper
  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, { id: genId(), type, content, timestamp: new Date() }])
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Handle phase changes
  useEffect(() => {
    // Don't repeat same phase
    if (prevPhaseRef.current === phase) return
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (phase === 'scraping' && prevPhase === 'idle') {
      // Starting fresh
      setLines([])
      addLine('system', '> Starting pipeline...')
      addLine('system', '> Scanning website...')
    } else if (phase === 'outlining') {
      addLine('success', '✓ Website scanned')
      addLine('system', '> Creating outline...')
    } else if (phase === 'writing') {
      if (outline) {
        addLine('success', '✓ Outline created')
        addLine('data', `  Topic: ${outline.topic}`)
        addLine('data', `  Angle: ${outline.angle}`)
        if (outline.facts_used.length > 0) {
          addLine('data', `  Using: ${outline.facts_used[0]}`)
        }
      }
      addLine('system', '> Writing email...')
    } else if (phase === 'done') {
      addLine('success', '✓ Email generated')
      if (timing) {
        const total = Math.round((timing.outline + timing.write + timing.variants) / 1000)
        addLine('info', `  Total time: ${total}s`)
      }
      addLine('success', '')
      addLine('success', '━━━ Done ━━━')
    } else if (phase === 'error') {
      addLine('error', `✗ Error: ${error || 'Something went wrong'}`)
    }
  }, [phase, outline, timing, error])

  // Get line styling
  const getLineStyle = (type: TerminalLine['type']) => {
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

  const isActive = phase !== 'idle' && phase !== 'done' && phase !== 'error'

  return (
    <Card className="border bg-zinc-950 text-zinc-100 font-mono text-sm overflow-hidden">
      <CardHeader className="py-2 px-3 border-b border-zinc-800 bg-zinc-900/80">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-zinc-300">Copywriter</span>
          {isActive && (
            <span className="ml-auto flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-orange-400" />
            </span>
          )}
          {phase === 'done' && (
            <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />
          )}
          {phase === 'error' && (
            <AlertCircle className="ml-auto h-3.5 w-3.5 text-red-400" />
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          ref={scrollRef}
          className="h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          <div className="p-3 space-y-1">
            {lines.map((line) => (
              <div key={line.id} className={`leading-relaxed ${getLineStyle(line.type)}`}>
                {line.content || '\u00A0'}
              </div>
            ))}
            
            {/* Blinking cursor when active */}
            {isActive && (
              <div className="flex items-center">
                <span className="animate-pulse text-orange-400">▌</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

