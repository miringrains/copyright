import type { TaskSpec, FinalPackage } from '@/lib/schemas'
import type { PipelineOptions, PipelineResult, PipelineState } from './types'
import { PipelineError } from './errors'
import { PHASE_NAMES, type PhaseNumber } from '@/core/domain/value-objects'
import type { Json } from '@/infrastructure/supabase/types'

import { generateCreativeBrief } from '@/core/phases/phase-1-brief'
import { generateMessageArchitecture } from '@/core/phases/phase-2-architecture'
import { generateBeatSheet } from '@/core/phases/phase-3-beatsheet'
import { generateDraftV0 } from '@/core/phases/phase-4-draft'
import { generateCohesionPass } from '@/core/phases/phase-5-cohesion'
import { generateRhythmPass } from '@/core/phases/phase-6-rhythm'
import { generateChannelPass } from '@/core/phases/phase-7-channel'
import { generateFinalPackage } from '@/core/phases/phase-8-final'

import { 
  createPipelineRun, 
  updatePipelinePhase,
  completePipelineRun,
  failPipelineRun 
} from '@/infrastructure/supabase/queries/pipeline-runs'

export class PipelineOrchestrator {
  private state: PipelineState
  private options: PipelineOptions

  constructor(options: PipelineOptions = {}) {
    this.options = options
    this.state = {
      id: '',
      status: 'pending',
      currentPhase: 0,
      taskSpec: null,
      creativeBrief: null,
      messageArchitecture: null,
      beatSheet: null,
      draftV0: null,
      cohesionReport: null,
      rhythmReport: null,
      channelPass: null,
      finalPackage: null,
      errorMessage: null,
    }
  }

  async run(taskSpec: TaskSpec, projectId?: string): Promise<PipelineResult> {
    try {
      // Create pipeline run in database
      const run = await createPipelineRun({
        project_id: projectId,
        status: 'running',
        current_phase: 0,
        task_spec: JSON.parse(JSON.stringify(taskSpec)) as Json,
      })

      this.state.id = run.id
      this.state.status = 'running'
      this.state.taskSpec = taskSpec

      // Phase 1: Creative Brief
      await this.executePhase(1, 'creative_brief', async () => {
        this.state.creativeBrief = await generateCreativeBrief(taskSpec)
        return this.state.creativeBrief
      })

      // Phase 2: Message Architecture
      await this.executePhase(2, 'message_architecture', async () => {
        this.state.messageArchitecture = await generateMessageArchitecture(
          taskSpec,
          this.state.creativeBrief!
        )
        return this.state.messageArchitecture
      })

      // Phase 3: Beat Sheet
      await this.executePhase(3, 'beat_sheet', async () => {
        this.state.beatSheet = await generateBeatSheet(
          taskSpec,
          this.state.messageArchitecture!
        )
        return this.state.beatSheet
      })

      // Phase 4: Draft V0
      await this.executePhase(4, 'draft_v0', async () => {
        this.state.draftV0 = await generateDraftV0(
          taskSpec,
          this.state.beatSheet!
        )
        return this.state.draftV0
      })

      // Phase 5: Cohesion Pass
      await this.executePhase(5, 'cohesion_report', async () => {
        this.state.cohesionReport = await generateCohesionPass(
          taskSpec,
          this.state.beatSheet!,
          this.state.draftV0!
        )
        return this.state.cohesionReport
      })

      // Phase 6: Rhythm Pass
      await this.executePhase(6, 'rhythm_report', async () => {
        this.state.rhythmReport = await generateRhythmPass(
          taskSpec,
          this.state.beatSheet!,
          this.state.cohesionReport!.draft_v1
        )
        return this.state.rhythmReport
      })

      // Phase 7: Channel Pass
      await this.executePhase(7, 'channel_pass', async () => {
        this.state.channelPass = await generateChannelPass(
          taskSpec,
          this.state.beatSheet!,
          this.state.rhythmReport!.draft_v2
        )
        return this.state.channelPass
      })

      // Phase 8: Final Package
      await this.executePhase(8, 'final_package', async () => {
        this.state.finalPackage = await generateFinalPackage(
          taskSpec,
          this.state.messageArchitecture!,
          this.state.channelPass!.draft_v3
        )
        return this.state.finalPackage
      })

      // Complete the run
      await completePipelineRun(
        this.state.id,
        JSON.parse(JSON.stringify(this.state.finalPackage)) as Json
      )

      this.state.status = 'completed'
      await this.options.onComplete?.(this.state.finalPackage!)

      return {
        success: true,
        runId: this.state.id,
        finalPackage: this.state.finalPackage!,
        artifacts: {
          creativeBrief: this.state.creativeBrief!,
          messageArchitecture: this.state.messageArchitecture!,
          beatSheet: this.state.beatSheet!,
          draftV0: this.state.draftV0!,
          cohesionReport: this.state.cohesionReport!,
          rhythmReport: this.state.rhythmReport!,
          channelPass: this.state.channelPass!,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (this.state.id) {
        await failPipelineRun(this.state.id, errorMessage)
      }

      this.state.status = 'failed'
      this.state.errorMessage = errorMessage
      await this.options.onError?.(error as Error)

      return {
        success: false,
        runId: this.state.id,
        error: errorMessage,
      }
    }
  }

  private async executePhase<T>(
    phaseNumber: PhaseNumber,
    artifactKey: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const phaseName = PHASE_NAMES[phaseNumber]
    
    this.state.currentPhase = phaseNumber
    await this.options.onPhaseStart?.(phaseNumber, phaseName)

    try {
      const result = await executor()

      // Update database with artifact
      await updatePipelinePhase(
        this.state.id,
        phaseNumber,
        artifactKey,
        JSON.parse(JSON.stringify(result)) as Json
      )

      await this.options.onPhaseComplete?.(phaseNumber, phaseName, result)
      return result
    } catch (error) {
      const pipelineError = new PipelineError(
        `Phase ${phaseNumber} (${phaseName}) failed`,
        phaseNumber,
        phaseName,
        error as Error
      )

      await this.options.onPhaseError?.(phaseNumber, phaseName, error as Error)
      throw pipelineError
    }
  }

  getState(): PipelineState {
    return { ...this.state }
  }
}

// Convenience function for running a pipeline
export async function runPipeline(
  taskSpec: TaskSpec,
  projectId?: string,
  options?: PipelineOptions
): Promise<PipelineResult> {
  const orchestrator = new PipelineOrchestrator(options)
  return orchestrator.run(taskSpec, projectId)
}

