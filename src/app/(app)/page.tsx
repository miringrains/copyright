'use client'

import { useState, useCallback } from 'react'
import { SmartInputPanel } from '@/components/features/input/smart-input-panel'
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
  const [currentProcess, setCurrentProcess] = useState<string | undefined>()

  const addLog = useCallback((type: ActivityLog['type'], phase: number, message: string, detail?: string) => {
    setActivityLogs(prev => [...prev, createActivityLog(type, phase, message, detail)])
  }, [])

  const handleGenerate = async (taskSpec: TaskSpec) => {
    setStatus('running')
    setCurrentPhase(1)
    setFinalPackage(null)
    setError(null)
    setActivityLogs([])
    setCurrentProcess('Initializing pipeline...')

    addLog('phase_start', 1, `Starting: ${taskSpec.copy_type}`)

    try {
      const response = await fetch('/api/pipeline/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskSpec }),
      })

      if (!response.ok) {
        // Fallback to regular API
        setCurrentProcess('Processing (non-streaming)...')
        const fallbackResponse = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskSpec }),
        })
        
        const result: PipelineResult = await fallbackResponse.json()
        
        if (!result.success) {
          setStatus('failed')
          setError(result.error || 'Pipeline failed')
          addLog('complete', currentPhase, `Failed: ${result.error}`)
          setCurrentProcess(undefined)
          return
        }

        setCurrentPhase(8)
        setStatus('completed')
        setFinalPackage(result.finalPackage || null)
        addLog('complete', 8, 'Pipeline complete')
        setCurrentProcess(undefined)
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
                  setCurrentProcess(`${PHASE_NAMES[data.phase]}...`)
                  addLog('phase_start', data.phase, `Phase ${data.phase}: ${PHASE_NAMES[data.phase]}`)
                  break
                case 'thinking':
                  setCurrentProcess(data.message)
                  addLog('thinking', data.phase, data.message)
                  break
                case 'artifact':
                  setCurrentProcess(`Generated ${data.artifact}`)
                  addLog('artifact', data.phase, `✓ ${data.artifact}`)
                  break
                case 'validation':
                  addLog('validation', data.phase, data.message)
                  break
                case 'complete':
                  setCurrentPhase(8)
                  setStatus('completed')
                  setFinalPackage(data.finalPackage || null)
                  addLog('complete', 8, 'Pipeline complete')
                  setCurrentProcess(undefined)
                  break
                case 'error':
                  setStatus('failed')
                  setError(data.message)
                  addLog('complete', data.phase, `Error: ${data.message}`)
                  setCurrentProcess(undefined)
                  break
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (err) {
      setStatus('failed')
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      addLog('complete', currentPhase, `Error: ${errorMessage}`)
      setCurrentProcess(undefined)
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

      {/* Smart Input Panel */}
      <SmartInputPanel onGenerate={handleGenerate} isGenerating={status === 'running'} />

      {/* Progress & Activity */}
      {status !== 'idle' && (
        <div className="space-y-4">
          {/* Pipeline Progress */}
          <PipelineProgress currentPhase={currentPhase} status={status} />
          
          {/* Live Activity */}
          <LiveActivity 
            logs={activityLogs} 
            isActive={status === 'running'} 
            currentProcess={currentProcess}
          />
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
