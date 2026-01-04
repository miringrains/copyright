/**
 * Question Generator
 * 
 * Takes scan results + email type and generates specific questions.
 * Questions are grounded in what we found (or didn't find) on the website.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { getEmailRequirements, type EmailRequirement } from './email-requirements'
import type { ScanResult, QuestionForUser } from '@/lib/schemas/scan-result'

const GeneratedQuestionsSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    context: z.string(),
    exampleAnswer: z.string(),
  })),
})

/**
 * Generate context-aware questions based on:
 * 1. What email type we're writing
 * 2. What we found on the website
 * 3. What's missing (gaps)
 */
export async function generateQuestions(
  scanResult: ScanResult,
  emailType: string,
  formData: Record<string, string>
): Promise<QuestionForUser[]> {
  const requirements = getEmailRequirements(emailType)
  
  if (!requirements) {
    // Fallback to generic questions if email type not found
    return getGenericQuestions(scanResult)
  }
  
  // Check if we already have what we need from the website
  const hasCoreNeed = checkIfCoreNeedMet(scanResult, requirements)
  
  if (hasCoreNeed) {
    // We have enough from the website - minimal questions
    return getMinimalQuestions(scanResult, requirements)
  }
  
  // We need to ask for the core content
  return generateContextualQuestions(scanResult, requirements, formData)
}

/**
 * Check if the website provided enough for the email's core need
 */
function checkIfCoreNeedMet(scanResult: ScanResult, requirements: EmailRequirement): boolean {
  // Look for specific types of facts based on email type
  switch (requirements.id) {
    case 'welcome':
      // Need an insider tip or useful how-to
      return scanResult.facts.some(f => f.type === 'tip' || f.type === 'process')
    
    case 'abandoned_cart':
      // Need objection handling or guarantee
      return scanResult.facts.some(f => f.type === 'guarantee' || f.type === 'testimonial')
    
    case 'nurture':
      // Need educational content or stats
      return scanResult.facts.some(f => f.type === 'statistic' || f.type === 'process')
    
    case 'launch':
      // Need product details
      return scanResult.facts.filter(f => f.type === 'feature' || f.type === 'benefit').length >= 2
    
    case 'reengagement':
      // Need something new or changed
      return scanResult.facts.some(f => f.type === 'feature' || f.type === 'benefit')
    
    default:
      return false
  }
}

/**
 * Minimal questions when website provided enough
 */
function getMinimalQuestions(
  scanResult: ScanResult,
  requirements: EmailRequirement
): QuestionForUser[] {
  // Just confirm or ask for one clarification
  return [{
    id: 'confirm_approach',
    question: `Based on your website, we found: "${scanResult.usable_for_email[0] || 'some product info'}". Is there anything more specific you'd like to highlight in this ${requirements.label} email?`,
    context: 'We have enough to work with, but you can add more detail',
    exampleAnswer: 'Use that, but also mention our 30-day guarantee.',
  }]
}

/**
 * Generic fallback questions
 */
function getGenericQuestions(scanResult: ScanResult): QuestionForUser[] {
  return [
    {
      id: 'main_message',
      question: 'What\'s the one thing you want readers to take away from this email?',
      context: 'This becomes the focus of the entire email',
      exampleAnswer: 'That our cleaner works on grease that other cleaners can\'t handle.',
    },
    {
      id: 'specific_detail',
      question: 'Can you share one specific detail, tip, or fact that would make this feel useful?',
      context: 'Specific details make emails feel human, not AI-generated',
      exampleAnswer: 'Let it sit for 30 seconds before wiping - the surfactants need time.',
    },
  ]
}

/**
 * Generate questions using AI based on context
 */
async function generateContextualQuestions(
  scanResult: ScanResult,
  requirements: EmailRequirement,
  formData: Record<string, string>
): Promise<QuestionForUser[]> {
  const prompt = `You are helping craft an email for a company. Based on what we know and don't know, generate 2-3 specific questions to ask.

COMPANY: ${scanResult.company.name}
WHAT THEY DO: ${scanResult.company.what_they_do}
EMAIL TYPE: ${requirements.label} - ${requirements.description}

CORE NEED FOR THIS EMAIL:
${requirements.coreNeed}

WHAT WE FOUND ON THEIR WEBSITE:
${scanResult.facts.length > 0 
  ? scanResult.facts.map(f => `- [${f.type}] ${f.content}`).join('\n')
  : '- Nothing specific found'
}

GAPS (what's missing):
${scanResult.gaps.map(g => `- [${g.importance}] ${g.type}: ${g.description}`).join('\n')}

SUGGESTED QUESTIONS (use as inspiration, adapt to context):
${requirements.questions.map(q => `- ${q.question} (e.g., "${q.exampleAnswer}")`).join('\n')}

TARGET AUDIENCE: ${formData.target_audience || 'Not specified'}

Generate 2-3 questions that:
1. Are grounded in what we found or didn't find (reference specific gaps)
2. Produce answers that become the EMAIL CONTENT (not background info)
3. Can be answered in 1-2 sentences
4. Are specific to this company, not generic

DON'T ask about:
- Brand voice or tone (we observed it from the website)
- Target audience demographics (we have that)
- General company info (we have that)

DO ask about:
- Insider knowledge they have
- Specific tips or facts
- What makes them different
- What customers ask about most`

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: GeneratedQuestionsSchema,
    prompt,
  })

  return result.object.questions.map(q => ({
    id: q.id,
    question: q.question,
    context: q.context,
    exampleAnswer: q.exampleAnswer,
  }))
}

/**
 * Quick questions for common email types without AI call
 */
export function getQuickQuestions(emailType: string): QuestionForUser[] {
  const requirements = getEmailRequirements(emailType)
  if (!requirements) return []
  
  return requirements.questions.map(q => ({
    id: q.id,
    question: q.question,
    context: q.why,
    exampleAnswer: q.exampleAnswer,
  }))
}

