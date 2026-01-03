import { getServerClient } from '../client'
import type { Json } from '../types'

export interface SourceMaterialInsert {
  project_id?: string
  source_type: 'upload' | 'paste' | 'url'
  filename?: string
  content?: string
  url?: string
  metadata?: Json
}

export async function createSourceMaterial(data: SourceMaterialInsert) {
  const supabase = getServerClient()
  
  const { data: material, error } = await supabase
    .from('source_materials')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return material
}

export async function getSourceMaterials(projectId: string) {
  const supabase = getServerClient()
  
  const { data, error } = await supabase
    .from('source_materials')
    .select()
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

export async function deleteSourceMaterial(id: string) {
  const supabase = getServerClient()
  
  const { error } = await supabase
    .from('source_materials')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteProjectSourceMaterials(projectId: string) {
  const supabase = getServerClient()
  
  const { error } = await supabase
    .from('source_materials')
    .delete()
    .eq('project_id', projectId)
  
  if (error) throw error
}
