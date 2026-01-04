// Smart input requirements per copy type
// 4 core types: Email, Website, Landing Page, Article
// Email has campaign-specific conditional fields

export interface InputField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'url-list' | 'select' | 'number'
  placeholder?: string
  description?: string
  required: boolean
  options?: { value: string; label: string }[]
}

export interface CopyTypeConfig {
  type: string
  label: string
  description: string
  requiredFields: InputField[]
  optionalFields: InputField[]
  firecrawlEnabled: boolean
  firecrawlDescription?: string
  // For email: campaign-specific conditional fields
  campaignFields?: Record<string, InputField[]>
}

// Email campaign types
export const EMAIL_CAMPAIGN_TYPES = [
  { value: 'welcome', label: 'Welcome/Onboarding', description: 'Introduce new subscribers and guide first actions' },
  { value: 'nurture', label: 'Nurture Sequence', description: 'Build trust with helpful content over time' },
  { value: 'launch', label: 'Product Launch', description: 'Announce new product or feature with urgency' },
  { value: 'abandoned_cart', label: 'Abandoned Cart', description: 'Recapture customers who left without purchasing' },
  { value: 'reengagement', label: 'Re-engagement', description: 'Revive inactive subscribers with new value' },
]

// Common fields used across multiple types
const COMMON_FIELDS = {
  companyName: {
    id: 'company_name',
    label: 'Company/Product Name',
    type: 'text' as const,
    placeholder: 'e.g., Acme Corp',
    required: true,
  },
  targetAudience: {
    id: 'target_audience',
    label: 'Target Audience',
    type: 'textarea' as const,
    placeholder: 'Who are you writing for? Be specific about their role, pain points, desires.',
    description: 'The more specific, the better the copy',
    required: true,
  },
  valueProposition: {
    id: 'value_proposition',
    label: 'Core Value Proposition',
    type: 'textarea' as const,
    placeholder: 'What transformation or result do you deliver? What makes you different?',
    required: true,
  },
  competitorUrls: {
    id: 'competitor_urls',
    label: 'Competitor Websites',
    type: 'url-list' as const,
    placeholder: 'https://competitor1.com',
    description: 'We\'ll analyze their messaging to help you stand out',
    required: false,
  },
  tone: {
    id: 'tone',
    label: 'Tone',
    type: 'select' as const,
    options: [
      { value: 'professional', label: 'Professional' },
      { value: 'conversational', label: 'Conversational' },
      { value: 'bold', label: 'Bold & Direct' },
      { value: 'empathetic', label: 'Warm & Empathetic' },
      { value: 'authoritative', label: 'Authoritative' },
    ],
    required: true,
  },
}

// Campaign-specific fields for Email
const EMAIL_CAMPAIGN_FIELDS: Record<string, InputField[]> = {
  welcome: [
    {
      id: 'signed_up_for',
      label: 'What did they sign up for?',
      type: 'text',
      placeholder: 'e.g., Free trial, Newsletter, Waitlist',
      required: true,
    },
    {
      id: 'first_action',
      label: 'What should they do first?',
      type: 'text',
      placeholder: 'e.g., Complete your profile, Install the app',
      description: 'The ONE thing that drives success',
      required: true,
    },
    {
      id: 'immediate_value',
      label: 'What do they get right now?',
      type: 'textarea',
      placeholder: 'What value or access do they have immediately?',
      required: true,
    },
    {
      id: 'next_step',
      label: 'What comes next?',
      type: 'text',
      placeholder: 'e.g., Tomorrow you\'ll get our best templates',
      required: false,
    },
  ],
  nurture: [
    {
      id: 'teaching_point',
      label: 'What insight are you sharing?',
      type: 'textarea',
      placeholder: 'The ONE idea this email communicates',
      description: 'Not a pitch - a useful insight',
      required: true,
    },
    {
      id: 'objection_addressed',
      label: 'What objection does this address?',
      type: 'text',
      placeholder: 'e.g., "It\'s too expensive", "I don\'t have time"',
      required: false,
    },
    {
      id: 'cta_type',
      label: 'Call to Action Type',
      type: 'select',
      options: [
        { value: 'soft', label: 'Soft (Reply, Read more)' },
        { value: 'medium', label: 'Medium (Check it out)' },
        { value: 'hard', label: 'Hard (Buy, Sign up)' },
      ],
      required: true,
    },
  ],
  launch: [
    {
      id: 'product_name',
      label: 'Product/Feature Name',
      type: 'text',
      placeholder: 'The name of what you\'re launching',
      required: true,
    },
    {
      id: 'launch_problem',
      label: 'What problem does it solve?',
      type: 'textarea',
      placeholder: 'What was broken before this existed?',
      required: true,
    },
    {
      id: 'urgency_angle',
      label: 'Urgency/Timing Factor',
      type: 'text',
      placeholder: 'e.g., Launch pricing ends Friday, First 100 get bonus',
      required: false,
    },
    {
      id: 'offer_details',
      label: 'Offer Details',
      type: 'textarea',
      placeholder: 'Price, what\'s included, any bonuses',
      required: true,
    },
  ],
  abandoned_cart: [
    {
      id: 'product_left',
      label: 'What did they leave?',
      type: 'text',
      placeholder: 'The specific product(s) in their cart',
      required: true,
    },
    {
      id: 'cart_value',
      label: 'Cart Value',
      type: 'text',
      placeholder: 'e.g., $149, $49/month',
      required: false,
    },
    {
      id: 'likely_hesitation',
      label: 'What stopped them?',
      type: 'select',
      options: [
        { value: 'price', label: 'Price concerns' },
        { value: 'trust', label: 'Trust/credibility' },
        { value: 'timing', label: 'Not the right time' },
        { value: 'comparison', label: 'Comparing options' },
        { value: 'unknown', label: 'Unknown' },
      ],
      required: true,
    },
    {
      id: 'urgency_factor',
      label: 'Any urgency?',
      type: 'text',
      placeholder: 'e.g., Limited stock, Price increases tomorrow',
      required: false,
    },
  ],
  reengagement: [
    {
      id: 'time_inactive',
      label: 'How long since last activity?',
      type: 'select',
      options: [
        { value: '30_days', label: '30 days' },
        { value: '60_days', label: '60 days' },
        { value: '90_days', label: '90+ days' },
      ],
      required: true,
    },
    {
      id: 'new_value',
      label: 'What have they missed?',
      type: 'textarea',
      placeholder: 'New features, content, or updates since they left',
      required: true,
    },
    {
      id: 'reengagement_offer',
      label: 'Any offer to bring them back?',
      type: 'text',
      placeholder: 'e.g., 20% off, Free month, Exclusive content',
      required: false,
    },
    {
      id: 'include_unsubscribe',
      label: 'Include graceful unsubscribe?',
      type: 'select',
      options: [
        { value: 'yes', label: 'Yes - offer to unsubscribe' },
        { value: 'no', label: 'No - standard email' },
      ],
      required: true,
    },
  ],
}

export const COPY_TYPE_CONFIGS: Record<string, CopyTypeConfig> = {
  email: {
    type: 'email',
    label: 'Email',
    description: 'Welcome, nurture, launch, cart recovery, or re-engagement emails',
    firecrawlEnabled: true,
    firecrawlDescription: 'Scrape your website to get accurate product info and brand voice',
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'destination_url',
        label: 'Your Website',
        type: 'url',
        placeholder: 'https://yourcompany.com',
        description: 'We\'ll scrape this for accurate details',
        required: true,
      },
      {
        id: 'campaign_type',
        label: 'Campaign Type',
        type: 'select',
        options: EMAIL_CAMPAIGN_TYPES.map(c => ({ value: c.value, label: c.label })),
        required: true,
      },
      COMMON_FIELDS.targetAudience,
      {
        id: 'sender_name',
        label: 'Sender Name',
        type: 'text',
        placeholder: 'e.g., Sarah from Acme',
        description: 'Who is the email from?',
        required: true,
      },
    ],
    optionalFields: [
      {
        id: 'key_pain_points',
        label: 'Pain Points to Address',
        type: 'textarea',
        placeholder: 'What problems does your audience struggle with?',
        required: false,
      },
    ],
    campaignFields: EMAIL_CAMPAIGN_FIELDS,
  },

  website: {
    type: 'website',
    label: 'Website',
    description: 'Homepage, about page, services, or product pages',
    firecrawlEnabled: true,
    firecrawlDescription: 'Research competitor websites to craft differentiated messaging',
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'page_type',
        label: 'Page Type',
        type: 'select',
        options: [
          { value: 'homepage', label: 'Homepage' },
          { value: 'about', label: 'About Page' },
          { value: 'services', label: 'Services Page' },
          { value: 'product', label: 'Product Page' },
          { value: 'pricing', label: 'Pricing Page' },
        ],
        required: true,
      },
      COMMON_FIELDS.targetAudience,
      COMMON_FIELDS.valueProposition,
      COMMON_FIELDS.tone,
    ],
    optionalFields: [
      COMMON_FIELDS.competitorUrls,
      {
        id: 'key_differentiators',
        label: 'Key Differentiators',
        type: 'textarea',
        placeholder: 'What makes you different from alternatives?',
        required: false,
      },
      {
        id: 'company_story',
        label: 'Company Story/Background',
        type: 'textarea',
        placeholder: 'Origin story, mission, team background...',
        required: false,
      },
    ],
  },

  landing_page: {
    type: 'landing_page',
    label: 'Landing Page',
    description: 'High-converting page for a specific offer or product',
    firecrawlEnabled: true,
    firecrawlDescription: 'Analyze competitor landing pages to identify messaging gaps',
    requiredFields: [
      COMMON_FIELDS.companyName,
      COMMON_FIELDS.targetAudience,
      {
        id: 'offer',
        label: 'What\'s the Offer?',
        type: 'textarea',
        placeholder: 'Describe the product/service and what the visitor gets',
        required: true,
      },
      {
        id: 'desired_action',
        label: 'Desired Action',
        type: 'text',
        placeholder: 'e.g., Sign up for free trial, Book a demo, Buy now',
        required: true,
      },
      COMMON_FIELDS.tone,
    ],
    optionalFields: [
      COMMON_FIELDS.competitorUrls,
      {
        id: 'social_proof',
        label: 'Social Proof',
        type: 'textarea',
        placeholder: 'Customer testimonials, logos, stats, awards...',
        required: false,
      },
      {
        id: 'urgency_factors',
        label: 'Urgency/Scarcity',
        type: 'text',
        placeholder: 'Limited spots? Deadline? Price increase?',
        required: false,
      },
      {
        id: 'objections',
        label: 'Common Objections',
        type: 'textarea',
        placeholder: 'What hesitations do prospects have?',
        required: false,
      },
    ],
  },

  article: {
    type: 'article',
    label: 'Article',
    description: 'Blog posts, essays, thought leadership content',
    firecrawlEnabled: true,
    firecrawlDescription: 'Research top-ranking articles for the topic',
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'topic',
        label: 'Topic/Title',
        type: 'text',
        placeholder: 'What is the article about?',
        required: true,
      },
      {
        id: 'target_keyword',
        label: 'Target Keyword',
        type: 'text',
        placeholder: 'Primary SEO keyword to rank for',
        required: true,
      },
      COMMON_FIELDS.targetAudience,
      {
        id: 'article_goal',
        label: 'Article Goal',
        type: 'select',
        options: [
          { value: 'educate', label: 'Educate/Inform' },
          { value: 'thought_leadership', label: 'Establish Thought Leadership' },
          { value: 'convert', label: 'Drive Conversions' },
          { value: 'seo', label: 'SEO/Traffic' },
        ],
        required: true,
      },
    ],
    optionalFields: [
      {
        id: 'competitor_articles',
        label: 'Top Ranking Articles',
        type: 'url-list',
        placeholder: 'https://competitor.com/similar-article',
        description: 'We\'ll analyze to find content gaps',
        required: false,
      },
      {
        id: 'unique_angle',
        label: 'Your Unique Angle',
        type: 'textarea',
        placeholder: 'What perspective or data can you add that others can\'t?',
        required: false,
      },
      {
        id: 'internal_links',
        label: 'Internal Links to Include',
        type: 'textarea',
        placeholder: 'URLs and anchor text for internal linking',
        required: false,
      },
    ],
  },
}

// Get config for a copy type
export function getCopyTypeConfig(type: string): CopyTypeConfig | undefined {
  return COPY_TYPE_CONFIGS[type]
}

// Get all copy types for selection
export function getAllCopyTypes(): { value: string; label: string; description: string }[] {
  return Object.values(COPY_TYPE_CONFIGS).map((config) => ({
    value: config.type,
    label: config.label,
    description: config.description,
  }))
}

// Get campaign-specific fields for email
export function getEmailCampaignFields(campaignType: string): InputField[] {
  return EMAIL_CAMPAIGN_FIELDS[campaignType] || []
}
