/**
 * Article Pipeline
 * 
 * Journalistic article generation following:
 * 1. SCRAPE - Understand industry and existing content
 * 2. TOPICS - Generate topic ideas that don't exist on their blog
 * 3. KEYWORDS - Research keywords from competitors + SerpAPI + user input
 * 4. OUTLINE - Create journalistic outline (lede, nut graf, body, kicker)
 * 5. WRITE - Write each section following the outline
 * 6. IMAGES - Generate images with Gemini
 * 7. ASSEMBLE - Combine into final markdown
 */

import { generateObject, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { scrapeUrl } from '@/infrastructure/firecrawl/client'
import { generateImage, saveImageToPublic, type GeneratedImage } from '@/infrastructure/gemini/client'
import { getKeywordResearch, getCompetitorUrls } from '@/infrastructure/serpapi/client'
import {
  type ArticleInput,
  type ArticleOutline,
  type TopicSuggestion,
  type IndustryContext,
  type GeneratedArticle,
  type Source,
  ArticleOutlineSchema,
  TopicSuggestionSchema,
  IndustryContextSchema,
  SourceSchema,
} from '@/lib/schemas/article'

// ============================================================================
// TYPES
// ============================================================================

export type ArticlePhase = 
  | 'scrape' 
  | 'topics' 
  | 'keywords' 
  | 'outline' 
  | 'write' 
  | 'images' 
  | 'assemble' 
  | 'complete' 
  | 'error'

export interface ArticlePipelineCallbacks {
  onPhaseChange: (phase: ArticlePhase, message: string, data?: unknown) => void
  onArticleReady: (article: GeneratedArticle) => void
  onError: (message: string) => void
}

// ============================================================================
// PHASE 1: SCRAPE
// ============================================================================

async function scrapeWebsite(
  url: string,
  blogUrl: string | undefined,
  callbacks: ArticlePipelineCallbacks
): Promise<{ mainContent: string | null; blogContent: string | null }> {
  callbacks.onPhaseChange('scrape', `Scraping ${url}...`)
  
  const mainContent = await scrapeUrl(url)
  let blogContent: string | null = null
  
  if (blogUrl && blogUrl !== url) {
    callbacks.onPhaseChange('scrape', `Scraping blog at ${blogUrl}...`)
    const blogResult = await scrapeUrl(blogUrl)
    blogContent = blogResult?.content || null
  }
  
  callbacks.onPhaseChange('scrape', `Scraped ${mainContent?.content?.length || 0} chars from main site`, {
    mainLength: mainContent?.content?.length,
    blogLength: blogContent?.length,
  })
  
  return {
    mainContent: mainContent?.content || null,
    blogContent,
  }
}

async function analyzeIndustry(
  mainContent: string | null,
  blogContent: string | null,
  callbacks: ArticlePipelineCallbacks
): Promise<IndustryContext> {
  callbacks.onPhaseChange('scrape', 'Analyzing industry context...')
  
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: IndustryContextSchema,
    system: `You analyze websites to understand the business and identify content opportunities.
    
Extract:
- What industry they're in
- What they focus on / sell
- Who their audience is
- What topics already exist on their blog (if any)
- What content gaps exist (topics they should cover but don't)
- The tone they use`,
    prompt: `MAIN WEBSITE CONTENT:
${mainContent?.slice(0, 8000) || 'No content available'}

BLOG CONTENT:
${blogContent?.slice(0, 8000) || 'No blog content available'}

Analyze this business and identify content opportunities.`,
  })
  
  callbacks.onPhaseChange('scrape', `Identified industry: ${result.object.industry}`, result.object)
  return result.object
}

// ============================================================================
// PHASE 2: TOPIC GENERATION
// ============================================================================

async function generateTopics(
  context: IndustryContext,
  sources: Source[],
  callbacks: ArticlePipelineCallbacks
): Promise<TopicSuggestion[]> {
  callbacks.onPhaseChange('topics', 'Generating topic ideas...')
  
  const sourceContext = sources.length > 0 
    ? `USER-PROVIDED SOURCES:\n${sources.map(s => `- ${s.title}: ${s.content?.slice(0, 500) || s.url}`).join('\n')}`
    : 'No sources provided yet.'
  
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: z.object({
      topics: z.array(TopicSuggestionSchema).min(5).max(10),
    }),
    system: `You generate article topic ideas for businesses.

RULES:
- Topics must NOT already exist on their blog
- Each topic needs a specific angle (not generic)
- "Why now" must explain current relevance
- Target keyword should be something people actually search for
- Focus on topics that would genuinely help their audience

Prioritize:
- Topics that fill gaps in their current content
- Topics relevant to their specific niche
- Topics that can incorporate the user's research/sources`,
    prompt: `INDUSTRY: ${context.industry}
COMPANY FOCUS: ${context.company_focus}
TARGET AUDIENCE: ${context.target_audience}

EXISTING BLOG TOPICS (DO NOT DUPLICATE):
${context.existing_blog_topics.join('\n') || 'None identified'}

CONTENT GAPS IDENTIFIED:
${context.content_gaps.join('\n') || 'None identified'}

${sourceContext}

Generate 5-10 unique article topic ideas that:
1. Don't exist on their blog yet
2. Would serve their audience
3. Can incorporate available sources/research`,
  })
  
  callbacks.onPhaseChange('topics', `Generated ${result.object.topics.length} topic ideas`, result.object.topics)
  return result.object.topics
}

// ============================================================================
// PHASE 3: KEYWORD RESEARCH + AUTO SOURCE DISCOVERY
// ============================================================================

async function researchKeywordsAndSources(
  topic: TopicSuggestion,
  userKeywords: string[],
  autoResearch: boolean,
  callbacks: ArticlePipelineCallbacks
): Promise<{ 
  primary: string
  secondary: string[]
  questions: string[]
  discoveredSources: Source[]
}> {
  callbacks.onPhaseChange('keywords', `Researching keywords for: ${topic.title}`)
  
  // Get SerpAPI data
  const serpData = await getKeywordResearch(topic.target_keyword)
  
  // Get competitor URLs for this topic
  const competitorUrls = await getCompetitorUrls(topic.target_keyword, 5)
  
  // Extract keywords from competitors AND gather as sources
  const competitorKeywords: string[] = []
  const discoveredSources: Source[] = []
  
  if (autoResearch && competitorUrls.length > 0) {
    callbacks.onPhaseChange('keywords', `Researching ${competitorUrls.length} sources...`)
    
    for (const url of competitorUrls.slice(0, 3)) {
      try {
        const content = await scrapeUrl(url)
        if (content?.content && content.content.length > 500) {
          // Add as source
          const title = (content.metadata?.title as string) || new URL(url).hostname
          discoveredSources.push({
            url,
            title,
            type: 'article',
            content: content.content.slice(0, 3000), // Limit content size
          })
          
          // Extract keywords
          const words = content.content
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 4 && w.length < 20)
          const wordFreq = new Map<string, number>()
          words.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1))
          const topWords = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word)
          competitorKeywords.push(...topWords)
        }
      } catch (e) {
        console.warn('Failed to scrape source:', url)
      }
    }
    
    callbacks.onPhaseChange('keywords', `Found ${discoveredSources.length} reference sources`, {
      sources: discoveredSources.map(s => s.title),
    })
  }
  
  // Combine all keywords
  const allKeywords = [
    ...userKeywords,
    topic.target_keyword,
    ...serpData.suggestions.map(s => s.keyword),
    ...competitorKeywords,
  ]
  
  // Deduplicate
  const unique = [...new Set(allKeywords.map(k => k.toLowerCase()))]
  
  callbacks.onPhaseChange('keywords', `Found ${unique.length} keywords, ${serpData.questions.length} questions`, {
    keywords: unique.slice(0, 20),
    questions: serpData.questions,
  })
  
  return {
    primary: topic.target_keyword,
    secondary: unique.filter(k => k !== topic.target_keyword.toLowerCase()).slice(0, 15),
    questions: serpData.questions,
    discoveredSources,
  }
}

// ============================================================================
// PHASE 4: OUTLINE GENERATION
// ============================================================================

const OUTLINE_SYSTEM = `You create journalistic article outlines.

STRUCTURE (in order):

1. LEDE (1-2 sentences)
   - State the most important fact or tension
   - Plain language, no throat-clearing
   - If reader stops here, they know what happened
   
2. NUT GRAF (1 paragraph)
   - Why this story exists NOW
   - Establishes relevance, scale, or consequence
   - Answers "why are you telling me this?"

3. FRAMING BRIDGE (1 short paragraph)
   - Transitions from abstract importance to concrete detail
   - Signals what reader will learn next
   - Orientation, not filler

4. BODY BLOCKS (modular, 3-6 blocks)
   Each block answers ONE question:
   - Explanatory: "How does this work?"
   - Context: "Has this happened before?"
   - Attribution: "Who says so?" (source first, then claim)
   - Contrast: "What's the other side?"
   
   Each paragraph does exactly one job.
   Claims immediately anchored to evidence.
   Pattern: claim → attribution → detail
   
   Mark blocks that would benefit from an image.

5. COUNTERBALANCE (1-2 paragraphs)
   - Opposing views or limitations
   - Acknowledge then bound (don't let it derail)
   - Signals intellectual honesty

6. KICKER (1-2 sentences)
   - NOT a summary
   - Returns to opening tension, or
   - Highlights unresolved implication, or
   - Forward-looking fact
   - Ends on meaning, not repetition

CRITICAL RULES:
- Every factual claim must be traceable to a provided source
- If no source supports a claim, mark it clearly or omit it
- No invented statistics or "studies show" without a citation
- Declarative sentences: subject first, verb early
- Adjectives only for precision, not mood`

async function generateOutline(
  topic: TopicSuggestion,
  keywords: { primary: string; secondary: string[]; questions: string[] },
  sources: Source[],
  context: IndustryContext,
  callbacks: ArticlePipelineCallbacks
): Promise<ArticleOutline> {
  callbacks.onPhaseChange('outline', 'Creating journalistic outline...')
  
  const sourceSummary = sources.map(s => 
    `SOURCE: ${s.title}\nURL: ${s.url}\nTYPE: ${s.type}\nCONTENT: ${s.content?.slice(0, 1000) || 'See URL'}`
  ).join('\n\n')
  
  const result = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ArticleOutlineSchema,
    system: OUTLINE_SYSTEM,
    prompt: `Create a journalistic outline for this article:

TOPIC: ${topic.title}
ANGLE: ${topic.angle}
WHY NOW: ${topic.why_now}

TARGET KEYWORD: ${keywords.primary}
SECONDARY KEYWORDS: ${keywords.secondary.join(', ')}
QUESTIONS TO ANSWER: ${keywords.questions.join('; ')}

INDUSTRY CONTEXT:
- Industry: ${context.industry}
- Audience: ${context.target_audience}
- Tone: ${context.tone_observed}

AVAILABLE SOURCES (cite these, don't invent):
${sourceSummary || 'No sources provided - stick to general knowledge only, no specific claims'}

Create the outline. Mark 2-3 body blocks that would benefit from an image.`,
  })
  
  callbacks.onPhaseChange('outline', 'Outline created', result.object)
  return result.object
}

// ============================================================================
// PHASE 5: WRITE ARTICLE
// ============================================================================

async function writeArticle(
  topic: TopicSuggestion,
  outline: ArticleOutline,
  keywords: { primary: string; secondary: string[] },
  sources: Source[],
  context: IndustryContext,
  wordCountTarget: number,
  callbacks: ArticlePipelineCallbacks
): Promise<string> {
  callbacks.onPhaseChange('write', 'Writing article sections...')
  
  const sourceLookup = sources.map(s => 
    `[${s.title}](${s.url}): ${s.content?.slice(0, 500) || 'See link'}`
  ).join('\n')
  
  const result = await generateText({
    model: openai('gpt-4o'),
    system: `You are a skilled journalist writing an article.

RULES:
- Follow the outline EXACTLY
- Each body block becomes one paragraph
- Cite sources using markdown links: [Source Title](url)
- Every factual claim needs a source link
- No invented statistics or claims
- Declarative sentences: subject first, verb early
- Natural paragraph breaks
- Target word count: ${wordCountTarget}

STYLE:
- ${context.tone_observed} tone
- Write for: ${context.target_audience}
- Primary keyword (use naturally): ${keywords.primary}
- Secondary keywords (sprinkle in): ${keywords.secondary.slice(0, 5).join(', ')}

OUTPUT FORMAT:
Return ONLY the article content in markdown format.
Do NOT include the title (that's added separately).
Use ## for section headers where appropriate.
Leave placeholders like [IMAGE: description] where images should go.`,
    prompt: `Write the full article following this outline:

TITLE: ${topic.title}

LEDE:
${outline.lede}

NUT GRAF:
${outline.nut_graf}

FRAMING BRIDGE:
${outline.framing_bridge}

BODY BLOCKS:
${outline.body_blocks.map((b, i) => 
  `${i + 1}. [${b.type.toUpperCase()}] ${b.question_answered}
   Content direction: ${b.content}
   ${b.needs_image ? '[NEEDS IMAGE]' : ''}
   ${b.source_citation ? `Cite: ${b.source_citation}` : ''}`
).join('\n\n')}

COUNTERBALANCE:
${outline.counterbalance}

KICKER:
${outline.kicker}

AVAILABLE SOURCES TO CITE:
${sourceLookup || 'None provided - avoid specific claims'}

Write the complete article now.`,
  })
  
  callbacks.onPhaseChange('write', `Article written: ${result.text.length} chars`)
  return result.text
}

// ============================================================================
// PHASE 6: GENERATE IMAGES
// ============================================================================

async function generateArticleImages(
  article: string,
  topic: TopicSuggestion,
  imageCount: number,
  callbacks: ArticlePipelineCallbacks
): Promise<{ images: GeneratedImage[]; urls: string[] }> {
  callbacks.onPhaseChange('images', `Generating ${imageCount} images...`)
  
  // Extract image placeholders from article
  const imagePlaceholders = article.match(/\[IMAGE: ([^\]]+)\]/g) || []
  
  // Generate prompts for each image
  const imagePrompts = imagePlaceholders.slice(0, imageCount).map(placeholder => {
    const description = placeholder.replace(/\[IMAGE: |\]/g, '')
    return {
      prompt: `Professional blog image for article about "${topic.title}". ${description}. Clean, modern, high-quality.`,
      alt_text: description,
      style: 'photorealistic' as const,
    }
  })
  
  // If not enough placeholders, create generic images
  while (imagePrompts.length < imageCount) {
    imagePrompts.push({
      prompt: `Professional blog header image for article about "${topic.title}" in the context of ${topic.angle}. Clean, modern, editorial style.`,
      alt_text: `Illustration for ${topic.title}`,
      style: 'photorealistic' as const,
    })
  }
  
  const images: GeneratedImage[] = []
  const urls: string[] = []
  
  for (let i = 0; i < imagePrompts.length; i++) {
    callbacks.onPhaseChange('images', `Generating image ${i + 1}/${imagePrompts.length}...`)
    
    const image = await generateImage(imagePrompts[i])
    if (image) {
      images.push(image)
      const url = await saveImageToPublic(image)
      urls.push(url)
    }
  }
  
  callbacks.onPhaseChange('images', `Generated ${images.length} images`, { urls })
  return { images, urls }
}

// ============================================================================
// PHASE 7: ASSEMBLE FINAL ARTICLE
// ============================================================================

async function assembleArticle(
  topic: TopicSuggestion,
  outline: ArticleOutline,
  articleContent: string,
  images: { images: GeneratedImage[]; urls: string[] },
  sources: Source[],
  keywords: { primary: string },
  callbacks: ArticlePipelineCallbacks
): Promise<GeneratedArticle> {
  callbacks.onPhaseChange('assemble', 'Assembling final article...')
  
  // Replace image placeholders with actual images
  let markdown = articleContent
  const imagePlaceholders = markdown.match(/\[IMAGE: ([^\]]+)\]/g) || []
  
  imagePlaceholders.forEach((placeholder, i) => {
    if (images.urls[i]) {
      const altText = images.images[i]?.alt_text || placeholder.replace(/\[IMAGE: |\]/g, '')
      markdown = markdown.replace(placeholder, `![${altText}](${images.urls[i]})`)
    }
  })
  
  // Add title at the beginning
  markdown = `# ${topic.title}\n\n${markdown}`
  
  // Calculate stats
  const wordCount = markdown.split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200) // ~200 words per minute
  
  // Generate meta description
  const metaResult = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Write a 150-160 character SEO meta description for this article:

Title: ${topic.title}
First paragraph: ${outline.lede}

Meta description (150-160 chars):`,
  })
  
  const article: GeneratedArticle = {
    title: topic.title,
    meta_description: metaResult.text.slice(0, 160),
    target_keyword: keywords.primary,
    outline,
    markdown,
    images: images.images.map((img, i) => ({
      id: img.id,
      url: images.urls[i] || '',
      alt_text: img.alt_text,
      placement: i === 0 ? 'after_lede' : 'in_body',
    })),
    sources_cited: sources.map(s => ({
      url: s.url,
      title: s.title,
      cited_in: 'body',
    })),
    word_count: wordCount,
    reading_time_minutes: readingTime,
  }
  
  callbacks.onPhaseChange('assemble', `Article complete: ${wordCount} words, ${readingTime} min read`)
  return article
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export class ArticlePipeline {
  private callbacks: ArticlePipelineCallbacks
  
  constructor(callbacks: ArticlePipelineCallbacks) {
    this.callbacks = callbacks
  }
  
  async generateTopicSuggestions(input: {
    websiteUrl: string
    blogUrl?: string
    sources: Source[]
  }): Promise<TopicSuggestion[]> {
    try {
      // Scrape and analyze
      const { mainContent, blogContent } = await scrapeWebsite(
        input.websiteUrl,
        input.blogUrl,
        this.callbacks
      )
      
      const context = await analyzeIndustry(mainContent, blogContent, this.callbacks)
      
      // Generate topics
      const topics = await generateTopics(context, input.sources, this.callbacks)
      
      return topics
    } catch (error) {
      console.error('Topic generation error:', error)
      this.callbacks.onError(error instanceof Error ? error.message : 'Failed to generate topics')
      return []
    }
  }
  
  async start(input: ArticleInput, selectedTopic?: TopicSuggestion): Promise<void> {
    try {
      // Phase 1: Scrape
      const { mainContent, blogContent } = await scrapeWebsite(
        input.websiteUrl,
        input.blogUrl,
        this.callbacks
      )
      
      const context = await analyzeIndustry(mainContent, blogContent, this.callbacks)
      
      // Phase 2: Topics (if not provided)
      let topic: TopicSuggestion
      if (selectedTopic) {
        topic = selectedTopic
        this.callbacks.onPhaseChange('topics', `Using selected topic: ${topic.title}`)
      } else if (input.topic) {
        // Generate topic from user's input
        const sources = input.sources || []
        const topics = await generateTopics(context, sources, this.callbacks)
        topic = topics.find(t => 
          t.title.toLowerCase().includes(input.topic!.toLowerCase())
        ) || topics[0]
      } else {
        const sources = input.sources || []
        const topics = await generateTopics(context, sources, this.callbacks)
        topic = topics[0]
      }
      
      if (!topic) {
        throw new Error('No topic available')
      }
      
      // Phase 3: Keywords + Auto-Research Sources
      const autoResearch = input.autoResearch !== false // Default true
      const keywordResult = await researchKeywordsAndSources(
        topic,
        input.targetKeywords || [],
        autoResearch,
        this.callbacks
      )
      
      // Combine user sources with discovered sources
      const allSources: Source[] = [
        ...(input.sources || []),
        ...keywordResult.discoveredSources,
      ]
      
      // Add additional context as a "source" if provided
      if (input.additionalContext) {
        allSources.push({
          url: input.websiteUrl,
          title: 'User Notes',
          type: 'other',
          content: input.additionalContext,
        })
      }
      
      // Phase 4: Outline
      const outline = await generateOutline(
        topic,
        keywordResult,
        allSources,
        context,
        this.callbacks
      )
      
      // Phase 5: Write
      const articleContent = await writeArticle(
        topic,
        outline,
        keywordResult,
        allSources,
        context,
        input.wordCountTarget || 1500,
        this.callbacks
      )
      
      // Phase 6: Images
      const images = await generateArticleImages(
        articleContent,
        topic,
        input.imageCount || 2,
        this.callbacks
      )
      
      // Phase 7: Assemble
      const article = await assembleArticle(
        topic,
        outline,
        articleContent,
        images,
        allSources,
        keywordResult,
        this.callbacks
      )
      
      this.callbacks.onPhaseChange('complete', 'Article generation complete')
      this.callbacks.onArticleReady(article)
      
    } catch (error) {
      console.error('Article pipeline error:', error)
      this.callbacks.onError(error instanceof Error ? error.message : 'An error occurred')
    }
  }
}

