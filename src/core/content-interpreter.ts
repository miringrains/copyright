/**
 * Content Interpreter
 * 
 * Pre-processes raw website data and extracts ONLY the fields relevant
 * to the specific campaign type. Acts as a firewall against AI slop.
 * 
 * Instead of dumping 2000 words of website content into context,
 * this extracts structured, campaign-appropriate data.
 */

import { generateWithRetry } from '@/infrastructure/ai/client'
import { getPhaseConfig } from '@/infrastructure/ai/router'
import { z } from 'zod'

// What we extract for each campaign type
export interface InterpretedContent {
  // Core product info (all campaigns)
  product_name: string
  one_liner: string // One sentence description
  
  // Welcome/Onboarding specific
  backstory?: string // Origin story, why it was built
  first_step?: string // What new users should do first
  
  // Nurture specific
  teaching_angles?: string[] // Insights that could be shared
  proof_points?: string[] // Stats, results, testimonials
  
  // Launch specific
  problem_solved?: string
  key_features?: string[]
  
  // Abandoned cart specific
  key_benefit?: string
  price_info?: string
  
  // Re-engagement specific
  recent_updates?: string[]
  
  // What we couldn't find
  unknown_fields: string[]
}

// Schema for LLM extraction
const InterpretedContentSchema = z.object({
  product_name: z.string().describe('The exact product/company name'),
  one_liner: z.string().describe('One sentence: what does this product do?'),
  backstory: z.string().describe('Why was this built? Origin story. Leave empty if not found.'),
  first_step: z.string().describe('What should a new user do first? Leave empty if not found.'),
  teaching_angles: z.array(z.string()).describe('Key insights or frameworks from the product'),
  proof_points: z.array(z.string()).describe('Specific stats, results, or testimonials found'),
  problem_solved: z.string().describe('What problem does this solve? One sentence.'),
  key_features: z.array(z.string()).describe('Top 3 features mentioned'),
  key_benefit: z.string().describe('The main benefit for users'),
  price_info: z.string().describe('Any pricing mentioned. Leave empty if not found.'),
  recent_updates: z.array(z.string()).describe('Recent changes or new features mentioned'),
  unknown_fields: z.array(z.string()).describe('Fields you could not find in the content'),
})

// What each campaign type needs
const CAMPAIGN_REQUIRED_FIELDS: Record<string, string[]> = {
  welcome: ['product_name', 'one_liner', 'backstory', 'first_step'],
  nurture: ['product_name', 'one_liner', 'teaching_angles', 'proof_points'],
  launch: ['product_name', 'one_liner', 'problem_solved', 'key_features'],
  abandoned_cart: ['product_name', 'one_liner', 'key_benefit', 'price_info'],
  reengagement: ['product_name', 'one_liner', 'recent_updates', 'key_benefit'],
}

const INTERPRETER_SYSTEM_PROMPT = `You are a content analyst. Extract ONLY factual information from the provided website content.

RULES:
1. Only extract what is EXPLICITLY stated in the content
2. Do NOT invent or assume anything
3. If a field is not found, leave it empty or add it to unknown_fields
4. Be concise - one sentence per field maximum
5. For product_name: use the EXACT name as it appears
6. For one_liner: describe what it DOES, not what it "helps with"

WHAT TO IGNORE:
- Marketing fluff and superlatives
- Generic claims without specifics
- Technical jargon that users won't understand
- Calls to action from the website

WHAT TO EXTRACT:
- Concrete product features
- Specific numbers, stats, or results
- Clear benefit statements
- Origin story or "why we built this"
- Pricing information if present`

/**
 * Interpret website content based on campaign type
 */
export async function interpretContent(
  rawWebsiteContent: string,
  campaignType: string,
  formData: Record<string, string>
): Promise<InterpretedContent> {
  // If no website content, return minimal structure from form data
  if (!rawWebsiteContent || rawWebsiteContent.trim().length < 100) {
    return buildMinimalContent(formData, campaignType)
  }

  const config = getPhaseConfig('creative_brief') // Use same model as Phase 1
  
  const requiredFields = CAMPAIGN_REQUIRED_FIELDS[campaignType] || CAMPAIGN_REQUIRED_FIELDS.welcome
  
  const prompt = `Extract content for a ${getCampaignLabel(campaignType)} email.

PRIORITY FIELDS TO FIND:
${requiredFields.map(f => `- ${f}`).join('\n')}

USER-PROVIDED INFO (use these as ground truth):
- Company Name: ${formData.company_name || 'Unknown'}
- Target Audience: ${formData.target_audience || 'Unknown'}
${formData.teaching_point ? `- Teaching Point: ${formData.teaching_point}` : ''}
${formData.first_action ? `- First Action: ${formData.first_action}` : ''}
${formData.product_name ? `- Product: ${formData.product_name}` : ''}

WEBSITE CONTENT TO ANALYZE:
${rawWebsiteContent.slice(0, 3000)} // Limit to avoid token issues

Extract the fields above. For any field not found in the content, add it to unknown_fields.`

  try {
    const result = await generateWithRetry({
      config,
      schema: InterpretedContentSchema,
      system: INTERPRETER_SYSTEM_PROMPT,
      prompt,
    })
    
    return result as InterpretedContent
  } catch (error) {
    console.error('Content interpretation failed, using minimal content:', error)
    return buildMinimalContent(formData, campaignType)
  }
}

/**
 * Build minimal content from form data when website scrape fails
 */
function buildMinimalContent(
  formData: Record<string, string>,
  campaignType: string
): InterpretedContent {
  return {
    product_name: formData.company_name || formData.product_name || 'the product',
    one_liner: formData.value_proposition || formData.offer || 'helps you get results',
    backstory: formData.company_story || undefined,
    first_step: formData.first_action || undefined,
    teaching_angles: formData.teaching_point ? [formData.teaching_point] : undefined,
    proof_points: [],
    problem_solved: formData.launch_problem || undefined,
    key_features: [],
    key_benefit: formData.immediate_value || undefined,
    price_info: formData.offer_details || undefined,
    recent_updates: formData.new_value ? [formData.new_value] : undefined,
    unknown_fields: ['website_content_unavailable'],
  }
}

/**
 * Format interpreted content for TaskSpec context
 * Only includes fields relevant to the campaign type
 */
export function formatInterpretedContent(
  content: InterpretedContent,
  campaignType: string
): string {
  const lines: string[] = []
  
  // Always include core info
  lines.push(`Product: ${content.product_name}`)
  lines.push(`What it does: ${content.one_liner}`)
  
  // Campaign-specific fields
  switch (campaignType) {
    case 'welcome':
      if (content.backstory) lines.push(`Backstory: ${content.backstory}`)
      if (content.first_step) lines.push(`First step: ${content.first_step}`)
      break
      
    case 'nurture':
      if (content.teaching_angles?.length) {
        lines.push(`Teaching angles: ${content.teaching_angles.join('; ')}`)
      }
      if (content.proof_points?.length) {
        lines.push(`Proof: ${content.proof_points.join('; ')}`)
      }
      break
      
    case 'launch':
      if (content.problem_solved) lines.push(`Problem solved: ${content.problem_solved}`)
      if (content.key_features?.length) {
        lines.push(`Key features: ${content.key_features.join(', ')}`)
      }
      break
      
    case 'abandoned_cart':
      if (content.key_benefit) lines.push(`Key benefit: ${content.key_benefit}`)
      if (content.price_info) lines.push(`Price: ${content.price_info}`)
      break
      
    case 'reengagement':
      if (content.recent_updates?.length) {
        lines.push(`What's new: ${content.recent_updates.join('; ')}`)
      }
      if (content.key_benefit) lines.push(`Key benefit: ${content.key_benefit}`)
      break
  }
  
  // Note what we couldn't find
  if (content.unknown_fields?.length > 0) {
    lines.push(`[Note: Could not find: ${content.unknown_fields.join(', ')}]`)
  }
  
  return lines.join('\n')
}

/**
 * Build proof_material array from interpreted content
 */
export function buildProofMaterial(content: InterpretedContent): Array<{type: string, content: string}> {
  const proof: Array<{type: string, content: string}> = []
  
  if (content.proof_points) {
    for (const point of content.proof_points) {
      // Determine proof type
      if (/\d+%|\d+x|\$\d+|\d+ (users|customers|companies)/.test(point)) {
        proof.push({ type: 'data', content: point })
      } else if (/".*"/.test(point) || point.includes('said') || point.includes('told')) {
        proof.push({ type: 'quote', content: point })
      } else {
        proof.push({ type: 'case', content: point })
      }
    }
  }
  
  return proof
}

/**
 * Build must_include array based on campaign type and interpreted content
 */
export function buildMustInclude(
  content: InterpretedContent,
  campaignType: string,
  formData: Record<string, string>
): string[] {
  const mustInclude: string[] = []
  
  // Always include product name
  mustInclude.push(`Use exact product name: ${content.product_name}`)
  
  // Campaign-specific requirements
  switch (campaignType) {
    case 'welcome':
      if (formData.first_action) {
        mustInclude.push(`First action CTA: ${formData.first_action}`)
      }
      if (formData.signed_up_for) {
        mustInclude.push(`Reference what they signed up for: ${formData.signed_up_for}`)
      }
      break
      
    case 'nurture':
      if (formData.teaching_point) {
        mustInclude.push(`Teaching point: ${formData.teaching_point}`)
      }
      break
      
    case 'launch':
      if (formData.product_name) {
        mustInclude.push(`Product being launched: ${formData.product_name}`)
      }
      if (formData.urgency_angle) {
        mustInclude.push(`Urgency: ${formData.urgency_angle}`)
      }
      break
      
    case 'abandoned_cart':
      if (formData.product_left) {
        mustInclude.push(`Product left in cart: ${formData.product_left}`)
      }
      break
      
    case 'reengagement':
      if (formData.time_inactive) {
        mustInclude.push(`Acknowledge time away: ${formData.time_inactive}`)
      }
      if (formData.new_value) {
        mustInclude.push(`New value: ${formData.new_value}`)
      }
      break
  }
  
  return mustInclude
}

function getCampaignLabel(type: string): string {
  const labels: Record<string, string> = {
    welcome: 'Welcome/Onboarding',
    nurture: 'Nurture Sequence',
    launch: 'Product Launch',
    abandoned_cart: 'Abandoned Cart',
    reengagement: 'Re-engagement',
  }
  return labels[type] || type
}

