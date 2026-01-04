/**
 * Critic Agent
 * 
 * Evaluates copy against structured rubrics.
 * Different from slop validation - this judges effectiveness and intent.
 * 
 * Inspired by Agentcy's critic agent pattern.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { getEmailRequirements } from './email-requirements'

// ============================================================================
// RUBRIC SCHEMA
// ============================================================================

const CritiqueResultSchema = z.object({
  overall_pass: z.boolean().describe('Does this copy pass quality standards?'),
  score: z.number().describe('Quality score from 1-10'),
  
  rubric_results: z.array(z.object({
    criterion: z.string(),
    passed: z.boolean(),
    feedback: z.string(),
  })),
  
  // If not passing, provide specific regeneration instructions
  regeneration_instructions: z.string().optional().describe(
    'If overall_pass is false, specific instructions for how to fix the copy'
  ),
  
  // What's working well
  strengths: z.array(z.string()),
  
  // What needs improvement (even if passing)
  improvements: z.array(z.string()),
})

export type CritiqueResult = z.infer<typeof CritiqueResultSchema>

// ============================================================================
// EMAIL-SPECIFIC RUBRICS
// ============================================================================

interface RubricCriterion {
  name: string
  question: string
  weight: 'critical' | 'important' | 'nice_to_have'
}

const BASE_RUBRIC: RubricCriterion[] = [
  {
    name: 'Single Clear Purpose',
    question: 'Does this email have ONE clear job, not multiple competing goals?',
    weight: 'critical',
  },
  {
    name: 'Human Voice',
    question: 'Does this sound like a real person wrote it, not AI or a corporate template?',
    weight: 'critical',
  },
  {
    name: 'Specific Details',
    question: 'Does it include specific facts, not vague generalities?',
    weight: 'critical',
  },
  {
    name: 'No Fabrication',
    question: 'Are all claims grounded in the provided information, with no invented stats or stories?',
    weight: 'critical',
  },
  {
    name: 'Clear Action',
    question: 'Is there a single, obvious next step the reader should take?',
    weight: 'important',
  },
  {
    name: 'Appropriate Length',
    question: 'Is it concise without feeling rushed or incomplete?',
    weight: 'important',
  },
  {
    name: 'No Slop Patterns',
    question: 'Is it free of AI clichés like "thrilled", "journey", "dive into", etc.?',
    weight: 'critical',
  },
]

const EMAIL_TYPE_RUBRICS: Record<string, RubricCriterion[]> = {
  welcome: [
    {
      name: 'Confirms Signup',
      question: 'Does it acknowledge what they signed up for without excessive enthusiasm?',
      weight: 'critical',
    },
    {
      name: 'Immediate Value',
      question: 'Does it provide something useful (a tip, fact, or insight) right away?',
      weight: 'critical',
    },
    {
      name: 'First Step',
      question: 'Is there a specific, actionable first step they can take?',
      weight: 'important',
    },
  ],
  abandoned_cart: [
    {
      name: 'Addresses Hesitation',
      question: 'Does it address why they might have hesitated to buy?',
      weight: 'critical',
    },
    {
      name: 'Not Pushy',
      question: 'Is it helpful rather than desperate or guilt-trippy?',
      weight: 'important',
    },
    {
      name: 'Clear Return Path',
      question: 'Is it easy to understand how to complete the purchase?',
      weight: 'important',
    },
  ],
  nurture: [
    {
      name: 'Teaches Something',
      question: 'Does the reader learn something valuable they didn\'t know before?',
      weight: 'critical',
    },
    {
      name: 'Credible Insight',
      question: 'Is the insight backed by specific evidence or reasoning?',
      weight: 'critical',
    },
    {
      name: 'Natural Product Connection',
      question: 'If the product is mentioned, does it flow naturally from the content?',
      weight: 'important',
    },
  ],
  launch: [
    {
      name: 'Clear Announcement',
      question: 'Is it immediately clear what\'s new?',
      weight: 'critical',
    },
    {
      name: 'Why Care',
      question: 'Does it explain why the reader should care about this new thing?',
      weight: 'critical',
    },
    {
      name: 'Availability Clear',
      question: 'Is it clear how and when they can get it?',
      weight: 'important',
    },
  ],
  reengagement: [
    {
      name: 'Reason to Return',
      question: 'Does it give a compelling reason to re-engage?',
      weight: 'critical',
    },
    {
      name: 'Not Guilt-Trippy',
      question: 'Does it avoid "we miss you" or making the reader feel bad?',
      weight: 'important',
    },
    {
      name: 'Easy Action',
      question: 'Is the re-engagement action low-friction?',
      weight: 'important',
    },
  ],
}

// ============================================================================
// CRITIC FUNCTION
// ============================================================================

export async function critiqueCopy(
  copy: string,
  emailType: string,
  context: {
    companyName: string
    targetAudience: string
    userProvidedAnswers: Record<string, string>
  }
): Promise<CritiqueResult> {
  const requirements = getEmailRequirements(emailType)
  const baseRubric = BASE_RUBRIC
  const typeRubric = EMAIL_TYPE_RUBRICS[emailType] || []
  const allCriteria = [...baseRubric, ...typeRubric]

  const rubricText = allCriteria
    .map((c, i) => `${i + 1}. [${c.weight.toUpperCase()}] ${c.name}: ${c.question}`)
    .join('\n')

  const userAnswersText = Object.entries(context.userProvidedAnswers)
    .map(([q, a]) => `- ${q}: "${a}"`)
    .join('\n')

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: CritiqueResultSchema,
    system: `You are evaluating whether an email sounds like Rory Sutherland wrote it.

Rory finds the counterintuitive angle. He notices what others miss. He understands behavioral psychology.

PASS if:
- There's a genuine insight or observation
- It makes you think "huh, that's an interesting way to put it"
- Specific details, not adjectives
- Short. The idea lands.
- Sounds like a smart person noticing something

FAIL if:
- "We're thrilled/excited/delighted" → marketing department
- "Designed with your needs in mind" → says nothing
- "As a valued customer" → presumptuous
- Lists features without insight
- More than 6 sentences
- Sounds like a template
- No specific detail or observation
- Just describes the product without a POV

When it FAILS, quote the bad part and explain what a Rory-style rewrite would do instead.

Example:
BAD: "Our leather conditioner protects your leather goods."
WHY: Just describes the product. No insight.
RORY WOULD: Find what's counterintuitive. "Most leather conditioners leave a film. This one doesn't. Your jacket will feel like leather, not plastic."`,

    prompt: `Evaluate this ${emailType} email copy.

COMPANY: ${context.companyName}
AUDIENCE: ${context.targetAudience}

USER PROVIDED THIS INFO (the copy should use this):
${userAnswersText}

COPY TO EVALUATE:
---
${copy}
---

RUBRIC:
${rubricText}

Evaluate each criterion. The copy FAILS if any CRITICAL criterion fails.

Be specific in your feedback. If you say something fails, quote the problematic text.`,
  })

  return result.object
}

// ============================================================================
// QUICK PASS/FAIL CHECK
// ============================================================================

export async function shouldRegenerateCopy(
  copy: string,
  emailType: string,
  context: {
    companyName: string
    targetAudience: string
    userProvidedAnswers: Record<string, string>
  }
): Promise<{ shouldRegenerate: boolean; instructions?: string; critique?: CritiqueResult }> {
  const critique = await critiqueCopy(copy, emailType, context)

  return {
    shouldRegenerate: !critique.overall_pass,
    instructions: critique.regeneration_instructions,
    critique,
  }
}

