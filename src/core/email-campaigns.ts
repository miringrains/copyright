/**
 * Email Campaign Structures
 * 
 * Each campaign type has:
 * - A through-line template (the ONE idea)
 * - A beat sequence with specific constraints
 * - Hook/action constraints to prevent AI slop
 */

export interface CampaignBeat {
  id: string
  function: string
  job: string
  constraint: string
  maxWords: number
  requiredElements: ('specific_noun' | 'number' | 'proper_noun' | 'imperative' | 'question')[]
  forbidden: string[]
}

export interface CampaignStructure {
  type: string
  label: string
  throughLineTemplate: string
  throughLineExample: string
  beats: CampaignBeat[]
  hookConstraint: string
  actionConstraint: string
  additionalForbidden: string[]
}

export const EMAIL_CAMPAIGNS: Record<string, CampaignStructure> = {
  welcome: {
    type: 'welcome',
    label: 'Welcome/Onboarding',
    throughLineTemplate: "Here's what [product] does and your first step",
    throughLineExample: "You're in. Here's how to get the most out of your trial in the next 10 minutes.",
    beats: [
      {
        id: 'confirmation',
        function: 'hook',
        job: 'Confirm what they signed up for and make them feel smart about it',
        constraint: 'Must reference the specific thing they signed up for - not generic welcome',
        maxWords: 25,
        requiredElements: ['proper_noun'],
        forbidden: ['welcome to', 'thanks for signing up', 'we\'re excited'],
      },
      {
        id: 'value_preview',
        function: 'tension',
        job: 'Show them what they now have access to - the immediate value',
        constraint: 'Must be specific about what they GET, not what you DO',
        maxWords: 35,
        requiredElements: ['specific_noun'],
        forbidden: ['helping you', 'designed to', 'allows you to'],
      },
      {
        id: 'first_action',
        function: 'resolution',
        job: 'Give them ONE specific first step that drives success',
        constraint: 'Must be a concrete action they can do in under 2 minutes',
        maxWords: 30,
        requiredElements: ['imperative'],
        forbidden: ['explore', 'check out', 'learn more about'],
      },
      {
        id: 'whats_next',
        function: 'action',
        job: 'Set expectations for what comes next',
        constraint: 'Must mention a specific time or trigger for the next email',
        maxWords: 20,
        requiredElements: [],
        forbidden: ['stay tuned', 'more to come', 'keep an eye out'],
      },
    ],
    hookConstraint: 'Must reference the specific thing they signed up for',
    actionConstraint: 'Must be a specific first step, not generic CTA',
    additionalForbidden: ['welcome aboard', 'glad to have you', 'journey', 'adventure'],
  },

  nurture: {
    type: 'nurture',
    label: 'Nurture Sequence',
    throughLineTemplate: "Here's one insight that changes how you think about [topic]",
    throughLineExample: "Most people optimize for the wrong metric. Here's what actually drives retention.",
    beats: [
      {
        id: 'insight_hook',
        function: 'hook',
        job: 'Open with a surprising or contrarian observation',
        constraint: 'Must be a specific observation, not a question or greeting',
        maxWords: 25,
        requiredElements: ['specific_noun'],
        forbidden: ['did you know', 'have you ever', 'picture this', 'imagine'],
      },
      {
        id: 'teaching_moment',
        function: 'tension',
        job: 'Develop the insight with a specific example or mechanism',
        constraint: 'Must teach something useful even if they never buy',
        maxWords: 45,
        requiredElements: ['specific_noun'],
        forbidden: ['it\'s important to', 'you need to understand'],
      },
      {
        id: 'product_bridge',
        function: 'resolution',
        job: 'Connect the insight to how your product embodies it',
        constraint: 'Product is proof of the insight, not a pitch',
        maxWords: 35,
        requiredElements: ['proper_noun'],
        forbidden: ['that\'s why we', 'this is where', 'introducing'],
      },
      {
        id: 'invitation',
        function: 'action',
        job: 'Invite them to take a low-commitment next step',
        constraint: 'Must match the CTA type specified (soft/medium/hard)',
        maxWords: 20,
        requiredElements: [],
        forbidden: ['click here', 'don\'t miss out', 'act now'],
      },
    ],
    hookConstraint: 'Must open with a surprising or contrarian observation',
    actionConstraint: 'Product is example/proof of the insight, not a pitch',
    additionalForbidden: ['valuable insight', 'game-changing', 'pro tip'],
  },

  launch: {
    type: 'launch',
    label: 'Product Launch',
    throughLineTemplate: "[Product] solves [problem] - available now",
    throughLineExample: "We rebuilt search from scratch. It's 10x faster and actually finds what you're looking for.",
    beats: [
      {
        id: 'announcement',
        function: 'hook',
        job: 'Announce what\'s new with specificity',
        constraint: 'Must name the product/feature and what category it\'s in',
        maxWords: 20,
        requiredElements: ['proper_noun'],
        forbidden: ['big news', 'exciting announcement', 'we\'re thrilled'],
      },
      {
        id: 'what_changed',
        function: 'tension',
        job: 'Explain what was broken before and how this fixes it',
        constraint: 'Must contrast old way vs new way with specifics',
        maxWords: 40,
        requiredElements: ['specific_noun', 'number'],
        forbidden: ['revolutionizes', 'transforms', 'game-changing'],
      },
      {
        id: 'who_its_for',
        function: 'resolution',
        job: 'Make it clear who should care and why',
        constraint: 'Must describe a specific use case or persona',
        maxWords: 35,
        requiredElements: ['specific_noun'],
        forbidden: ['perfect for', 'ideal for', 'designed for everyone'],
      },
      {
        id: 'how_to_get',
        function: 'action',
        job: 'Tell them exactly how to get it',
        constraint: 'Must include specific availability details (price, date, access)',
        maxWords: 25,
        requiredElements: ['imperative'],
        forbidden: ['learn more', 'check it out', 'stay tuned'],
      },
    ],
    hookConstraint: 'Must name the product/feature explicitly',
    actionConstraint: 'Must include specific availability details',
    additionalForbidden: ['groundbreaking', 'industry-leading', 'best-in-class'],
  },

  abandoned_cart: {
    type: 'abandoned_cart',
    label: 'Abandoned Cart',
    throughLineTemplate: "You left [item] - here's why it's worth coming back",
    throughLineExample: "Your Starter Kit is still in your cart. Here's what you'd be missing.",
    beats: [
      {
        id: 'reminder',
        function: 'hook',
        job: 'Remind them what they left without being pushy',
        constraint: 'Must name the specific product(s) left behind',
        maxWords: 20,
        requiredElements: ['proper_noun'],
        forbidden: ['oops', 'forgot something', 'still there'],
      },
      {
        id: 'address_hesitation',
        function: 'tension',
        job: 'Acknowledge and address the likely reason they left',
        constraint: 'Must address the specific hesitation type selected',
        maxWords: 35,
        requiredElements: ['specific_noun'],
        forbidden: ['we understand', 'no pressure', 'take your time'],
      },
      {
        id: 'reduce_friction',
        function: 'resolution',
        job: 'Remove the barrier or add value to tip the decision',
        constraint: 'Must offer something concrete (guarantee, bonus, support)',
        maxWords: 30,
        requiredElements: [],
        forbidden: ['risk-free', 'no-brainer', 'you won\'t regret'],
      },
      {
        id: 'return_path',
        function: 'action',
        job: 'Make returning to the cart effortless',
        constraint: 'Must be a direct link to their cart, not homepage',
        maxWords: 15,
        requiredElements: ['imperative'],
        forbidden: ['visit our site', 'browse our selection'],
      },
    ],
    hookConstraint: 'Must name the specific product left behind',
    actionConstraint: 'Must address most likely objection',
    additionalForbidden: ['hurry', 'running out', 'last chance'],
  },

  reengagement: {
    type: 'reengagement',
    label: 'Re-engagement',
    throughLineTemplate: "We haven't heard from you - here's what you've missed",
    throughLineExample: "It's been 60 days. We shipped 3 features you asked for.",
    beats: [
      {
        id: 'acknowledge_gap',
        function: 'hook',
        job: 'Acknowledge the silence without guilt-tripping',
        constraint: 'Must acknowledge time passed without being needy',
        maxWords: 20,
        requiredElements: [],
        forbidden: ['we miss you', 'where have you been', 'don\'t forget about us'],
      },
      {
        id: 'new_value',
        function: 'tension',
        job: 'Show them what\'s new or what they\'ve missed',
        constraint: 'Must list specific improvements or content since they left',
        maxWords: 40,
        requiredElements: ['specific_noun', 'number'],
        forbidden: ['a lot has changed', 'so much to share'],
      },
      {
        id: 'easy_reentry',
        function: 'resolution',
        job: 'Make coming back feel easy and low-commitment',
        constraint: 'Must offer a specific, easy first step back',
        maxWords: 30,
        requiredElements: [],
        forbidden: ['give us another chance', 'we\'d love to have you back'],
      },
      {
        id: 'permission_out',
        function: 'action',
        job: 'Give them an out if they\'re truly done',
        constraint: 'If include_unsubscribe is yes, offer graceful exit',
        maxWords: 25,
        requiredElements: [],
        forbidden: ['we hate to see you go', 'are you sure'],
      },
    ],
    hookConstraint: 'Must acknowledge the silence without guilting',
    actionConstraint: 'Include option to unsubscribe gracefully if requested',
    additionalForbidden: ['come back', 'we need you', 'don\'t leave'],
  },
}

/**
 * Get campaign structure by type
 */
export function getCampaignStructure(campaignType: string): CampaignStructure | undefined {
  return EMAIL_CAMPAIGNS[campaignType]
}

/**
 * Get all forbidden terms for a campaign (universal + campaign-specific)
 */
export function getCampaignForbiddenTerms(campaignType: string): string[] {
  const campaign = EMAIL_CAMPAIGNS[campaignType]
  if (!campaign) return []
  
  // Collect from all beats
  const beatForbidden = campaign.beats.flatMap(beat => beat.forbidden)
  
  return [...new Set([...campaign.additionalForbidden, ...beatForbidden])]
}

/**
 * Build through-line from template and inputs
 */
export function buildThroughLine(campaignType: string, inputs: Record<string, string>): string {
  const campaign = EMAIL_CAMPAIGNS[campaignType]
  if (!campaign) return ''
  
  let throughLine = campaign.throughLineTemplate
  
  // Replace placeholders with actual values
  const replacements: Record<string, string> = {
    '[product]': inputs.company_name || inputs.product_name || 'our product',
    '[topic]': inputs.teaching_point || inputs.topic || 'this topic',
    '[problem]': inputs.launch_problem || 'the problem',
    '[item]': inputs.product_left || 'your items',
  }
  
  for (const [placeholder, value] of Object.entries(replacements)) {
    throughLine = throughLine.replace(placeholder, value)
  }
  
  return throughLine
}

