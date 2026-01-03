// Smart input requirements per copy type
// Each type has required fields that maximize copy quality without overwhelming the user

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
}

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

export const COPY_TYPE_CONFIGS: Record<string, CopyTypeConfig> = {
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

  website_copy: {
    type: 'website_copy',
    label: 'Website Copy',
    description: 'Homepage, about page, or general website sections',
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

  email_sequence: {
    type: 'email_sequence',
    label: 'Email Sequence',
    description: 'Nurture sequence, launch emails, or onboarding series',
    firecrawlEnabled: false,
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'sequence_type',
        label: 'Sequence Type',
        type: 'select',
        options: [
          { value: 'welcome', label: 'Welcome/Onboarding' },
          { value: 'nurture', label: 'Nurture Sequence' },
          { value: 'launch', label: 'Product Launch' },
          { value: 'abandoned_cart', label: 'Abandoned Cart' },
          { value: 'reengagement', label: 'Re-engagement' },
        ],
        required: true,
      },
      COMMON_FIELDS.targetAudience,
      {
        id: 'goal',
        label: 'Sequence Goal',
        type: 'text',
        placeholder: 'What should recipients do by the end?',
        required: true,
      },
      {
        id: 'sender_persona',
        label: 'Sender',
        type: 'text',
        placeholder: 'Who is the email from? e.g., Sarah, Head of Customer Success',
        required: true,
      },
    ],
    optionalFields: [
      {
        id: 'num_emails',
        label: 'Number of Emails',
        type: 'number',
        placeholder: '5',
        required: false,
      },
      {
        id: 'key_pain_points',
        label: 'Pain Points to Address',
        type: 'textarea',
        placeholder: 'What problems does your audience struggle with?',
        required: false,
      },
    ],
  },

  sales_letter: {
    type: 'sales_letter',
    label: 'Sales Letter',
    description: 'Long-form persuasive copy for direct response',
    firecrawlEnabled: true,
    firecrawlDescription: 'Analyze competitor sales pages for positioning opportunities',
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'product_name',
        label: 'Product/Service Name',
        type: 'text',
        placeholder: 'The specific thing being sold',
        required: true,
      },
      COMMON_FIELDS.targetAudience,
      {
        id: 'main_promise',
        label: 'Main Promise/Transformation',
        type: 'textarea',
        placeholder: 'What result or transformation does the buyer get?',
        required: true,
      },
      {
        id: 'price',
        label: 'Price Point',
        type: 'text',
        placeholder: 'e.g., $497, $97/month, Free trial then $29/mo',
        required: true,
      },
    ],
    optionalFields: [
      COMMON_FIELDS.competitorUrls,
      {
        id: 'features_benefits',
        label: 'Key Features & Benefits',
        type: 'textarea',
        placeholder: 'What does it include? What does each feature enable?',
        required: false,
      },
      {
        id: 'testimonials',
        label: 'Testimonials/Case Studies',
        type: 'textarea',
        placeholder: 'Paste actual customer quotes with results',
        required: false,
      },
      {
        id: 'guarantee',
        label: 'Guarantee',
        type: 'text',
        placeholder: 'e.g., 30-day money back, 2x ROI or refund',
        required: false,
      },
      {
        id: 'bonuses',
        label: 'Bonuses/Extras',
        type: 'textarea',
        placeholder: 'What else do they get?',
        required: false,
      },
    ],
  },

  ad_copy: {
    type: 'ad_copy',
    label: 'Ad Copy',
    description: 'Facebook ads, Google ads, LinkedIn ads',
    firecrawlEnabled: true,
    firecrawlDescription: 'Research competitor ads and landing pages',
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'platform',
        label: 'Platform',
        type: 'select',
        options: [
          { value: 'facebook', label: 'Facebook/Instagram' },
          { value: 'google', label: 'Google Ads' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'twitter', label: 'Twitter/X' },
          { value: 'youtube', label: 'YouTube' },
        ],
        required: true,
      },
      COMMON_FIELDS.targetAudience,
      {
        id: 'offer',
        label: 'Offer/Hook',
        type: 'textarea',
        placeholder: 'What are you promoting? What makes it compelling?',
        required: true,
      },
      {
        id: 'destination_url',
        label: 'Landing Page URL',
        type: 'url',
        placeholder: 'https://yoursite.com/landing',
        description: 'We\'ll analyze this to ensure ad-to-page consistency',
        required: true,
      },
    ],
    optionalFields: [
      COMMON_FIELDS.competitorUrls,
      {
        id: 'angle',
        label: 'Angle/Hook Type',
        type: 'select',
        options: [
          { value: 'pain', label: 'Pain Point' },
          { value: 'desire', label: 'Desire/Aspiration' },
          { value: 'curiosity', label: 'Curiosity' },
          { value: 'social_proof', label: 'Social Proof' },
          { value: 'urgency', label: 'Urgency/Scarcity' },
        ],
        required: false,
      },
      {
        id: 'past_winners',
        label: 'Past Winning Ads',
        type: 'textarea',
        placeholder: 'Paste your best performing ad copy for reference',
        required: false,
      },
    ],
  },

  blog_article: {
    type: 'blog_article',
    label: 'Blog Article',
    description: 'SEO-optimized thought leadership or educational content',
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

  case_study: {
    type: 'case_study',
    label: 'Case Study',
    description: 'Customer success story with measurable results',
    firecrawlEnabled: false,
    requiredFields: [
      COMMON_FIELDS.companyName,
      {
        id: 'customer_name',
        label: 'Customer Name',
        type: 'text',
        placeholder: 'Company or person name',
        required: true,
      },
      {
        id: 'customer_background',
        label: 'Customer Background',
        type: 'textarea',
        placeholder: 'Industry, size, situation before working with you',
        required: true,
      },
      {
        id: 'challenge',
        label: 'The Challenge',
        type: 'textarea',
        placeholder: 'What problem were they facing? What was at stake?',
        required: true,
      },
      {
        id: 'solution',
        label: 'The Solution',
        type: 'textarea',
        placeholder: 'How did you help them? What did you implement?',
        required: true,
      },
      {
        id: 'results',
        label: 'The Results',
        type: 'textarea',
        placeholder: 'Specific metrics, outcomes, quotes. Be concrete!',
        required: true,
      },
    ],
    optionalFields: [
      {
        id: 'customer_quote',
        label: 'Customer Quote',
        type: 'textarea',
        placeholder: 'Direct quote from the customer',
        required: false,
      },
      {
        id: 'timeline',
        label: 'Timeline',
        type: 'text',
        placeholder: 'How long did it take to achieve results?',
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

