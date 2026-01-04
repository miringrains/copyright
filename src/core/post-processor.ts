/**
 * Post-Processor
 * 
 * Cleans up generated copy AFTER the AI produces it.
 * This is more reliable than trying to prevent things via prompts.
 */

/**
 * Replace em dashes with proper alternatives
 * Em dashes (—) often look AI-generated. Replace with commas, periods, or colons.
 */
export function removeEmDashes(text: string): string {
  // Replace em dash surrounded by spaces with comma
  let result = text.replace(/\s—\s/g, ', ')
  
  // Replace em dash at end of clause (before period) with period
  result = result.replace(/—\./g, '.')
  
  // Replace double dash with comma
  result = result.replace(/\s--\s/g, ', ')
  
  // Replace remaining em dashes with commas
  result = result.replace(/—/g, ', ')
  
  // Clean up double commas that might result
  result = result.replace(/,\s*,/g, ',')
  
  // Clean up comma before period
  result = result.replace(/,\s*\./g, '.')
  
  return result
}

/**
 * Remove excessive exclamation marks
 * Keep max 1 per piece, preferably 0
 */
export function reduceExclamation(text: string): string {
  const exclamationCount = (text.match(/!/g) || []).length
  
  if (exclamationCount <= 1) return text
  
  // Replace all but the last exclamation with periods
  let count = 0
  return text.replace(/!/g, () => {
    count++
    return count < exclamationCount ? '.' : '!'
  })
}

/**
 * Clean up common AI artifacts that slip through
 */
export function cleanArtifacts(text: string): string {
  let result = text
  
  // Remove "Here's the thing:" type openers
  result = result.replace(/^Here'?s (the thing|what|why)[:\s]/i, '')
  
  // Remove "Let me" openers
  result = result.replace(/^Let me (tell you|explain|break)[^.]*\.\s*/i, '')
  
  // Remove trailing "Happy [X]ing!"
  result = result.replace(/\s*Happy \w+ing!?\s*$/i, '')
  
  // Remove "No X, no Y, just Z" pattern - rewrite as simple statement
  // This is tricky so we'll just flag it
  
  return result.trim()
}

/**
 * Main post-processing function
 * Run this on all generated copy before displaying
 */
export function postProcess(text: string): string {
  let result = text
  
  result = removeEmDashes(result)
  result = reduceExclamation(result)
  result = cleanArtifacts(result)
  
  return result
}

