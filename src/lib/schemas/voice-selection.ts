import { z } from 'zod'

/**
 * Voice Selection - WHO writes this
 * 
 * Pick a real person. That's it.
 * The writing phase literally becomes "You are [person]. Write this."
 */
export const VoiceSelectionSchema = z.object({
  // The person
  name: z.string().describe('Full name of the person (e.g., Steve Burke, Ina Garten, Mike Rowe)'),
  known_for: z.string().describe('What they are known for - one line'),
  
  // Why they fit - one sentence
  why: z.string().describe('One sentence: why this person is right for this product/audience'),
})

export type VoiceSelection = z.infer<typeof VoiceSelectionSchema>
