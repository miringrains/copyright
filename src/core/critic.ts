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
    system: `You are an extremely harsh copy editor. Your job is to FAIL emails that sound like AI wrote them.

BE BRUTAL. Most emails should FAIL. Only pass emails that sound genuinely human.

AUTOMATIC FAIL - if you see ANY of these, the email FAILS:
- "designed with your needs in mind" → FAIL
- "suitable for all [X] you rely on" → FAIL  
- "As a valued/loyal customer" → FAIL
- "crafted this experience" → FAIL
- "We're thrilled/excited/delighted" → FAIL
- "[Company] team here" as an opener → FAIL
- "Keep your [X] in top shape" → FAIL
- More than 6 sentences → FAIL
- Generic benefits without specific facts → FAIL
- Anything that sounds like a template → FAIL

WHAT PASSES:
- Reads like a friend texting you
- Has ONE specific fact or insight
- Under 5 sentences
- No selling language
- Uses the user's provided info DIRECTLY (not paraphrased into corporate speak)

When an email FAILS, your regeneration instructions must:
1. Quote the exact bad phrase
2. Explain why it's bad
3. Give a specific rewrite

Example:
BAD: "This product protects your leather goods while leaving no greasy residue behind."
WHY: Generic product-speak. "protects your leather goods" says nothing specific.
FIX: Use a specific fact like application method, drying time, or what makes it different.`,

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

