/**
 * Copy Type Rules - Structural requirements enforced per copy type
 * These are NOT suggestions - they are validated and violations cause regeneration
 * 
 * Based on writing school principles:
 * - Show don't tell
 * - Be specific
 * - Cut filler
 * - Active voice
 * - One idea per sentence
 * - Lead with news
 */

// Universal forbidden words/phrases - apply to ALL copy types
export const UNIVERSAL_FORBIDDEN = [
  // Abstract nouns without referent
  'potential',
  'journey',
  'experience',
  'solution',
  'leverage',
  'synergy',
  'optimize',
  'enhance',
  'empower',
  'revolutionize',
  'transform',
  'elevate',
  'streamline',
  'unlock', // THE classic AI word
  'cutting-edge',
  'game-changing',
  'next-level',
  'world-class',
  'best-in-class',
  'state-of-the-art',
  'seamless',
  'seamlessly',
  'effortless',
  'effortlessly',
  'robust',
  'comprehensive',
  'holistic',
  
  // Filler phrases
  'in order to',
  'the fact that',
  'it is important to note',
  'it goes without saying',
  'needless to say',
  'at the end of the day',
  'when all is said and done',
  'all things considered',
  'as a matter of fact',
  
  // Hollow enthusiasm
  'amazing',
  'incredible',
  'awesome',
  'fantastic',
  'unbelievable',
  'mind-blowing',
  'super',
  'epic',
  
  // Weak hedging
  'just',
  'simply',
  'really',
  'very',
  'quite',
  'basically',
  'essentially',
  'actually',
  
  // False empathy
  'no worries',
  "don't worry",
  'rest assured',
  'we understand',
  
  // Robotic transitions
  'furthermore',
  'moreover',
  'additionally',
  'in conclusion',
  'to summarize',
  
  // Salesy urgency (unless explicitly requested)
  'act now',
  "don't miss out",
  'limited time',
  'hurry',
  'before it\'s too late',
]

// Forbidden patterns (regex-matchable)
export const UNIVERSAL_FORBIDDEN_PATTERNS = [
  /you will (be able to|see|notice|experience|feel)/i,
  /you can (easily|quickly|simply)/i,
  /helps you to/i,
  /allows you to/i,
  /enables you to/i,
  /designed to help/i,
  /built to help/i,
  /we (believe|think|feel) that/i,
  /unlock your/i,
  /take your .* to the next level/i,
  /supercharge your/i,
  /turbocharge your/i,
  /—/g, // Em dashes - always replace with periods or commas
]

export interface BeatStructure {
  maxWords: number
  minWords?: number
  requiredElements: ('specific_noun' | 'number' | 'proper_noun' | 'imperative' | 'question')[]
  firstWordType: ('noun' | 'verb' | 'imperative' | 'pronoun' | 'question_word')[]
  forbidden: string[] // Additional forbidden words for this beat type
}

export interface CopyTypeRules {
  type: string
  description: string
  // Length constraints
  maxBeats: number // Maximum number of beats allowed
  maxTotalWords: number // Hard word limit for entire piece
  targetWords: number // Target word count
  globalMaxSentenceWords: number
  maxAdjectivesPerNoun: number
  requiresSpecificDetailEveryNSentences: number
  // Structure
  beatStructures: Record<string, BeatStructure>
  requiredBeatSequence: string[] // The beats that MUST appear in order
  additionalForbidden: string[]
  formatRules: string[]
}

export const COPY_TYPE_RULES: Record<string, CopyTypeRules> = {
  email_sequence: {
    type: 'email_sequence',
    description: 'Transactional or nurture emails',
    // STRICT LIMITS - Emails must be SHORT and FOCUSED
    maxBeats: 4, // hook, problem, solution+proof, cta - THAT'S IT
    maxTotalWords: 120, // Hard limit - forces brevity
    targetWords: 80, // Ideal length
    globalMaxSentenceWords: 15, // Shorter sentences for email
    maxAdjectivesPerNoun: 1,
    requiresSpecificDetailEveryNSentences: 2,
    beatStructures: {
      hook: {
        maxWords: 20,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb', 'pronoun'],
        forbidden: ['hello', 'hi there', 'hey there', 'dear', 'hope this finds', 'have you ever', 'picture this', 'consider this'],
      },
      tension: {
        maxWords: 30,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb', 'pronoun'],
        forbidden: ['here are', 'there are several', 'consider the following'],
      },
      resolution: {
        maxWords: 35,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      action: {
        maxWords: 15,
        requiredElements: ['imperative'],
        firstWordType: ['imperative', 'verb'],
        forbidden: ['click here', 'learn more', 'check it out', 'find out more'],
      },
    },
    requiredBeatSequence: ['hook', 'tension', 'resolution', 'action'], // Story structure: observation → tension → resolution → action
    additionalForbidden: [
      'hope this finds you well',
      'reaching out',
      'touching base',
      'circling back',
      'per my last email',
      'frustrated',
      'struggling',
      'overwhelmed',
      'that\'s where',
      'stands out',
      'why does this matter',
      'curious about',
      'skeptical',
    ],
    formatRules: [
      'Opening line must be statement or imperative, not greeting',
      'Maximum 4 paragraphs total',
      'One point per email - not a blog post',
      'CTA must be single action under 5 words',
    ],
  },

  landing_page: {
    type: 'landing_page',
    description: 'Website landing page or homepage',
    maxBeats: 6,
    maxTotalWords: 300,
    targetWords: 200,
    globalMaxSentenceWords: 18,
    maxAdjectivesPerNoun: 1,
    requiresSpecificDetailEveryNSentences: 2,
    beatStructures: {
      hook: {
        maxWords: 12,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: ['welcome to', 'introducing'],
      },
      problem: {
        maxWords: 25,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      solution: {
        maxWords: 30,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      proof: {
        maxWords: 25,
        requiredElements: ['number', 'proper_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      mechanism: {
        maxWords: 30,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      cta: {
        maxWords: 8,
        requiredElements: ['imperative'],
        firstWordType: ['imperative', 'verb'],
        forbidden: ['get started', 'learn more', 'sign up now'],
      },
    },
    requiredBeatSequence: ['hook', 'problem', 'solution', 'proof', 'cta'],
    additionalForbidden: [
      'helps you',
      'designed for',
      'perfect for',
      'ideal for',
    ],
    formatRules: [
      'First line must state what it does, not what it "helps with"',
      'Every section needs a scannable heading',
      'Front-load paragraphs with the key point',
      'Use specific numbers in proof sections',
    ],
  },

  website_copy: {
    type: 'website_copy',
    description: 'General website pages (about, features, etc.)',
    maxBeats: 6,
    maxTotalWords: 350,
    targetWords: 250,
    globalMaxSentenceWords: 20,
    maxAdjectivesPerNoun: 1,
    requiresSpecificDetailEveryNSentences: 3,
    beatStructures: {
      hook: {
        maxWords: 15,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      problem: {
        maxWords: 30,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      solution: {
        maxWords: 35,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      proof: {
        maxWords: 30,
        requiredElements: ['number'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      cta: {
        maxWords: 10,
        requiredElements: ['imperative'],
        firstWordType: ['imperative', 'verb'],
        forbidden: [],
      },
    },
    requiredBeatSequence: ['hook', 'problem', 'solution', 'proof', 'cta'],
    additionalForbidden: [],
    formatRules: [
      'F-pattern optimization: front-load every paragraph',
      'Use subheadings every 100-150 words',
      'Make scannable with bullets for lists of 3+ items',
    ],
  },

  social_post: {
    type: 'social_post',
    description: 'Social media posts (LinkedIn, X, etc.)',
    maxBeats: 4,
    maxTotalWords: 80,
    targetWords: 50,
    globalMaxSentenceWords: 12,
    maxAdjectivesPerNoun: 1,
    requiresSpecificDetailEveryNSentences: 2,
    beatStructures: {
      hook: {
        maxWords: 10,
        requiredElements: [],
        firstWordType: ['noun', 'verb', 'question_word'],
        forbidden: ['did you know', 'hot take'],
      },
      claim: {
        maxWords: 15,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb', 'pronoun'],
        forbidden: [],
      },
      proof: {
        maxWords: 20,
        requiredElements: ['number'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      cta: {
        maxWords: 8,
        requiredElements: [],
        firstWordType: ['verb', 'question_word'],
        forbidden: ['link in bio'],
      },
    },
    requiredBeatSequence: ['hook', 'claim', 'proof', 'cta'],
    additionalForbidden: [
      'thread',
      'unpopular opinion',
      'hear me out',
      'let that sink in',
    ],
    formatRules: [
      'First line must be complete thought, not teaser',
      'Line breaks are pacing - use intentionally',
      'Close with implication or invitation, not generic CTA',
    ],
  },

  article: {
    type: 'article',
    description: 'Blog posts, essays, long-form content',
    maxBeats: 8,
    maxTotalWords: 800,
    targetWords: 600,
    globalMaxSentenceWords: 22,
    maxAdjectivesPerNoun: 2,
    requiresSpecificDetailEveryNSentences: 3,
    beatStructures: {
      hook: {
        maxWords: 25,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb', 'pronoun'],
        forbidden: [],
      },
      nutgraf: {
        maxWords: 40,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      claim: {
        maxWords: 30,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      proof: {
        maxWords: 50,
        requiredElements: ['number', 'proper_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      kicker: {
        maxWords: 20,
        requiredElements: [],
        firstWordType: ['noun', 'verb', 'pronoun'],
        forbidden: [],
      },
    },
    requiredBeatSequence: ['hook', 'nutgraf', 'claim', 'proof', 'kicker'],
    additionalForbidden: [],
    formatRules: [
      'Nut graf in first 2 paragraphs',
      'Subheads every 250-300 words',
      'Each section must have clear thesis',
    ],
  },

  sales_page: {
    type: 'sales_page',
    description: 'Long-form sales letters, VSL scripts',
    maxBeats: 7,
    maxTotalWords: 500,
    targetWords: 400,
    globalMaxSentenceWords: 18,
    maxAdjectivesPerNoun: 1,
    requiresSpecificDetailEveryNSentences: 2,
    beatStructures: {
      hook: {
        maxWords: 20,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb', 'question_word'],
        forbidden: [],
      },
      problem: {
        maxWords: 40,
        requiredElements: ['specific_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      solution: {
        maxWords: 40,
        requiredElements: ['specific_noun', 'number'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      proof: {
        maxWords: 50,
        requiredElements: ['number', 'proper_noun'],
        firstWordType: ['noun', 'verb'],
        forbidden: [],
      },
      objection: {
        maxWords: 30,
        requiredElements: [],
        firstWordType: ['noun', 'verb', 'question_word'],
        forbidden: [],
      },
      cta: {
        maxWords: 15,
        requiredElements: ['imperative'],
        firstWordType: ['imperative', 'verb'],
        forbidden: [],
      },
    },
    requiredBeatSequence: ['hook', 'problem', 'solution', 'proof', 'objection', 'cta'],
    additionalForbidden: [],
    formatRules: [
      'Headline stack at top',
      'Proof blocks clearly separated',
      'Each claim followed by proof within 2 sentences',
    ],
  },
}

/**
 * Get rules for a copy type, with fallback to website_copy
 */
export function getCopyTypeRules(copyType: string): CopyTypeRules {
  return COPY_TYPE_RULES[copyType] || COPY_TYPE_RULES.website_copy
}

/**
 * Get all forbidden terms for a copy type (universal + type-specific)
 */
export function getAllForbiddenTerms(copyType: string): string[] {
  const rules = getCopyTypeRules(copyType)
  return [...UNIVERSAL_FORBIDDEN, ...rules.additionalForbidden]
}

/**
 * Get beat-specific forbidden terms
 */
export function getBeatForbiddenTerms(copyType: string, beatFunction: string): string[] {
  const rules = getCopyTypeRules(copyType)
  const beatStructure = rules.beatStructures[beatFunction]
  if (!beatStructure) return getAllForbiddenTerms(copyType)
  return [...getAllForbiddenTerms(copyType), ...beatStructure.forbidden]
}

