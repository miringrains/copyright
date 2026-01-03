'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal, Sparkles } from 'lucide-react'

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
  currentProcess?: string
}

export function LiveActivity({ logs, isActive, currentProcess }: LiveActivityProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLogStyle = (type: ActivityLog['type']) => {
    switch (type) {
      case 'phase_start':
        return 'text-primary font-medium'
      case 'thinking':
        return 'text-zinc-400'
      case 'artifact':
        return 'text-green-400'
      case 'validation':
        return 'text-amber-400'
      case 'complete':
        return 'text-primary font-bold'
      default:
        return 'text-zinc-300'
    }
  }

  const getLogPrefix = (type: ActivityLog['type']) => {
    switch (type) {
      case 'phase_start':
        return '▸'
      case 'thinking':
        return '○'
      case 'artifact':
        return '●'
      case 'validation':
        return '◆'
      case 'complete':
        return '✓'
      default:
        return '·'
    }
  }

  if (logs.length === 0 && !isActive) {
    return null
  }

  return (
    <Card className="border bg-zinc-950 text-zinc-100 font-mono text-xs overflow-hidden">
      <CardHeader className="py-2 px-3 border-b border-zinc-800 bg-zinc-900/80">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-zinc-300">Activity</span>
          {isActive && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={scrollRef}
          className="h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          <div className="p-3 space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-600 tabular-nums shrink-0 select-none">
                  {log.timestamp.toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
                <span className={`shrink-0 ${getLogStyle(log.type)}`}>
                  {getLogPrefix(log.type)}
                </span>
                <span className={getLogStyle(log.type)}>
                  {log.message}
                </span>
              </div>
            ))}
            
            {/* Current process indicator */}
            {isActive && currentProcess && (
              <div className="flex items-start gap-2 leading-relaxed animate-pulse">
                <span className="text-zinc-600 tabular-nums shrink-0 select-none">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
                <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5 animate-pulse" />
                <span className="text-zinc-400 italic">{currentProcess}</span>
              </div>
            )}
          </div>
        </div>
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
