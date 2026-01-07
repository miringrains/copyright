import { VisualOpportunity, VisualType } from './analyzer'
import { generateTable } from './table-gen'
import { generateDiagram, generateFlowchart, generateChart } from './diagram-gen'
import { generateIllustration } from './illustration-gen'

/**
 * Visual Generator Router
 * 
 * Routes visual opportunities to the appropriate generator
 * and returns the generated content.
 */

export interface GeneratedVisual {
  type: VisualType
  format: 'markdown' | 'svg' | 'mermaid' | 'image_url'
  content: string           // The actual visual content or URL
  caption?: string          // Optional caption
  alt?: string              // Alt text for accessibility
  afterParagraph: number    // Where to inject
}

/**
 * Generate a visual from an opportunity
 */
export async function generateVisual(
  opportunity: VisualOpportunity,
  style: VisualStyle = 'minimal'
): Promise<GeneratedVisual> {
  
  const { type, location, description, dataPoints } = opportunity
  
  switch (type) {
    case 'table':
      return {
        type: 'table',
        format: 'markdown',
        content: await generateTable(description, dataPoints),
        afterParagraph: location.afterParagraph,
      }
    
    case 'diagram':
      return {
        type: 'diagram',
        format: 'mermaid',
        content: await generateDiagram(description, dataPoints),
        afterParagraph: location.afterParagraph,
      }
    
    case 'flowchart':
      return {
        type: 'flowchart',
        format: 'mermaid',
        content: await generateFlowchart(description, dataPoints),
        afterParagraph: location.afterParagraph,
      }
    
    case 'chart':
      return {
        type: 'chart',
        format: 'svg',
        content: await generateChart(description, dataPoints),
        afterParagraph: location.afterParagraph,
      }
    
    case 'illustration':
      const imageUrl = await generateIllustration(description, style)
      return {
        type: 'illustration',
        format: 'image_url',
        content: imageUrl,
        alt: description,
        afterParagraph: location.afterParagraph,
      }
    
    default:
      throw new Error(`Unknown visual type: ${type}`)
  }
}

/**
 * Generate all visuals for a chapter
 */
export async function generateAllVisuals(
  opportunities: VisualOpportunity[],
  style: VisualStyle = 'minimal'
): Promise<GeneratedVisual[]> {
  const results: GeneratedVisual[] = []
  
  for (const opp of opportunities) {
    try {
      const visual = await generateVisual(opp, style)
      results.push(visual)
    } catch (error) {
      console.error(`[Visual Generator] Failed to generate ${opp.type}:`, error)
      // Continue with other visuals
    }
  }
  
  return results
}

export type VisualStyle = 'minimal' | 'flat' | 'technical' | 'sketch'

/**
 * Inject visuals into chapter content
 */
export function injectVisuals(
  chapterContent: string,
  visuals: GeneratedVisual[]
): string {
  // Split into paragraphs
  const paragraphs = chapterContent.split(/\n\n+/)
  
  // Sort visuals by position (descending) to inject from bottom up
  const sorted = [...visuals].sort((a, b) => b.afterParagraph - a.afterParagraph)
  
  for (const visual of sorted) {
    const insertIndex = Math.min(visual.afterParagraph + 1, paragraphs.length)
    const visualContent = formatVisualForMarkdown(visual)
    paragraphs.splice(insertIndex, 0, visualContent)
  }
  
  return paragraphs.join('\n\n')
}

/**
 * Format a visual for Markdown output
 */
function formatVisualForMarkdown(visual: GeneratedVisual): string {
  switch (visual.format) {
    case 'markdown':
      return visual.content
    
    case 'mermaid':
      return `\`\`\`mermaid\n${visual.content}\n\`\`\``
    
    case 'svg':
      // For SVG, we'd typically save to file and reference
      return `<!-- SVG Chart -->\n${visual.content}`
    
    case 'image_url':
      const alt = visual.alt || 'Illustration'
      const caption = visual.caption || ''
      return `![${alt}](${visual.content})${caption ? `\n*${caption}*` : ''}`
    
    default:
      return visual.content
  }
}

