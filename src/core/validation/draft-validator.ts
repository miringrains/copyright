/**
 * Draft Validator - Enforces writing rules with hard rejections
 * 
 * This validator checks drafts against the rules and returns violations.
 * Violations cause regeneration, not patching.
 */

import { 
  UNIVERSAL_FORBIDDEN, 
  UNIVERSAL_FORBIDDEN_PATTERNS,
  getCopyTypeRules,
  getAllForbiddenTerms 
} from '@/core/copy-type-rules'
import type { BeatSheet, WritingConstraints } from '@/lib/schemas'

export interface Violation {
  type: 'forbidden_word' | 'forbidden_pattern' | 'sentence_too_long' | 'adjective_stacking' | 'missing_specificity' | 'bad_first_word' | 'em_dash'
  location: string
  details: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  violations: Violation[]
  score: number // 0-100, 100 is perfect
}

/**
 * Split text into sentences (simple heuristic)
 */
function splitIntoSentences(text: string): string[] {
  // Split on period, question mark, exclamation, but not on abbreviations
  return text
    .replace(/([.!?])\s+/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Count words in a string
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Check for forbidden words (case-insensitive)
 */
function checkForbiddenWords(text: string, forbiddenWords: string[]): Violation[] {
  const violations: Violation[] = []
  const lowerText = text.toLowerCase()
  
  for (const word of forbiddenWords) {
    const lowerWord = word.toLowerCase()
    // Check for whole word match
    const regex = new RegExp(`\\b${escapeRegex(lowerWord)}\\b`, 'gi')
    const matches = text.match(regex)
    
    if (matches) {
      violations.push({
        type: 'forbidden_word',
        location: `Found "${matches[0]}"`,
        details: `The word "${word}" is forbidden. Remove or replace it.`,
        severity: 'error',
      })
    }
  }
  
  return violations
}

/**
 * Check for forbidden patterns
 */
function checkForbiddenPatterns(text: string, patterns: RegExp[]): Violation[] {
  const violations: Violation[] = []
  
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      violations.push({
        type: 'forbidden_pattern',
        location: `Found "${matches[0]}"`,
        details: `Pattern "${pattern.source}" is forbidden. Rewrite this phrase.`,
        severity: 'error',
      })
    }
  }
  
  return violations
}

/**
 * Check for em dashes
 */
function checkEmDashes(text: string): Violation[] {
  const violations: Violation[] = []
  
  if (text.includes('—') || text.includes('--')) {
    violations.push({
      type: 'em_dash',
      location: 'Em dash found',
      details: 'Em dashes (—) are forbidden. Use periods or commas instead.',
      severity: 'error',
    })
  }
  
  return violations
}

/**
 * Check sentence lengths
 */
function checkSentenceLengths(text: string, maxWords: number): Violation[] {
  const violations: Violation[] = []
  const sentences = splitIntoSentences(text)
  
  for (let i = 0; i < sentences.length; i++) {
    const wordCount = countWords(sentences[i])
    if (wordCount > maxWords) {
      violations.push({
        type: 'sentence_too_long',
        location: `Sentence ${i + 1}`,
        details: `Sentence has ${wordCount} words but max is ${maxWords}: "${sentences[i].slice(0, 50)}..."`,
        severity: 'error',
      })
    }
  }
  
  return violations
}

/**
 * Check for adjective stacking (simplified check)
 */
function checkAdjectiveStacking(text: string, maxAdjectives: number): Violation[] {
  const violations: Violation[] = []
  
  // Common adjective patterns before nouns
  // This is a simplified check - looks for multiple comma-separated adjectives
  const stackingPattern = /(\w+,\s*\w+,\s*\w+)\s+(interface|system|solution|platform|tool|product|feature|experience)/gi
  const matches = text.match(stackingPattern)
  
  if (matches) {
    for (const match of matches) {
      violations.push({
        type: 'adjective_stacking',
        location: `Found "${match}"`,
        details: `Too many adjectives stacked. Max ${maxAdjectives} per noun.`,
        severity: 'error',
      })
    }
  }
  
  return violations
}

/**
 * Check first words of paragraphs
 */
function checkFirstWords(text: string): Violation[] {
  const violations: Violation[] = []
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  const badFirstWords = [
    'additionally',
    'furthermore',
    'moreover',
    'however',
    'therefore',
    'thus',
    'hence',
    'consequently',
    'meanwhile',
    'nevertheless',
    'nonetheless',
    'in',
    'with',
    'by',
    'for',
    'as',
    'when',
    'while',
    'although',
    'because',
    'since',
    'if',
    'unless',
  ]
  
  for (let i = 0; i < paragraphs.length; i++) {
    const firstWord = paragraphs[i].trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
    
    if (badFirstWords.includes(firstWord)) {
      violations.push({
        type: 'bad_first_word',
        location: `Paragraph ${i + 1}`,
        details: `Paragraph starts with "${firstWord}" - should start with noun, verb, or imperative.`,
        severity: 'error',
      })
    }
  }
  
  return violations
}

/**
 * Check for specificity (at least one number or proper noun per N sentences)
 */
function checkSpecificity(text: string, everyNSentences: number): Violation[] {
  const violations: Violation[] = []
  const sentences = splitIntoSentences(text)
  
  // Check in groups of N sentences
  for (let i = 0; i < sentences.length; i += everyNSentences) {
    const group = sentences.slice(i, i + everyNSentences).join(' ')
    
    // Look for numbers (including percentages, times)
    const hasNumber = /\d+/.test(group)
    
    // Look for proper nouns (capitalized words not at sentence start)
    const hasProperNoun = /\s[A-Z][a-z]+/.test(group)
    
    if (!hasNumber && !hasProperNoun && group.length > 50) {
      violations.push({
        type: 'missing_specificity',
        location: `Sentences ${i + 1}-${Math.min(i + everyNSentences, sentences.length)}`,
        details: 'This section lacks specific details (numbers or proper nouns). Add concrete evidence.',
        severity: 'warning',
      })
    }
  }
  
  return violations
}

/**
 * Escape regex special characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Main validation function
 */
export function validateDraft(
  draft: string,
  copyType: string,
  beatSheet?: BeatSheet
): ValidationResult {
  const violations: Violation[] = []
  
  // Get rules
  const rules = getCopyTypeRules(copyType)
  const forbiddenWords = getAllForbiddenTerms(copyType)
  
  // Get constraints from beat sheet if available
  const constraints = beatSheet?.writing_constraints
  const maxSentenceWords = constraints?.max_sentence_words ?? rules.globalMaxSentenceWords
  const maxAdjectives = constraints?.max_adjectives_per_noun ?? rules.maxAdjectivesPerNoun
  const specificityEveryN = constraints?.specific_detail_every_n_sentences ?? rules.requiresSpecificDetailEveryNSentences
  
  // Run all checks
  violations.push(...checkForbiddenWords(draft, forbiddenWords))
  violations.push(...checkForbiddenPatterns(draft, UNIVERSAL_FORBIDDEN_PATTERNS))
  violations.push(...checkEmDashes(draft))
  violations.push(...checkSentenceLengths(draft, maxSentenceWords))
  violations.push(...checkAdjectiveStacking(draft, maxAdjectives))
  violations.push(...checkFirstWords(draft))
  violations.push(...checkSpecificity(draft, specificityEveryN))
  
  // Calculate score
  const errorCount = violations.filter(v => v.severity === 'error').length
  const warningCount = violations.filter(v => v.severity === 'warning').length
  const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5))
  
  return {
    isValid: errorCount === 0,
    violations,
    score,
  }
}

/**
 * Format violations for regeneration prompt
 */
export function formatViolationsForPrompt(violations: Violation[]): string {
  if (violations.length === 0) return ''
  
  const errors = violations.filter(v => v.severity === 'error')
  
  if (errors.length === 0) return ''
  
  const lines = errors.map(v => `- ${v.type}: ${v.details}`)
  
  return `YOUR DRAFT VIOLATED THESE RULES:

${lines.join('\n')}

REWRITE THE DRAFT WITHOUT THESE VIOLATIONS. Do not just fix them - rewrite the sentences properly.`
}

