'use client'

import { useState } from 'react'
import { InputPanel } from '@/components/features/input/input-panel'
import { PipelineProgress } from '@/components/features/pipeline/pipeline-progress'
import { OutputPanel } from '@/components/features/output/output-panel'
import type { TaskSpec, FinalPackage } from '@/lib/schemas'

type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed'

interface PipelineResult {
  success: boolean
  runId?: string
  finalPackage?: FinalPackage
  error?: string
}

export default function HomePage() {
  const [status, setStatus] = useState<PipelineStatus>('idle')
  const [currentPhase, setCurrentPhase] = useState(0)
  const [finalPackage, setFinalPackage] = useState<FinalPackage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (taskSpec: TaskSpec) => {
    setStatus('running')
    setCurrentPhase(1)
    setFinalPackage(null)
    setError(null)

    try {
      // Simulate phase progress for now
      // In production, this would use SSE or polling to get real-time updates
      const phaseInterval = setInterval(() => {
        setCurrentPhase((prev) => {
          if (prev < 8) return prev + 1
          clearInterval(phaseInterval)
          return prev
        })
      }, 3000)

      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskSpec }),
      })

      clearInterval(phaseInterval)

      const result: PipelineResult = await response.json()

      if (!result.success) {
        setStatus('failed')
        setError(result.error || 'Pipeline failed')
        return
      }

      setCurrentPhase(8)
      setStatus('completed')
      setFinalPackage(result.finalPackage || null)
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'An error occurred')
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

      {/* Pipeline Progress */}
      <PipelineProgress currentPhase={currentPhase} status={status} />

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

