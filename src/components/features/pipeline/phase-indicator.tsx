'use client'

import { Badge } from '@/components/ui/badge'
import { PHASE_NAMES, type PhaseNumber } from '@/core/domain/value-objects'

interface PhaseIndicatorProps {
  phase: PhaseNumber
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export function PhaseIndicator({ phase, status }: PhaseIndicatorProps) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    running: 'default',
    completed: 'secondary',
    failed: 'destructive',
  }

  return (
    <Badge variant={variants[status]} className="gap-1">
      <span className="font-mono text-xs">{phase}</span>
      <span>{PHASE_NAMES[phase]}</span>
    </Badge>
  )
}

