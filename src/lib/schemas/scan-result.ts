import { z } from 'zod'

/**
 * Scan Result Schema
 * 
 * What we found from the website + what's missing
 */

// A specific fact extracted from the website
export const ExtractedFactSchema = z.object({
  type: z.enum([
    'product_name',
    'price',
    'ingredient',
    'feature',
    'benefit',
    'testimonial',
    'statistic',
    'guarantee',
    'process',
    'story',
    'tip',
  ]),
  content: z.string(),
  source: z.string().describe('Where on the website this was found'),
})

export type ExtractedFact = z.infer<typeof ExtractedFactSchema>

// Gap in information - what we need but don't have
export const InformationGapSchema = z.object({
  type: z.enum([
    'insider_tip',      // No tips or how-to content
    'specific_benefit', // Vague benefits, no specifics
    'social_proof',     // No testimonials or stats
    'differentiator',   // Unclear what makes them different
    'first_action',     // No clear onboarding step
    'objection_handler',// No FAQ or objection handling
    'story',           // No origin or founder story
  ]),
  description: z.string(),
  importance: z.enum(['critical', 'helpful', 'nice_to_have']),
})

export type InformationGap = z.infer<typeof InformationGapSchema>

// The full scan result
export const ScanResultSchema = z.object({
  // Basic company info
  company: z.object({
    name: z.string(),
    what_they_do: z.string(),
    tone_observed: z.string().describe('How they sound on their website - casual, professional, quirky, etc.'),
  }),
  
  // What we found
  facts: z.array(ExtractedFactSchema),
  
  // What we didn't find
  gaps: z.array(InformationGapSchema),
  
  // For the specific email type, what's usable
  usable_for_email: z.array(z.string()).describe('Facts that can be used directly in the email'),
  
  // What we need to ask the user
  questions_needed: z.array(z.string()).describe('Questions we need to ask based on gaps'),
})

export type ScanResult = z.infer<typeof ScanResultSchema>

/**
 * Schema for question that will be asked to user
 */
export const QuestionForUserSchema = z.object({
  id: z.string(),
  question: z.string(),
  context: z.string().describe('Why we\'re asking this, based on what we found/didn\'t find'),
  exampleAnswer: z.string().optional(),
})

export type QuestionForUser = z.infer<typeof QuestionForUserSchema>

/**
 * Schema for the final input packet after questions are answered
 */
export const FinalInputPacketSchema = z.object({
  // From website scan
  company_name: z.string(),
  what_they_do: z.string(),
  tone: z.string(),
  
  // Specific facts from website
  facts: z.array(z.string()),
  
  // From user's form inputs
  email_type: z.string(),
  target_audience: z.string(),
  sender_name: z.string(),
  
  // From user's answers to our questions
  user_provided: z.record(z.string(), z.string()).describe('Question ID -> Answer'),
  
  // Email structure requirements
  structure: z.object({
    maxParagraphs: z.number(),
    hook: z.string(),
    body: z.string(),
    close: z.string(),
  }),
  
  // What to avoid
  antiPatterns: z.array(z.string()),
})

export type FinalInputPacket = z.infer<typeof FinalInputPacketSchema>

