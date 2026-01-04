/**
 * Voice Matching System
 * 
 * Identifies a REAL person whose voice would resonate with the target audience.
 * The AI has been trained on content from these people - it knows how they
 * actually write and speak. We're not asking for parody, we're asking the AI
 * to channel their craft and sensibility.
 * 
 * The final copy is written AS IF that person wrote it, following our guidelines.
 */

import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { z } from 'zod'

export interface VoiceMatch {
  person: string           // Full name
  known_for: string        // What they're famous for
  why_they_fit: string     // Why this person resonates with the audience
  voice_characteristics: string[]  // How they actually write/speak
  they_would_never: string[]       // What they'd never do in their copy
  example_phrases: string[]        // Phrases that sound like them
}

const VoiceMatchSchema = z.object({
  person: z.string().describe('Full name of the real person'),
  known_for: z.string().describe('Their platform, role, or claim to fame'),
  why_they_fit: z.string().describe('Why this person\'s communication style fits THIS audience'),
  voice_characteristics: z.array(z.string()).describe('3-5 communication APPROACHES (not personality traits). Focus on: how they explain things, their relationship with audience, what makes them effective. Example: "Explains complex topics through concrete examples" not "Funny and energetic"'),
  they_would_never: z.array(z.string()).describe('2-3 communication sins this person avoids. Example: "Use jargon without explaining it" or "Talk down to the audience"'),
  example_phrases: z.array(z.string()).describe('2-3 STRUCTURAL patterns they use (not catchphrases). Example: "Opens with a specific observation before the point" not "Hey guys!"'),
})

const VOICE_MATCH_SYSTEM = `You are identifying a REAL PERSON whose COMMUNICATION PHILOSOPHY should guide this copy.

The goal is NOT to impersonate them. The goal is to apply their approach to connecting with this specific audience.

Requirements:
1. REAL public figure with substantial written/spoken content in the training data
2. Their communication style naturally resonates with the target audience
3. Known for EFFECTIVE communication, not just fame

When describing their voice characteristics, focus on:
- HOW they explain complex things (not catchphrases)
- Their RELATIONSHIP with their audience (peer? teacher? insider?)
- What makes their communication EFFECTIVE (not what makes it recognizable)

DO NOT:
- Pick celebrities famous for fame, not communication
- Focus on quirks, catchphrases, or personality traits
- Suggest someone whose style would feel forced for this context

EXAMPLES by industry (pick based on fit, not just industry):
- Gaming/PC Hardware: Steve Burke (data-driven, calls out BS, respects audience intelligence), Linus Sebastian (casual expertise, genuine enthusiasm, speaks as fellow enthusiast)
- Startup/VC: Paul Graham (clear thinking, no jargon, builds from first principles), Patrick McKenzie (practitioner voice, specific examples, earned authority)
- Marketing: Seth Godin (provocative simplicity, challenges assumptions), April Dunford (practical frameworks, no fluff)
- Finance: Morgan Housel (storytelling that teaches, patience, historical perspective)
- Developer tools: Julia Evans (genuine curiosity, makes complex accessible, admits what she doesn't know)
- Health: Peter Attia (clinical precision, acknowledges uncertainty, explains the why)

The output will guide copy that feels like it was written by someone who LEARNED from this person - their philosophy, not their personality.`

const VOICE_MATCH_PROMPT = `Find the perfect voice match for this copy.

PRODUCT/COMPANY: {{product}}
TARGET AUDIENCE: {{audience}}  
INDUSTRY/CATEGORY: {{industry}}
COPY PURPOSE: {{purpose}}

Who is a REAL person that:
1. This audience already listens to and trusts
2. Has a communication style suited to this type of message
3. Would naturally talk about this type of product

Select ONE specific person and explain why they're the perfect voice for this copy.`

/**
 * Find the best voice match for the given context
 */
export async function findVoiceMatch(
  product: string,
  audience: string,
  industry: string,
  purpose: string
): Promise<VoiceMatch> {
  const config = getPhaseConfig('creative_brief') // Use strategic model
  
  const prompt = VOICE_MATCH_PROMPT
    .replace('{{product}}', product)
    .replace('{{audience}}', audience)
    .replace('{{industry}}', industry || 'General')
    .replace('{{purpose}}', purpose)

  const result = await generateWithRetry({
    config,
    schema: VoiceMatchSchema,
    system: VOICE_MATCH_SYSTEM,
    prompt,
  })

  return result
}

/**
 * Format voice match for injection into draft prompt
 * 
 * KEY INSIGHT: We're not asking for roleplay or impression.
 * We're asking the LLM to apply that person's COMMUNICATION PHILOSOPHY.
 * The PERSPECTIVE stays as the company - only the STYLE changes.
 */
export function formatVoiceDirective(voice: VoiceMatch): string {
  return `
VOICE PHILOSOPHY - Apply ${voice.person}'s communication style

CRITICAL: You are writing FROM THE COMPANY'S PERSPECTIVE to their customer.
You are NOT writing as ${voice.person} reviewing or recommending the product.
The company is speaking - just apply ${voice.person}'s STYLE to how they speak.

Wrong: "${voice.person} here, I tried this product and..."
Wrong: "As ${voice.person} would say..."
Right: Company speaking to customer, using ${voice.person}'s communication approach

${voice.person} (${voice.known_for}) connects with this audience by:
${voice.voice_characteristics.map(c => `• ${c}`).join('\n')}

Apply this philosophy to how THE COMPANY talks to THEIR customer.

Never do:
${voice.they_would_never.map(n => `• ${n}`).join('\n')}

Think: "If the company's copywriter learned everything about communication from ${voice.person}, how would they write this email?"
`
}

/**
 * Quick industry-based voice suggestions (fallback if AI matching fails)
 */
export const INDUSTRY_VOICE_HINTS: Record<string, string[]> = {
  gaming: ['Steve Burke (Gamers Nexus)', 'Linus Sebastian (LTT)', 'Marques Brownlee (MKBHD)'],
  'pc hardware': ['Steve Burke (Gamers Nexus)', 'der8auer', 'JayzTwoCents'],
  tech: ['Marques Brownlee (MKBHD)', 'Dieter Bohn', 'Joanna Stern'],
  startup: ['Paul Graham', 'Naval Ravikant', 'Patrick McKenzie'],
  saas: ['David Cancel', 'Hiten Shah', 'Jason Lemkin'],
  marketing: ['Seth Godin', 'April Dunford', 'Dave Gerhardt'],
  finance: ['Morgan Housel', 'Ben Carlson', 'Josh Brown'],
  investing: ['Howard Marks', 'Morgan Housel', 'Patrick OShaughnessy'],
  design: ['Julie Zhuo', 'Mike Monteiro', 'Tobias van Schneider'],
  developer: ['Kelsey Hightower', 'Julia Evans', 'Charity Majors'],
  devtools: ['Mitchell Hashimoto', 'Guillermo Rauch', 'Tom Preston-Werner'],
  health: ['Peter Attia', 'Andrew Huberman', 'Rhonda Patrick'],
  fitness: ['Andy Galpin', 'Jeff Nippard', 'Layne Norton'],
  ecommerce: ['Nik Sharma', 'Taylor Holiday', 'Moiz Ali'],
  dtc: ['Nik Sharma', 'Web Smith', 'Emily Singer'],
  creator: ['Ali Abdaal', 'Sahil Bloom', 'Jack Butcher'],
  productivity: ['Tiago Forte', 'Cal Newport', 'David Allen'],
  writing: ['David Perell', 'Ann Handley', 'James Clear'],
  crypto: ['Balaji Srinivasan', 'Chris Dixon', 'Vitalik Buterin'],
  ai: ['Andrej Karpathy', 'François Chollet', 'Simon Willison'],
}

