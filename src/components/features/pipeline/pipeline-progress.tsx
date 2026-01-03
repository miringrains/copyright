'use client'

import { 
  CheckCircle, 
  Loader2, 
  Brain, 
  Building2, 
  ListMusic, 
  PenTool, 
  Link2, 
  Waves, 
  LayoutGrid, 
  Package,
} from 'lucide-react'
import { PHASE_NAMES, type PhaseNumber } from '@/core/domain/value-objects'
import { Card, CardContent } from '@/components/ui/card'

// Phase icons
const PHASE_ICONS: Record<number, React.ReactNode> = {
  1: <Brain className="h-4 w-4" />,
  2: <Building2 className="h-4 w-4" />,
  3: <ListMusic className="h-4 w-4" />,
  4: <PenTool className="h-4 w-4" />,
  5: <Link2 className="h-4 w-4" />,
  6: <Waves className="h-4 w-4" />,
  7: <LayoutGrid className="h-4 w-4" />,
  8: <Package className="h-4 w-4" />,
}

const PHASE_SHORT: Record<number, string> = {
  1: 'Brief',
  2: 'Architecture',
  3: 'Beat Sheet',
  4: 'Draft',
  5: 'Cohesion',
  6: 'Rhythm',
  7: 'Channel',
  8: 'Package',
}

interface PipelineProgressProps {
  currentPhase: number
  status: 'idle' | 'running' | 'completed' | 'failed'
}

export function PipelineProgress({ currentPhase, status }: PipelineProgressProps) {
  const phases = Object.entries(PHASE_NAMES)
    .filter(([key]) => Number(key) > 0)
    .map(([key]) => Number(key) as PhaseNumber)

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

  const progress = status === 'completed' 
    ? 100 
    : Math.max(0, ((currentPhase - 1) / 8) * 100 + (status === 'running' ? 6 : 0))

  return (
    <Card className="border overflow-hidden bg-background/50 backdrop-blur">
      <CardContent className="p-4">
        {/* Header with progress bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {status === 'running' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {status === 'completed' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm font-medium">
              {status === 'running' && `Phase ${currentPhase}: ${PHASE_SHORT[currentPhase]}`}
              {status === 'completed' && 'Complete'}
              {status === 'failed' && `Failed at Phase ${currentPhase}`}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentPhase}/8
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className={`h-full transition-all duration-500 ease-out rounded-full ${
              status === 'failed' ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Phase dots */}
        <div className="flex items-center justify-between">
          {phases.map((phase) => {
            const phaseStatus = getPhaseStatus(phase)
            const isActive = phaseStatus === 'running'
            const isCompleted = phaseStatus === 'completed'
            const isFailed = phaseStatus === 'failed'

            return (
              <div
                key={phase}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : isFailed
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    PHASE_ICONS[phase]
                  )}
                </div>
                <span className={`text-[10px] font-medium ${
                  isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {PHASE_SHORT[phase]}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
