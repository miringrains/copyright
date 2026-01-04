import { z } from 'zod'

/**
 * The Information Packet - everything the voice needs to write
 * This is the ONLY input to the writing phase
 */
export const InfoPacketSchema = z.object({
  // Who is sending this
  company: z.object({
    name: z.string().describe('Company or brand name'),
    what_they_do: z.string().describe('One sentence: what the company/product does'),
    voice_hint: z.string().describe('How the company normally sounds (casual, professional, technical, etc.)'),
  }),

  // What happened to trigger this email
  trigger: z.object({
    event: z.enum([
      'signed_up',
      'abandoned_cart',
      'inactive',
      'product_launch',
      'nurture',
    ]).describe('What triggered this email'),
    specifics: z.string().describe('Specific details: what did they sign up for? What did they leave in cart?'),
  }),

  // What we want them to do
  action: z.object({
    what: z.string().describe('The ONE thing they should do'),
    why_now: z.string().describe('Why do it now vs later'),
  }),

  // What we actually know (facts only)
  known_facts: z.array(z.string()).describe('Specific facts from research/website - no fabrication'),

  // What we don't know (so we don't invent it)
  unknown: z.array(z.string()).describe('Things we have no data for - prevents fabrication'),

  // Format constraints
  format: z.object({
    type: z.enum(['email', 'landing_page', 'website', 'article']),
    max_paragraphs: z.number().describe('Maximum paragraphs allowed'),
    sender_name: z.string().describe('Who is this from? (name or company)'),
  }),
})

export type InfoPacket = z.infer<typeof InfoPacketSchema>

