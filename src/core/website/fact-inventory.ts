/**
 * Fact Inventory System
 * 
 * The critical anti-hallucination mechanism.
 * Extracts ONLY explicit facts from the user's prompt.
 * Flags what we DON'T know so the model can't invent it.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { FactInventorySchema, type FactInventory } from '@/lib/schemas/website'

// ============================================================================
// FACT EXTRACTION
// ============================================================================

const FACT_EXTRACTION_SYSTEM = `You extract EXPLICIT facts from a user's description of their business/client.

YOUR JOB IS CRITICAL: Only extract what is EXPLICITLY stated. Never infer, assume, or embellish.

RULES:
1. If they say "20 years experience" → extract "20 years experience"
2. If they DON'T mention sales volume → flag it as unknown
3. If they say "specializes in historic homes" → extract that exact specialization
4. Never round up, never add context, never assume

CATEGORIES:
- personal: Background, years of experience, personal history
- credentials: Education, certifications, licenses, degrees
- specializations: Areas of focus, neighborhoods, property types
- achievements: ONLY specific numbers they provide (sales, awards, etc.)
- location: Geographic areas mentioned

GAPS TO FLAG:
If the user did NOT provide:
- Sales volume/transaction count → flag "no sales volume provided"
- Days on market stats → flag "no days-on-market stats"
- Specific property sales → flag "no specific property sales mentioned"
- Awards or rankings → flag "no awards/rankings mentioned"
- Testimonials/social proof → flag "no testimonials provided"

FOCUS AREAS:
When stats are missing, suggest what to emphasize instead:
- If no sales volume → "focus on market expertise and local knowledge"
- If no credentials → "focus on experience and specializations"
- If no achievements → "focus on approach and service style"

BE STRICT. If you can't point to the exact words in the prompt, don't include it.`

/**
 * Extract facts from user prompt into a constrained inventory
 */
export async function buildFactInventory(
  userPrompt: string,
  onProgress?: (message: string) => void
): Promise<FactInventory> {
  onProgress?.('Extracting facts from your description...')
  
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: FactInventorySchema,
    system: FACT_EXTRACTION_SYSTEM,
    prompt: `Extract ONLY explicit facts from this description. Be strict - if it's not explicitly stated, don't include it.

USER PROMPT:
"${userPrompt}"

Extract facts into categories, flag what's missing, and suggest focus areas.`,
  })

  onProgress?.(`Found ${result.object.allFactsList.length} explicit facts, ${result.object.unknownGaps.length} gaps identified`)
  
  return result.object
}

/**
 * Format fact inventory for injection into generation prompts
 * This is what constrains the model to only use these facts
 */
export function formatFactConstraint(inventory: FactInventory): string {
  const factsList = inventory.allFactsList.length > 0
    ? inventory.allFactsList.map(f => `- ${f}`).join('\n')
    : '- No specific facts provided'

  const gapsList = inventory.unknownGaps.length > 0
    ? inventory.unknownGaps.map(g => `- ${g}`).join('\n')
    : '- None identified'

  const focusList = inventory.focusAreas.length > 0
    ? inventory.focusAreas.map(f => `- ${f}`).join('\n')
    : '- General expertise and service'

  return `═══════════════════════════════════════════════════════════════
FACT CONSTRAINT - YOU MAY ONLY USE THESE FACTS. DO NOT INVENT ANYTHING.
═══════════════════════════════════════════════════════════════

KNOWN FACTS (use these):
${factsList}

GAPS - DO NOT FILL THESE IN OR MAKE UP DATA:
${gapsList}

WHEN STATS ARE MISSING, FOCUS ON:
${focusList}

CRITICAL: If you cannot trace a claim back to the facts above, DO NOT include it.
Never invent numbers, credentials, property sales, or achievements.
═══════════════════════════════════════════════════════════════`
}

/**
 * Validate that generated copy only uses facts from inventory
 * Returns violations if any invented facts are detected
 */
export async function validateAgainstInventory(
  generatedCopy: string,
  inventory: FactInventory,
  onProgress?: (message: string) => void
): Promise<{
  valid: boolean
  violations: string[]
}> {
  onProgress?.('Validating copy against fact inventory...')

  const ValidationSchema = z.object({
    valid: z.boolean().describe('True if copy only uses provided facts'),
    violations: z.array(z.object({
      claim: z.string().describe('The problematic claim in the copy'),
      issue: z.string().describe('Why this is a violation'),
    })),
  })

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ValidationSchema,
    system: `You verify that generated copy ONLY uses facts from a provided inventory.

Flag ANY claim that:
1. Includes specific numbers not in the inventory
2. Mentions credentials not in the inventory  
3. Claims achievements not in the inventory
4. Names specific properties/sales not in the inventory
5. Makes superlative claims ("best", "top", "#1") without backing

Be STRICT. Marketing copy loves to embellish - catch it.`,
    prompt: `FACT INVENTORY:
${inventory.allFactsList.map(f => `- ${f}`).join('\n')}

GENERATED COPY TO VALIDATE:
"${generatedCopy}"

Check if the copy ONLY uses facts from the inventory. Flag any invented claims.`,
  })

  const violations = result.object.violations.map(v => `"${v.claim}" - ${v.issue}`)
  
  if (violations.length > 0) {
    onProgress?.(`Found ${violations.length} potential invented facts`)
  } else {
    onProgress?.('Copy validated - uses only provided facts')
  }

  return {
    valid: result.object.valid,
    violations,
  }
}
