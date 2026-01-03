'use client'

import { 
  CheckCircle, 
  Circle, 
  Loader2, 
  Brain, 
  Building2, 
  ListMusic, 
  PenTool, 
  Link2, 
  Waves, 
  LayoutGrid, 
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import { PHASE_NAMES, type PhaseNumber } from '@/core/domain/value-objects'
import { Card, CardContent } from '@/components/ui/card'

// Phase descriptions for user understanding
const PHASE_DESCRIPTIONS: Record<number, { icon: React.ReactNode; title: string; description: string; doing: string }> = {
  1: {
    icon: <Brain className="h-5 w-5" />,
    title: 'Creative Brief',
    description: 'Building a reader model and defining the single job this copy must do',
    doing: 'Analyzing your audience, identifying their fears and desires, choosing the proof strategy...'
  },
  2: {
    icon: <Building2 className="h-5 w-5" />,
    title: 'Message Architecture',
    description: 'Structuring claims, proof points, and objection handlers',
    doing: 'Mapping the argument structure, ordering claims for maximum impact, planning proof placement...'
  },
  3: {
    icon: <ListMusic className="h-5 w-5" />,
    title: 'Beat Sheet',
    description: 'Creating paragraph-by-paragraph plan with handoffs',
    doing: 'Defining each beat\'s job, calculating word budgets, creating curiosity handoffs between sections...'
  },
  4: {
    icon: <PenTool className="h-5 w-5" />,
    title: 'Draft V0',
    description: 'Writing the first draft following the beat sheet exactly',
    doing: 'Generating prose from constraints, tracing each paragraph to its beat, checking for drift...'
  },
  5: {
    icon: <Link2 className="h-5 w-5" />,
    title: 'Cohesion Pass',
    description: 'Fixing topic chains and sentence flow (Purdue method)',
    doing: 'Analyzing sentence openings, detecting topic breaks, applying old→new information flow...'
  },
  6: {
    icon: <Waves className="h-5 w-5" />,
    title: 'Rhythm Pass',
    description: 'Varying sentence lengths and adding landing beats',
    doing: 'Measuring sentence distribution, inserting short punches at key moments, adjusting cadence...'
  },
  7: {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: 'Channel Pass',
    description: 'Optimizing for how people read on this surface',
    doing: 'Applying attention physics, loading meaning into first lines and left edges, formatting for scan...'
  },
  8: {
    icon: <Package className="h-5 w-5" />,
    title: 'Final Package',
    description: 'QA checks, variants, and extras',
    doing: 'Running quality checks, generating shorter/punchier/safer variants, creating headlines...'
  },
}

interface PipelineProgressProps {
  currentPhase: number
  status: 'idle' | 'running' | 'completed' | 'failed'
  artifacts?: Record<string, unknown>
}

export function PipelineProgress({ currentPhase, status, artifacts }: PipelineProgressProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null)

  const phases = Object.entries(PHASE_NAMES)
    .filter(([key]) => Number(key) > 0)
    .map(([key, name]) => ({
      number: Number(key) as PhaseNumber,
      name,
      ...PHASE_DESCRIPTIONS[Number(key)],
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
    <Card className="border-2 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-muted/50 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Pipeline Progress</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Phase</span>
              <span className="font-mono font-bold text-primary">{currentPhase}</span>
              <span className="text-muted-foreground">of 8</span>
            </div>
          </div>
          
          {/* Mini progress bar */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(Math.max(currentPhase - 1, 0) / 8) * 100 + (status === 'running' ? 6 : 0)}%` }}
            />
          </div>
        </div>

        {/* Phase list */}
        <div className="divide-y">
          {phases.map((phase) => {
            const phaseStatus = getPhaseStatus(phase.number)
            const isExpanded = expandedPhase === phase.number
            const isActive = phaseStatus === 'running'
            const isCompleted = phaseStatus === 'completed'

            return (
              <div 
                key={phase.number}
                className={`transition-all ${
                  isActive ? 'bg-primary/5' : ''
                } ${isCompleted ? 'opacity-75' : ''}`}
              >
                {/* Phase row */}
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.number)}
                >
                  {/* Status icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary/20 text-primary'
                      : phaseStatus === 'failed'
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted && <CheckCircle className="h-4 w-4" />}
                    {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
                    {phaseStatus === 'pending' && <span className="text-xs font-mono">{phase.number}</span>}
                    {phaseStatus === 'failed' && <span className="text-xs">!</span>}
                  </div>

                  {/* Phase icon */}
                  <div className={`flex-shrink-0 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {phase.icon}
                  </div>

                  {/* Phase info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${
                      isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {phase.title}
                    </div>
                    {isActive && (
                      <div className="text-sm text-muted-foreground truncate animate-pulse">
                        {phase.doing}
                      </div>
                    )}
                  </div>

                  {/* Expand icon */}
                  <div className="flex-shrink-0 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 pl-[4.5rem] border-t bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">
                      {phase.description}
                    </p>
                    {isActive && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="animate-pulse">{phase.doing}</span>
                      </div>
                    )}
                    {isCompleted && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Status footer */}
        {status === 'completed' && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 border-t text-center font-medium">
            ✓ Pipeline completed successfully
          </div>
        )}
        {status === 'failed' && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 border-t text-center font-medium">
            Pipeline failed at Phase {currentPhase}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
