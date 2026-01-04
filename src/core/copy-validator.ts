/**
 * Copy Validator
 * 
 * Checks generated copy for AI slop patterns.
 * If violations found, triggers regeneration.
 */

export interface Violation {
  type: 'forbidden_word' | 'forbidden_pattern' | 'structure' | 'empty_enthusiasm'
  details: string
  severity: 'critical' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  violations: Violation[]
  score: number // 0-100, higher is better
}

// Words that scream "AI wrote this"
const FORBIDDEN_WORDS = [
  // Empty enthusiasm
  'thrilled', 'excited', 'delighted', 'honored', 'proud',
  // Corporate speak
  'leverage', 'synergy', 'optimize', 'streamline', 'empower',
  'revolutionize', 'transform', 'elevate', 'unlock', 'supercharge',
  // Vague descriptors
  'amazing', 'incredible', 'fantastic', 'wonderful', 'awesome',
  'game-changing', 'cutting-edge', 'best-in-class', 'world-class',
  // Overused transitions
  'furthermore', 'moreover', 'additionally', 'consequently',
  // AI favorites
  'delve', 'dive into', 'embark', 'journey', 'adventure',
  'realm', 'landscape', 'ecosystem', 'paradigm',
  // Hollow phrases
  'at the end of the day', 'when all is said and done',
  'it goes without saying', 'needless to say',
]

// Patterns that indicate AI slop
const FORBIDDEN_PATTERNS = [
  // Empty openers
  /^(we're excited|we are excited|we're thrilled|we are thrilled)/i,
  /^(welcome to|greetings|hello there|hey there)/i,
  /^(did you know|have you ever wondered|imagine if)/i,
  
  // Generic closers
  /(don't hesitate to|feel free to|please don't hesitate)/i,
  /(reach out to us|contact us today|get in touch)/i,
  /(looking forward to|can't wait to|excited to)/i,
  /(best regards|warm regards|kind regards|sincerely)/i,
  /(the .+ team|your friends at|from everyone at)/i,
  
  // AI structure patterns
  /no [a-z]+[,.]?\s*no [a-z]+[,.]?\s*(just|only)/i,  // "No X, no Y, just Z"
  /most [a-z]+ (miss|overlook|forget|ignore) this/i, // "Most X miss this"
  /here'?s (the thing|what|why)/i,                   // "Here's the thing"
  /let me (tell you|explain|break)/i,                // "Let me tell you"
  /the (truth|reality|fact) is/i,                    // "The truth is"
  /but wait,?\s*there'?s more/i,                     // Infomercial
  /what if I told you/i,                             // Matrix-style
  /spoiler alert/i,
  /plot twist/i,
  /the secret is/i,
  /the best part\??/i,
  /but here'?s the (kicker|catch|twist)/i,
  
  // Fabrication patterns
  /last night,?\s*(I|we)/i,                          // Fabricated narrative
  /yesterday,?\s*(I|we)/i,                           // Fabricated narrative
  /the other day,?\s*(I|we)/i,                       // Fabricated narrative
  /I (noticed|realized|discovered)/i,                // Personal anecdote
  
  // Hollow claims
  /\d+% (more|better|faster|easier)/i,               // Unless from source
  /studies show/i,                                    // Vague attribution
  /experts agree/i,                                   // Vague attribution
  /scientifically proven/i,                           // Usually not
]

// Email-type specific patterns to avoid
const EMAIL_SPECIFIC_FORBIDDEN: Record<string, RegExp[]> = {
  welcome: [
    /welcome to the family/i,
    /glad you're here/i,
    /your journey begins/i,
    /explore our/i,
    /discover the world of/i,
  ],
  abandoned_cart: [
    /did you forget/i,
    /your cart misses you/i,
    /still thinking about it/i,
    /don't let this slip away/i,
    /limited time/i,
    /hurry before/i,
  ],
  nurture: [
    /did you know\?/i,
    /fun fact/i,
    /experts say/i,
    /research shows/i,
  ],
  launch: [
    /we're excited to announce/i,
    /introducing our revolutionary/i,
    /you asked, we listened/i,
    /the wait is over/i,
  ],
  reengagement: [
    /we miss you/i,
    /where have you been/i,
    /is this goodbye/i,
    /last chance/i,
    /we noticed you haven't/i,
  ],
}

/**
 * Validate copy against slop patterns
 */
export function validateCopy(copy: string, emailType?: string): ValidationResult {
  const violations: Violation[] = []
  const lowerCopy = copy.toLowerCase()

  // Check forbidden words
  for (const word of FORBIDDEN_WORDS) {
    if (lowerCopy.includes(word.toLowerCase())) {
      violations.push({
        type: 'forbidden_word',
        details: `Contains "${word}"`,
        severity: 'critical',
      })
    }
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(copy)) {
      violations.push({
        type: 'forbidden_pattern',
        details: `Matches pattern: ${pattern.source}`,
        severity: 'critical',
      })
    }
  }

  // Check email-specific patterns
  if (emailType && EMAIL_SPECIFIC_FORBIDDEN[emailType]) {
    for (const pattern of EMAIL_SPECIFIC_FORBIDDEN[emailType]) {
      if (pattern.test(copy)) {
        violations.push({
          type: 'forbidden_pattern',
          details: `Email type "${emailType}" should not contain: ${pattern.source}`,
          severity: 'critical',
        })
      }
    }
  }

  // Check for empty enthusiasm (exclamation marks)
  const exclamationCount = (copy.match(/!/g) || []).length
  if (exclamationCount > 2) {
    violations.push({
      type: 'empty_enthusiasm',
      details: `Too many exclamation marks (${exclamationCount})`,
      severity: 'warning',
    })
  }

  // Check for em dashes (AI loves these)
  const emDashCount = (copy.match(/—|--/g) || []).length
  if (emDashCount > 2) {
    violations.push({
      type: 'structure',
      details: `Too many em dashes (${emDashCount})`,
      severity: 'warning',
    })
  }

  // Calculate score
  const criticalCount = violations.filter(v => v.severity === 'critical').length
  const warningCount = violations.filter(v => v.severity === 'warning').length
  const score = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 5))

  return {
    isValid: criticalCount === 0,
    violations,
    score,
  }
}

/**
 * Quick check - just returns boolean
 */
export function isValidCopy(copy: string, emailType?: string): boolean {
  return validateCopy(copy, emailType).isValid
}

/**
 * Get violation summary for prompt injection
 */
export function getViolationSummary(result: ValidationResult): string {
  if (result.isValid) return 'No violations found.'
  
  return result.violations
    .filter(v => v.severity === 'critical')
    .slice(0, 5)
    .map(v => `- ${v.details}`)
    .join('\n')
}

