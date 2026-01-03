import { getServerClient } from '../client'

export interface ProjectInsert {
  name: string
  description?: string
}

export async function createProject(data: ProjectInsert) {
  const supabase = getServerClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return project
}

export async function getProject(id: string) {
  const supabase = getServerClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select()
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function listProjects() {
  const supabase = getServerClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select()
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function deleteProject(id: string) {
  const supabase = getServerClient()
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}
