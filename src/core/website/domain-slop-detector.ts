/**
 * Domain-Aware Slop Detector
 * 
 * Multi-layer slop detection:
 * 1. Universal forbidden words (from existing copy-type-rules.ts)
 * 2. Domain-specific forbidden phrases (discovered during immersion)
 * 3. Pattern matching against "bad examples"
 * 4. AI-based slop scoring for edge cases
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { 
  UNIVERSAL_FORBIDDEN, 
  UNIVERSAL_FORBIDDEN_PATTERNS 
} from '@/core/copy-type-rules'
import type { DomainProfile } from '@/lib/schemas/website'

// ============================================================================
// TYPES
// ============================================================================

export interface SlopViolation {
  text: string
  type: 'universal' | 'domain' | 'pattern' | 'bad_example'
  reason: string
  suggestion?: string
}

export interface SlopCheckResult {
  passed: boolean
  score: number  // 0-100, higher is better (less sloppy)
  violations: SlopViolation[]
  universalViolations: string[]
  domainViolations: string[]
}

// ============================================================================
// UNIVERSAL SLOP CHECK
// ============================================================================

/**
 * Check copy against universal forbidden words/patterns
 */
function checkUniversalSlop(copy: string): SlopViolation[] {
  const violations: SlopViolation[] = []
  const lowerCopy = copy.toLowerCase()

  // Check forbidden words
  for (const word of UNIVERSAL_FORBIDDEN) {
    if (lowerCopy.includes(word.toLowerCase())) {
      violations.push({
        text: word,
        type: 'universal',
        reason: `"${word}" is generic AI/marketing speak`,
        suggestion: getUniversalSuggestion(word),
      })
    }
  }

  // Check forbidden patterns
  for (const pattern of UNIVERSAL_FORBIDDEN_PATTERNS) {
    const match = copy.match(pattern)
    if (match) {
      violations.push({
        text: match[0],
        type: 'pattern',
        reason: `Pattern "${match[0]}" is a known AI slop pattern`,
      })
    }
  }

  return violations
}

/**
 * Get replacement suggestion for common forbidden words
 */
function getUniversalSuggestion(word: string): string {
  const suggestions: Record<string, string> = {
    'leverage': 'use, apply, build on',
    'utilize': 'use',
    'optimize': 'improve, adjust, tune',
    'streamline': 'simplify, speed up',
    'enhance': 'improve, strengthen',
    'empower': 'enable, help',
    'unlock': 'access, gain, open',
    'journey': 'path, process, experience (be specific)',
    'solution': 'tool, service, approach (be specific)',
    'seamless': 'smooth, easy, simple',
    'robust': 'strong, reliable, solid',
    'comprehensive': 'complete, full, thorough',
    'cutting-edge': 'new, advanced, modern',
    'game-changing': 'significant, important (or just show why)',
  }
  return suggestions[word.toLowerCase()] || 'Be more specific'
}

// ============================================================================
// DOMAIN-SPECIFIC SLOP CHECK
// ============================================================================

/**
 * Check copy against domain-specific forbidden phrases
 */
function checkDomainSlop(
  copy: string, 
  domainProfile: DomainProfile
): SlopViolation[] {
  const violations: SlopViolation[] = []
  const lowerCopy = copy.toLowerCase()

  // Check domain-specific forbidden phrases
  for (const phrase of domainProfile.forbiddenInThisNiche) {
    if (lowerCopy.includes(phrase.toLowerCase())) {
      violations.push({
        text: phrase,
        type: 'domain',
        reason: `"${phrase}" is a cliché in ${domainProfile.subNiche}`,
      })
    }
  }

  // Check generic phrases
  for (const phrase of domainProfile.genericPhrases) {
    if (lowerCopy.includes(phrase.toLowerCase())) {
      violations.push({
        text: phrase,
        type: 'domain',
        reason: `"${phrase}" is too generic for ${domainProfile.industry}`,
      })
    }
  }

  return violations
}

/**
 * Check if copy is too similar to bad examples
 */
function checkAgainstBadExamples(
  copy: string,
  domainProfile: DomainProfile
): SlopViolation[] {
  const violations: SlopViolation[] = []
  const lowerCopy = copy.toLowerCase()

  // Check for significant overlap with bad examples
  for (const badExample of domainProfile.badExamples) {
    const badWords = badExample.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const matchingWords = badWords.filter(w => lowerCopy.includes(w))
    
    // If >50% of significant words match, flag it
    if (matchingWords.length > badWords.length * 0.5 && matchingWords.length > 3) {
      violations.push({
        text: badExample,
        type: 'bad_example',
        reason: 'Copy is too similar to identified slop example',
      })
    }
  }

  return violations
}

// ============================================================================
// AI-BASED SLOP SCORING
// ============================================================================

const SlopScoreSchema = z.object({
  score: z.number().min(0).max(100).describe('Quality score. 100 = no slop, 0 = pure slop'),
  issues: z.array(z.object({
    text: z.string(),
    problem: z.string(),
    suggestion: z.string(),
  })),
  verdict: z.enum(['excellent', 'good', 'needs_work', 'slop']),
  reasoning: z.string(),
})

/**
 * AI-based slop detection for edge cases
 */
async function aiSlopCheck(
  copy: string,
  domainProfile: DomainProfile
): Promise<{
  score: number
  issues: Array<{ text: string; problem: string; suggestion: string }>
}> {
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: SlopScoreSchema,
    system: `You evaluate copy for "AI slop" - generic, hollow, meaningless marketing language.

WHAT IS SLOP:
- Hollow superlatives: "unmatched", "best-in-class", "world-class"
- Vague claims: "delivering excellence", "committed to quality"
- Generic differentiators that could apply to anyone
- Stacked adjectives with no substance
- Phrases that sound good but say nothing

WHAT IS NOT SLOP:
- Specific claims with evidence
- Concrete details (numbers, names, places)
- Language that sounds like a human expert wrote it
- Claims that couldn't apply to every competitor

For this industry (${domainProfile.subNiche}):
Domain-specific slop to watch for: ${domainProfile.forbiddenInThisNiche.join(', ')}
Good examples from this industry: ${domainProfile.goodExamples.slice(0, 2).join(' | ')}

Score 0-100. Be harsh. Marketing copy is 90% slop.`,
    prompt: `Rate this copy for AI slop:

"""
${copy}
"""

Score it and identify specific sloppy phrases that should be rewritten.`,
  })

  return {
    score: result.object.score,
    issues: result.object.issues,
  }
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Run full slop detection
 */
export async function detectSlop(
  copy: string,
  domainProfile: DomainProfile,
  skipAiCheck: boolean = false
): Promise<SlopCheckResult> {
  // Layer 1: Universal slop
  const universalViolations = checkUniversalSlop(copy)
  
  // Layer 2: Domain-specific slop
  const domainViolations = checkDomainSlop(copy, domainProfile)
  
  // Layer 3: Bad example matching
  const badExampleViolations = checkAgainstBadExamples(copy, domainProfile)

  const allViolations = [
    ...universalViolations,
    ...domainViolations,
    ...badExampleViolations,
  ]

  // Calculate base score from rule-based checks
  let score = 100
  score -= universalViolations.length * 5
  score -= domainViolations.length * 8  // Domain violations are worse
  score -= badExampleViolations.length * 10
  score = Math.max(0, score)

  // Layer 4: AI check for edge cases (optional)
  if (!skipAiCheck && score > 50) {
    // Only do AI check if rule-based checks didn't already flag major issues
    const aiResult = await aiSlopCheck(copy, domainProfile)
    
    // Blend scores
    score = Math.round((score * 0.4) + (aiResult.score * 0.6))
    
    // Add AI-found issues
    for (const issue of aiResult.issues) {
      if (!allViolations.some(v => v.text.includes(issue.text))) {
        allViolations.push({
          text: issue.text,
          type: 'pattern',
          reason: issue.problem,
          suggestion: issue.suggestion,
        })
      }
    }
  }

  return {
    passed: score >= 70,
    score,
    violations: allViolations,
    universalViolations: universalViolations.map(v => v.text),
    domainViolations: domainViolations.map(v => v.text),
  }
}

/**
 * Quick slop check (rule-based only, no AI)
 */
export function quickSlopCheck(
  copy: string,
  domainProfile: DomainProfile
): SlopCheckResult {
  const universalViolations = checkUniversalSlop(copy)
  const domainViolations = checkDomainSlop(copy, domainProfile)
  
  const allViolations = [...universalViolations, ...domainViolations]
  
  let score = 100
  score -= universalViolations.length * 5
  score -= domainViolations.length * 8
  score = Math.max(0, score)

  return {
    passed: score >= 70,
    score,
    violations: allViolations,
    universalViolations: universalViolations.map(v => v.text),
    domainViolations: domainViolations.map(v => v.text),
  }
}

/**
 * Fix sloppy copy by rewriting flagged phrases
 */
export async function fixSlop(
  copy: string,
  violations: SlopViolation[],
  domainProfile: DomainProfile
): Promise<string> {
  if (violations.length === 0) return copy

  const violationList = violations
    .map(v => `- "${v.text}": ${v.reason}${v.suggestion ? ` → Try: ${v.suggestion}` : ''}`)
    .join('\n')

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: z.object({
      fixedCopy: z.string(),
      changesExplained: z.array(z.string()),
    }),
    system: `You fix "sloppy" copy by replacing generic phrases with specific, credible ones.

RULES:
- Replace hollow superlatives with specific claims
- Replace vague phrases with concrete details
- If you don't have a specific fact to replace with, just remove the sloppy phrase
- Maintain the same overall structure and tone
- Use terminology from this industry: ${domainProfile.terminology.terms.slice(0, 10).join(', ')}

Good examples from this industry:
${domainProfile.goodExamples.slice(0, 3).join('\n')}`,
    prompt: `Fix these sloppy phrases in the copy below:

VIOLATIONS:
${violationList}

ORIGINAL COPY:
${copy}

Rewrite to fix the violations while maintaining the core message.`,
  })

  return result.object.fixedCopy
}
