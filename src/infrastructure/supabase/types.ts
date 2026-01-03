// Database types for Supabase
// These match the schema created in the migration

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      pipeline_runs: {
        Row: {
          id: string
          project_id: string | null
          status: 'pending' | 'running' | 'completed' | 'failed'
          current_phase: number
          task_spec: Json | null
          creative_brief: Json | null
          message_architecture: Json | null
          beat_sheet: Json | null
          draft_v0: Json | null
          cohesion_report: Json | null
          rhythm_report: Json | null
          channel_pass: Json | null
          final_package: Json | null
          error_message: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          current_phase?: number
          task_spec?: Json | null
          creative_brief?: Json | null
          message_architecture?: Json | null
          beat_sheet?: Json | null
          draft_v0?: Json | null
          cohesion_report?: Json | null
          rhythm_report?: Json | null
          channel_pass?: Json | null
          final_package?: Json | null
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          current_phase?: number
          task_spec?: Json | null
          creative_brief?: Json | null
          message_architecture?: Json | null
          beat_sheet?: Json | null
          draft_v0?: Json | null
          cohesion_report?: Json | null
          rhythm_report?: Json | null
          channel_pass?: Json | null
          final_package?: Json | null
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
      }
      source_materials: {
        Row: {
          id: string
          project_id: string | null
          source_type: 'upload' | 'paste' | 'url'
          filename: string | null
          content: string | null
          url: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          source_type: 'upload' | 'paste' | 'url'
          filename?: string | null
          content?: string | null
          url?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          source_type?: 'upload' | 'paste' | 'url'
          filename?: string | null
          content?: string | null
          url?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
    }
  }
}

// Convenience types
export type Project = Database['public']['Tables']['projects']['Row']
export type PipelineRun = Database['public']['Tables']['pipeline_runs']['Row']
export type SourceMaterial = Database['public']['Tables']['source_materials']['Row']

export type InsertProject = Database['public']['Tables']['projects']['Insert']
export type InsertPipelineRun = Database['public']['Tables']['pipeline_runs']['Insert']
export type InsertSourceMaterial = Database['public']['Tables']['source_materials']['Insert']

export type UpdatePipelineRun = Database['public']['Tables']['pipeline_runs']['Update']

