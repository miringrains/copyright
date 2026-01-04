/**
 * Email Type Requirements
 * 
 * Defines what each email type NEEDS to be good.
 * If we don't have it, we ask for it.
 */

export interface EmailRequirement {
  id: string
  label: string
  description: string
  // What makes this email type work
  coreNeed: string
  // Questions to ask if we're missing the core need
  questions: Array<{
    id: string
    question: string
    why: string // Why this question matters
    exampleAnswer: string // What a good answer looks like
  }>
  // What we're looking for in the website scan
  scanLookFor: string[]
  // Structure of the output
  structure: {
    maxParagraphs: number
    hook: string // What the first line should do
    body: string // What the middle should do
    close: string // What the ending should do
  }
  // Things that make this email type fail
  antiPatterns: string[]
}

export const EMAIL_REQUIREMENTS: Record<string, EmailRequirement> = {
  welcome: {
    id: 'welcome',
    label: 'Welcome / Onboarding',
    description: 'First email after signup',
    coreNeed: 'One useful piece of information that makes the reader glad they signed up',
    questions: [
      {
        id: 'insider_tip',
        question: "What's one thing about your product/service that most people don't know or get wrong?",
        why: 'This becomes the value of the email - proof they made a good choice',
        exampleAnswer: 'Most people spray and wipe immediately. You need to let the cleaner sit for 30 seconds for the surfactants to work.',
      },
      {
        id: 'first_action',
        question: "What's the very first thing someone should do after signing up?",
        why: 'Gives them a clear next step instead of generic exploration',
        exampleAnswer: 'Try it on your stovetop first - that\'s where you\'ll see the biggest difference.',
      },
    ],
    scanLookFor: [
      'product names and prices',
      'specific ingredients or materials',
      'how-to instructions',
      'founder story or origin',
      'specific claims with numbers',
    ],
    structure: {
      maxParagraphs: 4,
      hook: 'Confirm their signup without enthusiasm ("You\'re in." not "Welcome to the family!")',
      body: 'Share the one useful thing - the tip, the fact, the insider knowledge',
      close: 'Suggest a specific first action',
    },
    antiPatterns: [
      'Welcome to the family',
      'We\'re thrilled',
      'Your journey begins',
      'Explore our',
      'Dive into',
      'Discover the world of',
      'Generic product descriptions',
      'Multiple CTAs',
    ],
  },

  abandoned_cart: {
    id: 'abandoned_cart',
    label: 'Abandoned Cart',
    description: 'Reminder about items left in cart',
    coreNeed: 'Address the actual reason they hesitated',
    questions: [
      {
        id: 'hesitation_reason',
        question: "What's the #1 reason people hesitate before buying?",
        why: 'Lets us address the real objection instead of generic urgency',
        exampleAnswer: 'They wonder if it actually works on tough grease, or if it\'s just another cleaner.',
      },
      {
        id: 'reassurance',
        question: 'What would you say to someone sitting on the fence?',
        why: 'This is the core of the email - the push they need',
        exampleAnswer: 'Try it on the one spot you\'ve given up on. If it doesn\'t work, full refund.',
      },
    ],
    scanLookFor: [
      'guarantee or return policy',
      'specific product benefits',
      'testimonials or reviews',
      'pricing details',
      'shipping information',
    ],
    structure: {
      maxParagraphs: 3,
      hook: 'Acknowledge what they were looking at (specific product name)',
      body: 'Address the hesitation directly, then reassure',
      close: 'Single, clear CTA to complete purchase',
    },
    antiPatterns: [
      'Did you forget something?',
      'Your cart misses you',
      'Still thinking about it?',
      'Don\'t let this slip away',
      'Limited time',
      'Hurry before it\'s gone',
    ],
  },

  nurture: {
    id: 'nurture',
    label: 'Nurture Sequence',
    description: 'Educational content that builds trust',
    coreNeed: 'One insight that changes how they think about the problem',
    questions: [
      {
        id: 'counterintuitive',
        question: 'What do most people believe about [your space] that\'s actually wrong?',
        why: 'Creates an aha moment that builds credibility',
        exampleAnswer: 'Everyone thinks more soap = cleaner. Actually, excess soap leaves residue that attracts more dirt.',
      },
      {
        id: 'proof',
        question: 'How do you know this? What\'s the evidence?',
        why: 'Backs up the claim so it doesn\'t feel like opinion',
        exampleAnswer: 'We tested residue levels on 50 surfaces. Soap-heavy cleaning left 3x more residue.',
      },
    ],
    scanLookFor: [
      'blog posts or educational content',
      'product specifications',
      'comparison data',
      'industry certifications',
      'expert quotes or credentials',
    ],
    structure: {
      maxParagraphs: 5,
      hook: 'Challenge a common belief or ask a provocative question',
      body: 'Explain the insight with evidence, then connect to your product naturally',
      close: 'Optional soft CTA or preview of next email',
    },
    antiPatterns: [
      'Did you know?',
      'Here\'s a fun fact',
      'Studies show', // without specifics
      'Experts agree',
      'It\'s scientifically proven',
    ],
  },

  launch: {
    id: 'launch',
    label: 'Product Launch',
    description: 'Announcing something new',
    coreNeed: 'Clear statement of what\'s new and why it matters to THEM',
    questions: [
      {
        id: 'what_new',
        question: 'What is the new thing, in one sentence?',
        why: 'Forces clarity - if you can\'t say it simply, the email will be confusing',
        exampleAnswer: 'A lemon-scented version of our all-purpose cleaner.',
      },
      {
        id: 'why_care',
        question: 'Why would your existing customers care about this?',
        why: 'This is the actual content of the email',
        exampleAnswer: 'The original works great but some customers wanted something that didn\'t smell like chemicals.',
      },
    ],
    scanLookFor: [
      'existing product lineup',
      'customer feedback or reviews',
      'pricing',
      'launch date or availability',
      'comparison to existing products',
    ],
    structure: {
      maxParagraphs: 4,
      hook: 'Announce what\'s new in one clear line',
      body: 'Explain why this matters to them (not features - benefits)',
      close: 'Clear CTA with availability info',
    },
    antiPatterns: [
      'We\'re excited to announce',
      'Introducing our revolutionary',
      'Game-changing',
      'You asked, we listened',
      'The wait is over',
    ],
  },

  reengagement: {
    id: 'reengagement',
    label: 'Re-engagement',
    description: 'Win back inactive subscribers',
    coreNeed: 'A reason to come back that\'s worth their time',
    questions: [
      {
        id: 'whats_changed',
        question: 'What has changed or improved since they last engaged?',
        why: 'Gives them a reason to take another look',
        exampleAnswer: 'We reformulated to remove sulfates. Same cleaning power, gentler on sensitive skin.',
      },
      {
        id: 'easy_win',
        question: 'What\'s something quick they could do right now that would remind them why they signed up?',
        why: 'Low-friction action to rebuild the habit',
        exampleAnswer: 'Try one spray on your bathroom mirror. 10 seconds to see the difference.',
      },
    ],
    scanLookFor: [
      'recent updates or changes',
      'new products',
      'promotions or discounts',
      'customer success stories',
      'what makes you different from alternatives',
    ],
    structure: {
      maxParagraphs: 3,
      hook: 'Acknowledge the gap without guilt ("It\'s been a while")',
      body: 'Share what\'s new or what they might have missed',
      close: 'Single easy action to re-engage',
    },
    antiPatterns: [
      'We miss you!',
      'Where have you been?',
      'Is this goodbye?',
      'Last chance',
      'We noticed you haven\'t',
    ],
  },
}

/**
 * Get requirements for an email type
 */
export function getEmailRequirements(type: string): EmailRequirement | null {
  return EMAIL_REQUIREMENTS[type] || null
}

/**
 * Get all email types as options for a selector
 */
export function getEmailTypeOptions(): Array<{ value: string; label: string; description: string }> {
  return Object.values(EMAIL_REQUIREMENTS).map(req => ({
    value: req.id,
    label: req.label,
    description: req.description,
  }))
}

