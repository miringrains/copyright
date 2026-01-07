import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

/**
 * Diagram Generator
 * 
 * Generates Mermaid diagrams and simple SVG charts.
 * Mermaid is preferred for its simplicity and rendering support.
 */

/**
 * Generate a Mermaid diagram for relationships/hierarchies
 */
export async function generateDiagram(
  description: string,
  dataPoints: string[]
): Promise<string> {
  
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    system: `You generate Mermaid diagram code. Output ONLY the Mermaid code, no explanation.

RULES:
- Use simple, clear node labels (2-4 words max)
- Prefer flowchart TD (top-down) or LR (left-right) for most diagrams
- Use mindmap for hierarchies
- Keep it simple: 5-10 nodes maximum
- No styling or colors - keep it clean
- Use descriptive edge labels when needed

SYNTAX REMINDERS:
- Node IDs must not have spaces: use camelCase or underscores
- Edge labels in quotes: A -->|"label"| B
- Subgraphs: subgraph title ... end`,
    prompt: `Create a Mermaid diagram for:
${description}

Elements to include:
${dataPoints.map(d => `- ${d}`).join('\n')}

Output only the Mermaid code.`,
  })

  // Clean up the response - remove any markdown code fences
  let code = result.text.trim()
  code = code.replace(/^```mermaid\n?/i, '')
  code = code.replace(/^```\n?/i, '')
  code = code.replace(/\n?```$/i, '')
  
  return code.trim()
}

/**
 * Generate a Mermaid flowchart for processes
 */
export async function generateFlowchart(
  description: string,
  dataPoints: string[]
): Promise<string> {
  
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    system: `You generate Mermaid flowchart code. Output ONLY the Mermaid code, no explanation.

RULES:
- Use flowchart TD (top-down) for vertical processes
- Use flowchart LR (left-right) for horizontal processes
- Keep node labels short (2-5 words)
- Use decision diamonds for branching: {Decision?}
- Maximum 8-10 nodes
- Clear start and end points
- No styling or colors

SYNTAX:
- Start: flowchart TD or flowchart LR
- Nodes: A[Rectangle] B(Rounded) C{Diamond}
- Arrows: A --> B or A -->|label| B`,
    prompt: `Create a flowchart for:
${description}

Steps/elements:
${dataPoints.map(d => `- ${d}`).join('\n')}

Output only the Mermaid flowchart code.`,
  })

  let code = result.text.trim()
  code = code.replace(/^```mermaid\n?/i, '')
  code = code.replace(/^```\n?/i, '')
  code = code.replace(/\n?```$/i, '')
  
  return code.trim()
}

/**
 * Generate a simple SVG bar chart
 */
export async function generateChart(
  description: string,
  dataPoints: string[]
): Promise<string> {
  
  // Parse data points for chart data
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Extract chart data from the description and data points.
Return as JSON: { "labels": ["A", "B", "C"], "values": [10, 20, 30], "unit": "%" }
If no numeric data, estimate reasonable values.`,
    prompt: `${description}\n\nData: ${dataPoints.join(', ')}`,
  })

  let chartData: { labels: string[]; values: number[]; unit?: string }
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    chartData = jsonMatch ? JSON.parse(jsonMatch[0]) : { labels: [], values: [] }
  } catch {
    chartData = { labels: dataPoints, values: dataPoints.map((_, i) => (i + 1) * 10) }
  }

  return generateBarChartSVG(chartData.labels, chartData.values, chartData.unit)
}

/**
 * Generate a simple bar chart as SVG
 */
function generateBarChartSVG(
  labels: string[],
  values: number[],
  unit: string = ''
): string {
  const width = 400
  const height = 200
  const padding = 40
  const barWidth = (width - padding * 2) / labels.length - 10
  
  const maxValue = Math.max(...values, 1)
  const scale = (height - padding * 2) / maxValue
  
  const bars = labels.map((label, i) => {
    const barHeight = values[i] * scale
    const x = padding + i * (barWidth + 10)
    const y = height - padding - barHeight
    
    return `
    <g>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#333" rx="2"/>
      <text x="${x + barWidth / 2}" y="${height - padding + 15}" text-anchor="middle" font-size="10" fill="#666">${label}</text>
      <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#333">${values[i]}${unit}</text>
    </g>`
  }).join('')

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text { font-family: system-ui, sans-serif; }
  </style>
  ${bars}
</svg>`
}

/**
 * Generate a simple pie chart as SVG
 */
export function generatePieChartSVG(
  labels: string[],
  values: number[]
): string {
  const size = 200
  const radius = 80
  const cx = size / 2
  const cy = size / 2
  
  const total = values.reduce((a, b) => a + b, 0)
  const colors = ['#333', '#666', '#999', '#bbb', '#ddd']
  
  let currentAngle = -90 // Start from top
  
  const slices = values.map((value, i) => {
    const angle = (value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    
    const largeArc = angle > 180 ? 1 : 0
    
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    
    return `<path d="${path}" fill="${colors[i % colors.length]}"/>`
  }).join('')

  const legend = labels.map((label, i) => 
    `<g transform="translate(${size + 10}, ${20 + i * 18})">
      <rect width="12" height="12" fill="${colors[i % colors.length]}"/>
      <text x="16" y="10" font-size="11" fill="#333">${label}</text>
    </g>`
  ).join('')

  return `<svg viewBox="0 0 ${size + 100} ${size}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text { font-family: system-ui, sans-serif; }
  </style>
  ${slices}
  ${legend}
</svg>`
}

