'use client'

import { useState, useEffect } from 'react'
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
// DISCOVERY TERMINAL
// ============================================================================

function DiscoveryTerminal({ websiteUrl }: { websiteUrl: string }) {
  const [lines, setLines] = useState<string[]>([])
  const domain = websiteUrl ? new URL(websiteUrl).hostname : 'site'
  
  useEffect(() => {
    const steps = [
      `$ curl -s "${websiteUrl}"`,
      `  → connecting to ${domain}...`,
      `  → downloading page content...`,
      `  ✓ received 47.2KB`,
      ``,
      `$ analyze --extract-industry`,
      `  → parsing HTML structure...`,
      `  → identifying business context...`,
      `  → mapping content gaps...`,
      `  ✓ industry detected`,
      ``,
      `$ generate --topics --count=7`,
      `  → cross-referencing with existing blog...`,
      `  → finding unique angles...`,
      `  → ranking by search potential...`,
    ]
    
    let i = 0
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLines(prev => [...prev, steps[i]])
        i++
      }
    }, 120)
    
    return () => clearInterval(interval)
  }, [websiteUrl, domain])
  
  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-[#0d0d0d] shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-zinc-500 font-mono">
            discover — running
          </span>
        </div>
      </div>
      
      <div className="h-[280px] overflow-y-auto font-mono text-[13px] leading-relaxed p-4 space-y-0.5"
        style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #111 100%)' }}
      >
        {lines.map((line, i) => (
          <div 
            key={i} 
            className={
              line.startsWith('$') ? 'text-cyan-400 font-semibold' :
              line.startsWith('  ✓') ? 'text-emerald-400' :
              line.startsWith('  →') ? 'text-zinc-400' :
              'text-zinc-600'
            }
          >
            {line || '\u00A0'}
          </div>
        ))}
        <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse" />
      </div>
      
      <div className="px-4 py-1.5 bg-zinc-900/60 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono">
        DISCOVERING • {domain}
      </div>
    </div>
  )
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
    <div 
      className={`p-4 rounded-lg border cursor-pointer transition-all font-mono ${
        isSelected 
          ? 'border-cyan-500 bg-cyan-500/10' 
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900'
      }`}
      onClick={onClick}
    >
      <div className="font-medium text-base text-zinc-100">{topic.title}</div>
      <div className="text-sm text-zinc-400 mt-1.5">{topic.angle}</div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 font-mono">
          {topic.target_keyword}
        </span>
        <span className="text-xs text-zinc-500">
          {topic.estimated_search_volume} interest
        </span>
      </div>
      <div className="text-xs text-zinc-500 mt-2">
        → {topic.why_now}
      </div>
    </div>
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
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          article-generator v1.0
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-mono">
          <span className="text-zinc-400">$</span> generate <span className="text-cyan-400">--article</span>
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          url in → researched article out
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
      {step === 'url' && !isDiscovering && (
        <Card className="border border-zinc-800 bg-zinc-950/50">
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-3">
              <Label htmlFor="website_url" className="text-zinc-400 text-sm font-mono">
                TARGET_URL
              </Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                className="text-lg h-14 bg-zinc-900 border-zinc-700 font-mono placeholder:text-zinc-600"
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-400 font-mono">error: {error}</p>
            )}
            
            <Button
              onClick={handleDiscoverTopics}
              disabled={!isUrlValid()}
              className="w-full h-14 text-lg gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono"
            >
              <Sparkles className="h-5 w-5" />
              run discover --topics
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Discovery Terminal */}
      {step === 'url' && isDiscovering && (
        <DiscoveryTerminal websiteUrl={formData.website_url} />
      )}
      
      {/* Step 2: Topic Selection */}
      {step === 'topics' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="font-mono text-sm text-zinc-400">
              <span className="text-emerald-400">✓</span> found {topics.length} topics for {formData.website_url ? new URL(formData.website_url).hostname : 'site'}
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-zinc-500 hover:text-zinc-300 font-mono text-xs">
              ← back
            </Button>
          </div>
          
          {/* Topic Grid */}
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
          
          {/* Options (show when topic selected) */}
          {selectedTopicIndex !== null && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                OPTIONS
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-zinc-400">WORDS</Label>
                  <Select
                    value={String(formData.word_count)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, word_count: Number(v) }))}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 font-mono">
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
                  <Label className="text-xs font-mono text-zinc-400">IMAGES</Label>
                  <Select
                    value={String(formData.image_count)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, image_count: Number(v) }))}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-zinc-400">TONE</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v as FormData['tone'] }))}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational">casual</SelectItem>
                      <SelectItem value="formal">formal</SelectItem>
                      <SelectItem value="technical">technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-mono text-zinc-400">CONTEXT (optional)</Label>
                <Textarea
                  placeholder="specific points, data, or angle..."
                  value={formData.additional_context}
                  onChange={(e) => setFormData(prev => ({ ...prev, additional_context: e.target.value }))}
                  className="min-h-[60px] bg-zinc-900 border-zinc-700 font-mono text-sm placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}
          
          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={selectedTopicIndex === null}
            className="w-full h-14 text-lg gap-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <FileText className="h-5 w-5" />
            run generate --article
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

