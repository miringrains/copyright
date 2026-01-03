import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { FinalPackage } from '@/lib/schemas'

const PolishedOutputSchema = z.object({
  final: z.string(),
  variants: z.object({
    shorter: z.string(),
    punchier: z.string(),
    safer: z.string(),
  }),
  changes_made: z.array(z.string()),
})

const POLISH_SYSTEM_PROMPT = `You are a human editor removing AI artifacts from copy.

Your ONLY job is to make this sound like a real person wrote it. Not a marketer. Not an AI. A real human being writing to another human being.

ACTIVELY REWRITE to remove:

1. EM DASHES — replace with periods, commas, or rewrite the sentence
2. FILLER ENTHUSIASM: "super", "amazing", "awesome", "incredible", "exciting", "fantastic"
3. FALSE EMPATHY: "No worries", "Don't worry", "I totally understand", "I get it"
4. MADE-UP FREQUENCY CLAIMS: "this happens all the time", "many people", "most users"
5. REDUNDANT PHRASES: "quick and easy", "fast and simple", "smooth and seamless"
6. CORPORATE SPEAK: "leverage", "optimize", "enhance your experience", "we value"
7. WEAK HEDGING: "just", "simply", "really", "very", "actually", "basically"
8. SALESY URGENCY: "Act now", "Don't miss out", "Limited time"
9. ROBOTIC TRANSITIONS: "Furthermore", "Additionally", "Moreover", "In conclusion"
10. EXCLAMATION INFLATION: Keep max 1 per email, 0 is often better

PRESERVE:
- The core message and CTA
- Specific facts and numbers from the original
- The overall structure
- Company/product names

OUTPUT the polished version. Be aggressive about cutting fluff.
Sound like a busy professional writing a quick email, not a copywriter crafting a masterpiece.`

export async function polishOutput(
  finalPackage: FinalPackage
): Promise<FinalPackage> {
  const prompt = `Polish this copy to sound human. Remove AI artifacts.

MAIN VERSION:
${finalPackage.final}

SHORTER VERSION:
${finalPackage.variants.shorter}

PUNCHIER VERSION:
${finalPackage.variants.punchier}

SAFER VERSION:
${finalPackage.variants.safer}

Rewrite each version to sound like a real human wrote it. Be aggressive about cutting AI-isms.`

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: PolishedOutputSchema,
      system: POLISH_SYSTEM_PROMPT,
      prompt,
      maxRetries: 2,
    })

    return {
      ...finalPackage,
      final: result.object.final,
      variants: {
        shorter: result.object.variants.shorter,
        punchier: result.object.variants.punchier,
        safer: result.object.variants.safer,
      },
      notes: [
        ...finalPackage.notes,
        `Polish pass changes: ${result.object.changes_made.join(', ')}`,
      ],
    }
  } catch (error) {
    console.error('Polish pass failed, returning original:', error)
    return finalPackage
  }
}

