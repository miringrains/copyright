'use client'

import { useState, useCallback } from 'react'
import { SmartInputPanel } from '@/components/features/input/smart-input-panel'
import { SimpleOutputPanel } from '@/components/features/output/simple-output-panel'
import type { CopyOutput } from '@/lib/schemas/copy-output'
import type { VoiceSelection } from '@/lib/schemas/voice-selection'

type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed'

const PHASE_NAMES: Record<number, string> = {
  1: 'Gathering Information',
  2: 'Selecting Voice',
  3: 'Writing Copy',
}

interface SimpleGenerateInput {
  formData: Record<string, string>
  websiteContent: string | null
  campaignType: string
}

export default function HomePage() {
  const [status, setStatus] = useState<PipelineStatus>('idle')
  const [currentPhase, setCurrentPhase] = useState(0)
  const [currentMessage, setCurrentMessage] = useState<string>('')
  const [copyOutput, setCopyOutput] = useState<CopyOutput | null>(null)
  const [voiceSelection, setVoiceSelection] = useState<VoiceSelection | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async (input: SimpleGenerateInput) => {
    setStatus('running')
    setCurrentPhase(1)
    setCopyOutput(null)
    setVoiceSelection(null)
    setError(null)
    setCurrentMessage('Starting...')

    try {
      const response = await fetch('/api/simple-pipeline/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Pipeline request failed')
      }

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
                  setCurrentMessage(data.name)
                  break
                case 'thinking':
                  setCurrentMessage(data.message)
                  break
                case 'phase_complete':
                  // Phase done, wait for next
                  break
                case 'complete':
                  setCurrentPhase(3)
                  setStatus('completed')
                  setCopyOutput(data.copyOutput)
                  setVoiceSelection(data.voiceSelection)
                  setCurrentMessage('')
                  break
                case 'error':
                  setStatus('failed')
                  setError(data.message)
                  setCurrentMessage('')
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
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCurrentMessage('')
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Copy that sounds{' '}
          <span className="text-primary">human</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Pick a voice. Give it context. Let it write.
        </p>
      </div>

      {/* Input Panel */}
      <SmartInputPanel 
        onGenerate={handleGenerate} 
        isGenerating={status === 'running'} 
      />

      {/* Progress */}
      {status === 'running' && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            {/* Phase indicators */}
            <div className="flex gap-2">
              {[1, 2, 3].map((phase) => (
                <div
                  key={phase}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    phase < currentPhase
                      ? 'bg-primary text-primary-foreground'
                      : phase === currentPhase
                      ? 'bg-primary/20 text-primary animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {phase}
                </div>
              ))}
            </div>
            
            {/* Current phase info */}
            <div className="flex-1">
              <p className="font-medium">{PHASE_NAMES[currentPhase]}</p>
              <p className="text-sm text-muted-foreground">{currentMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Output */}
      <SimpleOutputPanel 
        copyOutput={copyOutput} 
        voiceSelection={voiceSelection}
        isLoading={status === 'running'} 
      />
    </div>
  )
}
