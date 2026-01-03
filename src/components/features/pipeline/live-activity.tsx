'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Terminal, Zap } from 'lucide-react'

interface ActivityLog {
  id: string
  timestamp: Date
  type: 'phase_start' | 'thinking' | 'artifact' | 'validation' | 'complete'
  phase: number
  message: string
  detail?: string
}

interface LiveActivityProps {
  logs: ActivityLog[]
  isActive: boolean
}

export function LiveActivity({ logs, isActive }: LiveActivityProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showCursor, setShowCursor] = useState(true)

  // Blinking cursor effect
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [isActive])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLogStyle = (type: ActivityLog['type']) => {
    switch (type) {
      case 'phase_start':
        return 'text-primary font-semibold'
      case 'thinking':
        return 'text-muted-foreground italic'
      case 'artifact':
        return 'text-green-500 dark:text-green-400'
      case 'validation':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'complete':
        return 'text-primary font-bold'
      default:
        return 'text-foreground'
    }
  }

  const getLogIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'phase_start':
        return <Zap className="h-3 w-3 text-primary" />
      case 'thinking':
        return <Sparkles className="h-3 w-3 text-muted-foreground animate-pulse" />
      case 'artifact':
        return <span className="text-green-500">●</span>
      case 'validation':
        return <span className="text-yellow-500">◆</span>
      case 'complete':
        return <span className="text-primary">✓</span>
      default:
        return null
    }
  }

  if (logs.length === 0 && !isActive) {
    return null
  }

  return (
    <Card className="border-2 bg-zinc-950 text-zinc-100 font-mono text-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span>Live Activity</span>
          {isActive && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs text-muted-foreground">Processing</span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]" ref={scrollRef}>
          <div className="p-4 space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 group">
                <span className="text-zinc-600 text-xs tabular-nums shrink-0 pt-0.5">
                  {log.timestamp.toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
                <span className="shrink-0 pt-0.5">{getLogIcon(log.type)}</span>
                <div className="flex-1 min-w-0">
                  <span className={getLogStyle(log.type)}>
                    {log.message}
                  </span>
                  {log.detail && (
                    <span className="block text-xs text-zinc-500 truncate mt-0.5">
                      {log.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Blinking cursor */}
            {isActive && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 text-xs tabular-nums">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
                <span className={`w-2 h-4 bg-primary ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Helper to create log entries
export function createActivityLog(
  type: ActivityLog['type'],
  phase: number,
  message: string,
  detail?: string
): ActivityLog {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date(),
    type,
    phase,
    message,
    detail,
  }
}

export type { ActivityLog }

