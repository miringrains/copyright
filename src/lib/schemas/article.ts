/**
 * Article Generator Schemas
 * 
 * Types for the journalistic article pipeline
 */

import { z } from 'zod'

// ============================================================================
// SOURCE TYPES
// ============================================================================

export const SourceSchema = z.object({
  url: z.string().describe('URL of the source'),
  title: z.string().describe('Title or description of the source'),
  content: z.string().optional().describe('Relevant excerpt or full content'),
  type: z.enum(['article', 'study', 'report', 'data', 'quote', 'other']).describe('Type of source'),
})

export type Source = z.infer<typeof SourceSchema>

// ============================================================================
// TOPIC SUGGESTION
// ============================================================================

export const TopicSuggestionSchema = z.object({
  title: z.string().describe('Proposed article title'),
  angle: z.string().describe('The specific angle or perspective'),
  why_now: z.string().describe('Why this topic is relevant now - seed for nut graf'),
  target_keyword: z.string().describe('Primary keyword to target'),
  estimated_search_volume: z.enum(['high', 'medium', 'low']).describe('Rough estimate of interest'),
})

export type TopicSuggestion = z.infer<typeof TopicSuggestionSchema>

// ============================================================================
// BODY BLOCK TYPES
// ============================================================================

export const BodyBlockTypeSchema = z.enum([
  'explanatory',  // Answers "how does this work?"
  'context',      // Answers "has this happened before?"
  'attribution',  // Answers "who says so?" - source first, then claim
  'contrast',     // Answers "what's the other side?"
  'scene',        // Specific observable detail (for features)
])

export type BodyBlockType = z.infer<typeof BodyBlockTypeSchema>

export const BodyBlockSchema = z.object({
  type: BodyBlockTypeSchema,
  question_answered: z.string().describe('The reader question this block answers'),
  content: z.string().describe('The paragraph content'),
  source_citation: z.string().optional().describe('URL to cite if this contains a factual claim'),
  needs_image: z.boolean().optional().describe('Whether this section would benefit from an image'),
})

export type BodyBlock = z.infer<typeof BodyBlockSchema>

// ============================================================================
// JOURNALISTIC OUTLINE
// ============================================================================

export const ArticleOutlineSchema = z.object({
  // The lede: 1-2 sentences, most important fact or tension
  lede: z.string().describe('1-2 sentences stating the most important fact or tension. Plain language.'),
  
  // The nut graf: why this story exists now
  nut_graf: z.string().describe('Paragraph explaining why this story matters NOW. Establishes relevance and stakes.'),
  
  // Framing bridge: transition to body
  framing_bridge: z.string().describe('Short paragraph transitioning from abstract importance to concrete detail.'),
  
  // Modular body blocks
  body_blocks: z.array(BodyBlockSchema).describe('3-6 blocks, each answering one reader question'),
  
  // Counterbalance: opposing views or limitations
  counterbalance: z.string().describe('1-2 paragraphs acknowledging opposing views or limitations. Signals intellectual honesty.'),
  
  // Kicker: the close
  kicker: z.string().describe('1-2 sentences. Returns to opening tension, highlights implication, or looks forward. NOT a summary.'),
})

export type ArticleOutline = z.infer<typeof ArticleOutlineSchema>

// ============================================================================
// IMAGE SPECIFICATION
// ============================================================================

export const ImageSpecSchema = z.object({
  placement: z.enum(['after_lede', 'in_body', 'before_kicker']).describe('Where in the article'),
  prompt: z.string().describe('Detailed prompt for image generation'),
  alt_text: z.string().describe('Accessibility alt text'),
  style: z.enum(['photorealistic', 'illustration', 'infographic', 'diagram']),
  body_block_index: z.number().optional().describe('If in_body, which block index'),
})

export type ImageSpec = z.infer<typeof ImageSpecSchema>

// ============================================================================
// GENERATED ARTICLE
// ============================================================================

export const GeneratedArticleSchema = z.object({
  // Metadata
  title: z.string(),
  meta_description: z.string().describe('SEO meta description, 150-160 chars'),
  target_keyword: z.string(),
  
  // Structure
  outline: ArticleOutlineSchema,
  
  // Content
  markdown: z.string().describe('Full article in markdown with image placeholders'),
  
  // Assets
  images: z.array(z.object({
    id: z.string(),
    url: z.string(),
    alt_text: z.string(),
    placement: z.string(),
  })),
  
  // Citations
  sources_cited: z.array(z.object({
    url: z.string(),
    title: z.string(),
    cited_in: z.string().describe('Which section this was cited in'),
  })),
  
  // Stats
  word_count: z.number(),
  reading_time_minutes: z.number(),
})

export type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>

// ============================================================================
// ARTICLE INPUT
// ============================================================================

export const ArticleInputSchema = z.object({
  // Required
  websiteUrl: z.string().describe('The user\'s website to understand industry/context'),
  
  // Optional
  sources: z.array(SourceSchema).optional().default([]).describe('User-provided research and sources'),
  blogUrl: z.string().optional().describe('Blog URL if different from main site'),
  topic: z.string().optional().describe('Specific topic if user has one'),
  targetKeywords: z.array(z.string()).optional().describe('User-provided keywords'),
  additionalContext: z.string().optional().describe('Extra context or angle from user'),
  
  // Auto-research flag
  autoResearch: z.boolean().optional().default(true).describe('Auto-discover sources from web search'),
  
  // Preferences
  wordCountTarget: z.number().optional().default(1500).describe('Target word count'),
  imageCount: z.number().optional().default(2).describe('Number of images to generate'),
  tone: z.enum(['formal', 'conversational', 'technical']).optional().default('conversational'),
})

export type ArticleInput = z.infer<typeof ArticleInputSchema>

// ============================================================================
// KEYWORD RESEARCH RESULT
// ============================================================================

export const KeywordResearchSchema = z.object({
  primary_keyword: z.string(),
  secondary_keywords: z.array(z.string()),
  questions_to_answer: z.array(z.string()),
  competitor_angles: z.array(z.string()),
})

export type KeywordResearch = z.infer<typeof KeywordResearchSchema>

// ============================================================================
// INDUSTRY CONTEXT
// ============================================================================

export const IndustryContextSchema = z.object({
  industry: z.string(),
  company_focus: z.string(),
  target_audience: z.string(),
  existing_blog_topics: z.array(z.string()),
  content_gaps: z.array(z.string()),
  tone_observed: z.enum(['formal', 'casual', 'technical', 'friendly', 'authoritative']),
})

export type IndustryContext = z.infer<typeof IndustryContextSchema>

