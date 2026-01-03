'use client'

import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { PHASE_NAMES, type PhaseNumber } from '@/core/domain/value-objects'

interface PipelineProgressProps {
  currentPhase: number
  status: 'idle' | 'running' | 'completed' | 'failed'
}

export function PipelineProgress({ currentPhase, status }: PipelineProgressProps) {
  const phases = Object.entries(PHASE_NAMES)
    .filter(([key]) => Number(key) > 0) // Skip phase 0 (TaskSpec)
    .map(([key, name]) => ({
      number: Number(key) as PhaseNumber,
      name,
    }))

  const getPhaseStatus = (phaseNumber: number) => {
    if (status === 'idle') return 'pending'
    if (status === 'failed' && currentPhase === phaseNumber) return 'failed'
    if (phaseNumber < currentPhase) return 'completed'
    if (phaseNumber === currentPhase && status === 'running') return 'running'
    if (phaseNumber === currentPhase && status === 'completed') return 'completed'
    return 'pending'
  }

  if (status === 'idle') {
    return null
  }

  return (
    <div className="w-full py-4">
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        Pipeline Progress
      </div>
      
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => {
            const phaseStatus = getPhaseStatus(phase.number)
            
            return (
              <div key={phase.number} className="flex flex-1 items-center">
                {/* Node */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      phaseStatus === 'completed'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : phaseStatus === 'running'
                        ? 'border-primary bg-background'
                        : phaseStatus === 'failed'
                        ? 'border-destructive bg-destructive/10'
                        : 'border-muted bg-background'
                    }`}
                  >
                    {phaseStatus === 'completed' && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {phaseStatus === 'running' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {phaseStatus === 'pending' && (
                      <span className="text-xs text-muted-foreground">
                        {phase.number}
                      </span>
                    )}
                    {phaseStatus === 'failed' && (
                      <span className="text-xs text-destructive">!</span>
                    )}
                  </div>
                  <span
                    className={`mt-1 text-xs ${
                      phaseStatus === 'running'
                        ? 'font-medium text-primary'
                        : phaseStatus === 'completed'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {phase.name.split(' ')[0]}
                  </span>
                </div>

                {/* Connector line */}
                {index < phases.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 transition-all ${
                      getPhaseStatus(phases[index + 1].number) !== 'pending' ||
                      phaseStatus === 'completed'
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Current phase indicator */}
      {status === 'running' && currentPhase > 0 && (
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Currently running: </span>
          <span className="font-medium text-primary">
            {PHASE_NAMES[currentPhase as PhaseNumber]}
          </span>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center text-sm font-medium text-green-600">
          Pipeline completed successfully
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center text-sm font-medium text-destructive">
          Pipeline failed at {PHASE_NAMES[currentPhase as PhaseNumber]}
        </div>
      )}
    </div>
  )
}

