import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

/**
 * Table Generator
 * 
 * Generates clean Markdown tables from descriptions and data points.
 */

const TableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
})

/**
 * Generate a Markdown table from a description
 */
export async function generateTable(
  description: string,
  dataPoints: string[]
): Promise<string> {
  
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: TableSchema,
    system: `You create clean, well-structured data tables.

RULES:
- Use concise headers (2-4 words max)
- Keep cell content brief and scannable
- Align data logically (numbers right, text left conceptually)
- Include all relevant data points provided
- Add any obvious additional data that would complete the comparison
- Maximum 5-6 columns, 8-10 rows`,
    prompt: `Create a table for:
${description}

Data points to include:
${dataPoints.map(d => `- ${d}`).join('\n')}

Return the table structure with headers and rows.`,
  })

  return formatMarkdownTable(result.object.headers, result.object.rows)
}

/**
 * Format headers and rows into Markdown table
 */
function formatMarkdownTable(headers: string[], rows: string[][]): string {
  if (headers.length === 0) return ''
  
  // Header row
  const headerRow = `| ${headers.join(' | ')} |`
  
  // Separator row
  const separator = `| ${headers.map(() => '---').join(' | ')} |`
  
  // Data rows
  const dataRows = rows.map(row => {
    // Ensure row has same number of cells as headers
    const paddedRow = [...row]
    while (paddedRow.length < headers.length) {
      paddedRow.push('')
    }
    return `| ${paddedRow.slice(0, headers.length).join(' | ')} |`
  })
  
  return [headerRow, separator, ...dataRows].join('\n')
}

/**
 * Extract table data from existing text (for conversion)
 */
export async function extractTableFromText(
  text: string
): Promise<{ headers: string[]; rows: string[][] } | null> {
  
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      hasTableData: z.boolean(),
      headers: z.array(z.string()).optional(),
      rows: z.array(z.array(z.string())).optional(),
    }),
    system: `Analyze text for data that could be presented as a table.
If the text contains comparisons, lists with properties, or structured data, extract it.
If there's no clear tabular data, set hasTableData to false.`,
    prompt: `Extract any tabular data from this text:

${text}`,
  })

  if (!result.object.hasTableData || !result.object.headers) {
    return null
  }

  return {
    headers: result.object.headers,
    rows: result.object.rows || [],
  }
}

