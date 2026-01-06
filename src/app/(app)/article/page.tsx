'use client'

import { useState } from 'react'
import { FileText, Plus, RotateCcw, Trash2, Link, Download, Copy, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArticleTerminal } from '@/components/features/pipeline/article-terminal'
import type { TopicSuggestion, Source, GeneratedArticle } from '@/lib/schemas/article'
import ReactMarkdown from 'react-markdown'

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'input' | 'discovering' | 'scrape' | 'topics' | 'keywords' | 'outline' | 'write' | 'images' | 'assemble' | 'complete' | 'error'
type Step = 'url' | 'topics' | 'generating'

interface FormData {
  website_url: string
  word_count: number
  image_count: number
  tone: 'formal' | 'conversational' | 'technical'
  additional_context: string
}

// ============================================================================
// TOPIC CARD COMPONENT
// ============================================================================

function TopicCard({
  topic,
  isSelected,
  onClick,
}: {
  topic: TopicSuggestion
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Card 
      className={`p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
          : 'hover:border-primary/50 hover:bg-muted/30'
      }`}
      onClick={onClick}
    >
      <div className="font-medium text-base">{topic.title}</div>
      <div className="text-sm text-muted-foreground mt-1.5">{topic.angle}</div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {topic.target_keyword}
        </span>
        <span className="text-xs text-muted-foreground">
          {topic.estimated_search_volume} interest
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 italic">
        "{topic.why_now}"
      </div>
    </Card>
  )
}

// ============================================================================
// ARTICLE OUTPUT
// ============================================================================

function ArticleOutput({ article }: { article: GeneratedArticle }) {
  const [copied, setCopied] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(article.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleDownload = () => {
    const blob = new Blob([article.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${article.title.toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="space-y-4">
      {/* Meta info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Words:</span>{' '}
              <span className="font-medium">{article.word_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Read time:</span>{' '}
              <span className="font-medium">{article.reading_time_minutes} min</span>
            </div>
            <div>
              <span className="text-muted-foreground">Images:</span>{' '}
              <span className="font-medium">{article.images.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sources:</span>{' '}
              <span className="font-medium">{article.sources_cited.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* SEO */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Target Keyword:</Label>
            <span className="font-medium text-primary">{article.target_keyword}</span>
          </div>
          <div>
            <Label className="text-muted-foreground">Meta Description:</Label>
            <p className="text-sm mt-1">{article.meta_description}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Outline (collapsible) */}
      <Card>
        <CardHeader className="pb-2">
          <button 
            onClick={() => setShowOutline(!showOutline)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-sm font-medium text-muted-foreground">
              View Outline
            </CardTitle>
            {showOutline ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showOutline && (
          <CardContent className="pt-0 space-y-3 text-sm">
            <div>
              <span className="font-medium text-primary">Lede:</span>
              <p className="text-muted-foreground">{article.outline.lede}</p>
            </div>
            <div>
              <span className="font-medium text-primary">Nut Graf:</span>
              <p className="text-muted-foreground">{article.outline.nut_graf}</p>
            </div>
            <div>
              <span className="font-medium text-primary">Body Blocks:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {article.outline.body_blocks.map((block, i) => (
                  <li key={i}>
                    [{block.type}] {block.question_answered}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium text-primary">Kicker:</span>
              <p className="text-muted-foreground">{article.outline.kicker}</p>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Main article */}
      <Card className="border-2 border-primary/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {article.title}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                <Download className="h-4 w-4" />
                .md
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? 'Copied!' : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{article.markdown}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
      
      {/* Sources */}
      {article.sources_cited.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sources Cited</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm space-y-1">
              {article.sources_cited.map((source, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Link className="h-3 w-3 text-muted-foreground" />
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ArticlePage() {
  const [formData, setFormData] = useState<FormData>({
    website_url: '',
    word_count: 1500,
    image_count: 2,
    tone: 'conversational',
    additional_context: '',
  })
  
  const [step, setStep] = useState<Step>('url')
  const [phase, setPhase] = useState<Phase>('input')
  const [topics, setTopics] = useState<TopicSuggestion[]>([])
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null)
  const [article, setArticle] = useState<GeneratedArticle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)
  
  const isUrlValid = () => formData.website_url.startsWith('http')
  
  // Step 1: Discover topics from URL
  const handleDiscoverTopics = async () => {
    if (!isUrlValid()) return
    
    setIsDiscovering(true)
    setError(null)
    
    try {
      const response = await fetch('/api/article/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: formData.website_url,
        }),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to discover topics')
      }
      
      setTopics(data.topics || [])
      setStep('topics')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsDiscovering(false)
    }
  }
  
  // Step 2: Generate article from selected topic
  const handleGenerate = async () => {
    if (selectedTopicIndex === null) return
    
    setStep('generating')
    setPhase('scrape')
    setArticle(null)
    setError(null)
    
    try {
      const response = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: formData.website_url,
          selectedTopic: topics[selectedTopicIndex],
          wordCountTarget: formData.word_count,
          imageCount: formData.image_count,
          tone: formData.tone,
          additionalContext: formData.additional_context || undefined,
          autoResearch: true, // Flag to auto-find sources
        }),
      })
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Failed to start stream')
      
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            
            if (event.type === 'phase_update') {
              setPhase(event.phase as Phase)
            } else if (event.type === 'article_ready') {
              setArticle(event.article)
              setPhase('complete')
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch (e) {
            console.error('Parse error:', e, line)
          }
        }
      }
      
    } catch (err) {
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }
  
  const handleReset = () => {
    setStep('url')
    setPhase('input')
    setArticle(null)
    setError(null)
    setTopics([])
    setSelectedTopicIndex(null)
  }
  
  const handleBackToTopics = () => {
    setStep('topics')
    setPhase('input')
    setError(null)
  }
  
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Article Generator
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Drop your URL. We'll find interesting topics and write the article.
        </p>
      </div>
      
      {/* Terminal - show during generation */}
      {step === 'generating' && (
        <ArticleTerminal
          phase={phase}
          websiteUrl={formData.website_url}
          topic={selectedTopicIndex !== null ? topics[selectedTopicIndex]?.title : undefined}
          error={error}
        />
      )}
      
      {/* Step 1: URL Input */}
      {step === 'url' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What's your website?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="website_url">
                Website URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                className="text-lg h-12"
              />
              <p className="text-sm text-muted-foreground">
                We'll analyze your site to suggest relevant article topics
              </p>
            </div>
            
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            
            <Button
              onClick={handleDiscoverTopics}
              disabled={!isUrlValid() || isDiscovering}
              className="w-full h-12 text-lg gap-2"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Discovering Topics...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Discover Article Ideas
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Topic Selection */}
      {step === 'topics' && (
        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Pick a Topic
                </span>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Change URL
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We found {topics.length} article ideas for your site. Pick one:
              </p>
              
              <div className="grid gap-3">
                {topics.map((topic, i) => (
                  <TopicCard
                    key={i}
                    topic={topic}
                    isSelected={selectedTopicIndex === i}
                    onClick={() => setSelectedTopicIndex(i)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Options (collapsed by default) */}
          {selectedTopicIndex !== null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Word Count</Label>
                    <Select
                      value={String(formData.word_count)}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, word_count: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="800">~800</SelectItem>
                        <SelectItem value="1200">~1200</SelectItem>
                        <SelectItem value="1500">~1500</SelectItem>
                        <SelectItem value="2000">~2000</SelectItem>
                        <SelectItem value="2500">~2500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Images</Label>
                    <Select
                      value={String(formData.image_count)}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, image_count: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Tone</Label>
                    <Select
                      value={formData.tone}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v as FormData['tone'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Additional Context (optional)</Label>
                  <Textarea
                    placeholder="Any specific points you want covered, data to include, or angle to take..."
                    value={formData.additional_context}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_context: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={selectedTopicIndex === null}
            className="w-full h-12 text-lg gap-2"
          >
            <FileText className="h-5 w-5" />
            Generate Article
          </Button>
        </div>
      )}
      
      {/* Error during generation */}
      {step === 'generating' && phase === 'error' && (
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleBackToTopics} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Pick Different Topic
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            Start Over
          </Button>
        </div>
      )}
      
      {/* Output */}
      {phase === 'complete' && article && (
        <>
          <ArticleOutput article={article} />
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleBackToTopics} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Pick Different Topic
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <Plus className="h-4 w-4" />
              New Site
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

