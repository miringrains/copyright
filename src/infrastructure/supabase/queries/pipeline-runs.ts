import { getServerClient } from '../client'
import type { Json } from '../types'

export interface PipelineRunInsert {
  project_id?: string | null
  status?: 'pending' | 'running' | 'completed' | 'failed'
  current_phase?: number
  task_spec?: Json
}

export interface PipelineRunUpdate {
  status?: 'pending' | 'running' | 'completed' | 'failed'
  current_phase?: number
  task_spec?: Json
  creative_brief?: Json
  message_architecture?: Json
  beat_sheet?: Json
  draft_v0?: Json
  cohesion_report?: Json
  rhythm_report?: Json
  channel_pass?: Json
  final_package?: Json
  error_message?: string
  completed_at?: string
}

export async function createPipelineRun(data: PipelineRunInsert) {
  const supabase = getServerClient()
  
  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return run
}

export async function getPipelineRun(id: string) {
  const supabase = getServerClient()
  
  const { data, error } = await supabase
    .from('pipeline_runs')
    .select()
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function updatePipelineRun(
  id: string,
  data: PipelineRunUpdate
) {
  const supabase = getServerClient()
  
  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return run
}

export async function updatePipelinePhase(
  id: string,
  phase: number,
  artifactKey: string,
  artifactValue: Json
) {
  const supabase = getServerClient()
  
  const updateData: PipelineRunUpdate = {
    current_phase: phase,
    [artifactKey]: artifactValue
  }
  
  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return run
}

export async function completePipelineRun(
  id: string,
  finalPackage: Json
) {
  const supabase = getServerClient()
  
  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .update({
      status: 'completed',
      current_phase: 8,
      final_package: finalPackage,
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return run
}

export async function failPipelineRun(
  id: string,
  errorMessage: string
) {
  const supabase = getServerClient()
  
  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .update({
      status: 'failed',
      error_message: errorMessage
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return run
}

export async function listPipelineRuns(projectId?: string) {
  const supabase = getServerClient()
  
  let query = supabase
    .from('pipeline_runs')
    .select()
    .order('created_at', { ascending: false })
  
  if (projectId) {
    query = query.eq('project_id', projectId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}
