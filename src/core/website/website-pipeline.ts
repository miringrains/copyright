/**
 * Website Copy Advisor Pipeline
 * 
 * Orchestrates the strategic advisory flow:
 * 1. Audit existing site (extract sections)
 * 2. Build fact inventory (constrain what we can use)
 * 3. Assess each section (keep/improve/rewrite)
 * 4. Generate recommendations (before/after with reasoning)
 */

import { buildFactInventory } from './fact-inventory'
import { auditSite } from './site-auditor'
import { assessSections } from './section-advisor'
import { generateRecommendations } from './diff-generator'
import type { 
  WebsiteAdvisorOutput,
  FactInventory,
  SiteAudit,
  CopyRecommendation,
} from '@/lib/schemas/website'

// ============================================================================
// TYPES
// ============================================================================

export type AdvisorPhase = 
  | 'audit'
  | 'inventory'
  | 'assess'
  | 'generate'
  | 'complete'
  | 'error'

export interface AdvisorCallbacks {
  onPhaseChange: (phase: AdvisorPhase, message: string, data?: unknown) => void
  onComplete: (output: WebsiteAdvisorOutput) => void
  onError: (message: string) => void
}

export interface AdvisorInput {
  websiteUrl: string
  prompt: string
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Run the full website copy advisor pipeline
 */
export async function runWebsiteAdvisor(
  input: AdvisorInput,
  callbacks: AdvisorCallbacks
): Promise<WebsiteAdvisorOutput> {
  const { websiteUrl, prompt } = input

  try {
    // Phase 1: Audit existing site
    callbacks.onPhaseChange('audit', 'Auditing existing website...')
    const siteAudit = await auditSite(websiteUrl, (msg) => {
      callbacks.onPhaseChange('audit', msg)
    })
    callbacks.onPhaseChange('audit', `Found ${siteAudit.sections.length} sections to analyze`, {
      sections: siteAudit.sections.map(s => s.type),
    })

    // Phase 2: Build fact inventory from user prompt
    callbacks.onPhaseChange('inventory', 'Building fact inventory from your description...')
    const factInventory = await buildFactInventory(prompt, (msg) => {
      callbacks.onPhaseChange('inventory', msg)
    })
    callbacks.onPhaseChange('inventory', `Extracted ${factInventory.allFactsList.length} facts, identified ${factInventory.unknownGaps.length} gaps`, {
      facts: factInventory.allFactsList,
      gaps: factInventory.unknownGaps,
    })

    // Phase 3: Assess each section
    callbacks.onPhaseChange('assess', 'Assessing each section...')
    const assessedAudit = await assessSections(siteAudit, factInventory, undefined, (msg) => {
      callbacks.onPhaseChange('assess', msg)
    })
    
    const keepCount = assessedAudit.sections.filter(s => s.assessment === 'keep').length
    const improveCount = assessedAudit.sections.filter(s => s.assessment === 'improve').length
    const rewriteCount = assessedAudit.sections.filter(s => s.assessment === 'rewrite').length
    
    callbacks.onPhaseChange('assess', `Assessment: ${keepCount} keep, ${improveCount} improve, ${rewriteCount} rewrite`, {
      keep: keepCount,
      improve: improveCount,
      rewrite: rewriteCount,
    })

    // Phase 4: Generate recommendations
    callbacks.onPhaseChange('generate', 'Generating recommendations...')
    const recommendations = await generateRecommendations(
      assessedAudit,
      factInventory,
      undefined,
      (msg) => callbacks.onPhaseChange('generate', msg)
    )
    callbacks.onPhaseChange('generate', `Generated ${recommendations.length} recommendations`)

    // Build final output
    const output: WebsiteAdvisorOutput = {
      websiteUrl,
      userPrompt: prompt,
      factInventory,
      siteAudit: assessedAudit,
      recommendations,
      summary: {
        sectionsAnalyzed: assessedAudit.sections.length,
        sectionsToKeep: keepCount,
        sectionsToImprove: improveCount,
        sectionsToRewrite: rewriteCount,
      },
    }

    callbacks.onPhaseChange('complete', 'Analysis complete')
    callbacks.onComplete(output)

    return output
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed'
    callbacks.onError(message)
    throw error
  }
}

/**
 * Quick analysis - just audit and assess, no generation
 */
export async function quickAnalysis(
  websiteUrl: string,
  prompt: string,
  callbacks: AdvisorCallbacks
): Promise<{
  siteAudit: SiteAudit
  factInventory: FactInventory
}> {
  try {
    callbacks.onPhaseChange('audit', 'Auditing website...')
    const siteAudit = await auditSite(websiteUrl)

    callbacks.onPhaseChange('inventory', 'Building fact inventory...')
    const factInventory = await buildFactInventory(prompt)

    callbacks.onPhaseChange('assess', 'Assessing sections...')
    const assessedAudit = await assessSections(siteAudit, factInventory)

    callbacks.onPhaseChange('complete', 'Quick analysis complete')

    return {
      siteAudit: assessedAudit,
      factInventory,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    callbacks.onError(message)
    throw error
  }
}
