'use client'

import { useState, useCallback } from 'react'
import { InputPanel } from '@/components/features/input/input-panel'
import { PipelineProgress } from '@/components/features/pipeline/pipeline-progress'
import { LiveActivity, createActivityLog, type ActivityLog } from '@/components/features/pipeline/live-activity'
import { OutputPanel } from '@/components/features/output/output-panel'
import type { TaskSpec, FinalPackage } from '@/lib/schemas'

type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed'

interface PipelineResult {
  success: boolean
  runId?: string
  finalPackage?: FinalPackage
  error?: string
}

const PHASE_NAMES: Record<number, string> = {
  1: 'Creative Brief',
  2: 'Message Architecture',
  3: 'Beat Sheet',
  4: 'Draft V0',
  5: 'Cohesion Pass',
  6: 'Rhythm Pass',
  7: 'Channel Pass',
  8: 'Final Package',
}

export default function HomePage() {
  const [status, setStatus] = useState<PipelineStatus>('idle')
  const [currentPhase, setCurrentPhase] = useState(0)
  const [finalPackage, setFinalPackage] = useState<FinalPackage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])

  const addLog = useCallback((type: ActivityLog['type'], phase: number, message: string, detail?: string) => {
    setActivityLogs(prev => [...prev, createActivityLog(type, phase, message, detail)])
  }, [])

  const handleGenerate = async (taskSpec: TaskSpec) => {
    setStatus('running')
    setCurrentPhase(1)
    setFinalPackage(null)
    setError(null)
    setActivityLogs([])

    // Add initial log
    addLog('phase_start', 1, '🚀 Starting pipeline...', `Copy type: ${taskSpec.copy_type}`)

    try {
      // Use Server-Sent Events for real-time updates
      const response = await fetch('/api/pipeline/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskSpec }),
      })

      if (!response.ok) {
        // Fallback to regular API if streaming not available
        const fallbackResponse = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskSpec }),
        })
        
        const result: PipelineResult = await fallbackResponse.json()
        
        if (!result.success) {
          setStatus('failed')
          setError(result.error || 'Pipeline failed')
          addLog('complete', currentPhase, '❌ Pipeline failed', result.error)
          return
        }

        setCurrentPhase(8)
        setStatus('completed')
        setFinalPackage(result.finalPackage || null)
        addLog('complete', 8, '✓ Pipeline completed successfully!')
        return
      }

      // Process SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              switch (data.type) {
                case 'phase_start':
                  setCurrentPhase(data.phase)
                  addLog('phase_start', data.phase, `Phase ${data.phase}: ${PHASE_NAMES[data.phase]}`, data.detail)
                  break
                case 'thinking':
                  addLog('thinking', data.phase, data.message, data.detail)
                  break
                case 'artifact':
                  addLog('artifact', data.phase, `Generated: ${data.artifact}`, data.preview)
                  break
                case 'validation':
                  addLog('validation', data.phase, data.message, data.detail)
                  break
                case 'complete':
                  setCurrentPhase(8)
                  setStatus('completed')
                  setFinalPackage(data.finalPackage || null)
                  addLog('complete', 8, '✓ Pipeline completed successfully!')
                  break
                case 'error':
                  setStatus('failed')
                  setError(data.message)
                  addLog('complete', data.phase, `❌ ${data.message}`)
                  break
              }
            } catch {
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      setStatus('failed')
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      addLog('complete', currentPhase, '❌ Pipeline failed', errorMessage)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Turn research into{' '}
          <span className="text-primary">human-quality</span> copy
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          AI copywriting that thinks like a senior writer. No slop. No fluff.
        </p>
      </div>

      {/* Input Panel */}
      <InputPanel onGenerate={handleGenerate} isGenerating={status === 'running'} />

      {/* Progress & Activity Grid */}
      {status !== 'idle' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pipeline Progress */}
          <PipelineProgress currentPhase={currentPhase} status={status} />
          
          {/* Live Activity */}
          <LiveActivity logs={activityLogs} isActive={status === 'running'} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Output Panel */}
      <OutputPanel 
        finalPackage={finalPackage} 
        isLoading={status === 'running'} 
      />
    </div>
  )
}
