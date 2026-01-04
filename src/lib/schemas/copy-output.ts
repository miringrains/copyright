import { z } from 'zod'

/**
 * Copy Output - the final result
 * Simple: the copy + variants + subject lines
 */
export const CopyOutputSchema = z.object({
  // The main copy
  copy: z.string().describe('The email/page copy - plain text with paragraph breaks'),

  // Style variants
  variants: z.object({
    shorter: z.string().describe('Same message, fewer words'),
    warmer: z.string().describe('Same message, more personal/friendly'),
  }),

  // For emails
  subject_lines: z.array(z.string()).describe('3 subject line options'),

  // Self-check
  check: z.object({
    follows_voice: z.boolean().describe('Does this sound like the selected voice?'),
    one_clear_action: z.boolean().describe('Is there ONE clear action?'),
    no_fabrication: z.boolean().describe('Did we avoid inventing facts?'),
    under_word_limit: z.boolean().describe('Is it within the format constraints?'),
  }),
})

export type CopyOutput = z.infer<typeof CopyOutputSchema>

