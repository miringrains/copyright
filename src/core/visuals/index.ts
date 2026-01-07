/**
 * Visual Generation System
 * 
 * Exports all visual generation functionality for book chapters.
 */

export { analyzeForVisuals, filterHighValue, type VisualOpportunity, type VisualType } from './analyzer'
export { generateVisual, generateAllVisuals, injectVisuals, type GeneratedVisual, type VisualStyle } from './generator'
export { generateTable, extractTableFromText } from './table-gen'
export { generateDiagram, generateFlowchart, generateChart, generatePieChartSVG } from './diagram-gen'
export { generateIllustration, generatePlaceholder } from './illustration-gen'

