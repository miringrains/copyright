import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

/**
 * Visual Opportunity Analyzer
 * 
 * Analyzes chapter content to find places where a visual would genuinely help
 * the reader understand the content better—not just decorate.
 */

export type VisualType = 'table' | 'diagram' | 'flowchart' | 'illustration' | 'chart'

export interface VisualOpportunity {
  type: VisualType
  location: {
    afterParagraph: number  // 0-indexed paragraph number
    contextSnippet: string  // Text snippet for reference
  }
  description: string       // What the visual should show
  dataPoints: string[]      // Specific data to include
  reasoning: string         // Why this visual helps
  priority: 'high' | 'medium' | 'low'
}

const VisualOpportunitySchema = z.object({
  opportunities: z.array(z.object({
    type: z.enum(['table', 'diagram', 'flowchart', 'illustration', 'chart']),
    afterParagraph: z.number(),
    contextSnippet: z.string(),
    description: z.string(),
    dataPoints: z.array(z.string()),
    reasoning: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
})

/**
 * Analyze chapter content for visual opportunities
 */
export async function analyzeForVisuals(
  chapterContent: string,
  chapterTitle: string,
  maxVisuals: number = 3
): Promise<VisualOpportunity[]> {
  
  // Split into paragraphs for reference
  const paragraphs = chapterContent
    .split(/\n\n+/)
    .filter(p => p.trim().length > 50)
  
  if (paragraphs.length < 2) {
    return [] // Too short for visuals
  }

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: VisualOpportunitySchema,
    system: `You are an expert editor identifying where visuals would genuinely help readers understand content.

YOUR JOB: Find 0-${maxVisuals} places where a visual would add real value.

GOOD CANDIDATES:
- Comparisons between 3+ things with multiple properties → TABLE
- Step-by-step processes with clear stages → FLOWCHART  
- Hierarchies, categories, or relationships → DIAGRAM
- Proportions, percentages, or quantities → CHART
- Physical objects or scenes that are hard to describe → ILLUSTRATION

SKIP IF:
- The text already explains it clearly
- A visual would be redundant
- The concept is too abstract to visualize meaningfully
- Adding a visual would interrupt the reading flow

QUALITY GATE:
- Only suggest visuals that ADD information
- Be specific about what the visual should show
- Prefer fewer, better visuals over many mediocre ones
- If nothing truly needs a visual, return an empty array

For each opportunity, specify:
- type: table | diagram | flowchart | illustration | chart
- afterParagraph: which paragraph number (0-indexed) it should follow
- contextSnippet: a short quote from that paragraph
- description: exactly what the visual should show
- dataPoints: specific data/labels to include
- reasoning: why this helps the reader
- priority: high (essential), medium (helpful), low (nice-to-have)`,
    prompt: `CHAPTER: "${chapterTitle}"

CONTENT (${paragraphs.length} paragraphs):
${paragraphs.map((p, i) => `[${i}] ${p.slice(0, 300)}${p.length > 300 ? '...' : ''}`).join('\n\n')}

Identify 0-${maxVisuals} visual opportunities. Only include visuals that genuinely add value.`,
  })

  return result.object.opportunities.map(opp => ({
    type: opp.type,
    location: {
      afterParagraph: opp.afterParagraph,
      contextSnippet: opp.contextSnippet,
    },
    description: opp.description,
    dataPoints: opp.dataPoints,
    reasoning: opp.reasoning,
    priority: opp.priority,
  }))
}

/**
 * Filter opportunities to only high-value ones
 */
export function filterHighValue(
  opportunities: VisualOpportunity[],
  maxCount: number = 2
): VisualOpportunity[] {
  // Sort by priority
  const sorted = [...opportunities].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
  
  // Take top N
  return sorted.slice(0, maxCount)
}

