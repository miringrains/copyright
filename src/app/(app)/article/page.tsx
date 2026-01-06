'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, RotateCcw, Download, Copy, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArticleTerminal } from '@/components/features/pipeline/article-terminal'
import type { TopicSuggestion, GeneratedArticle } from '@/lib/schemas/article'
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
// TOPIC CARD
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
          ? 'border-primary bg-primary/5 ring-2 ring-primary' 
          : 'hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="font-semibold">{topic.title}</div>
      <div className="text-sm text-muted-foreground mt-1">{topic.angle}</div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {topic.target_keyword}
        </span>
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
      {/* Stats */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div><span className="text-muted-foreground">Words:</span> {article.word_count}</div>
            <div><span className="text-muted-foreground">Read time:</span> {article.reading_time_minutes} min</div>
            <div><span className="text-muted-foreground">Images:</span> {article.images.length}</div>
          </div>
        </CardContent>
      </Card>
      
      {/* Outline */}
      <Card>
        <CardHeader className="pb-2">
          <button onClick={() => setShowOutline(!showOutline)} className="flex items-center justify-between w-full">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outline</CardTitle>
            {showOutline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {showOutline && (
          <CardContent className="pt-0 text-sm space-y-2">
            <p><strong>Lede:</strong> {article.outline.lede}</p>
            <p><strong>Nut Graf:</strong> {article.outline.nut_graf}</p>
          </CardContent>
        )}
      </Card>
      
      {/* Article */}
      <Card className="border-2 border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleDownload}><Download className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>{copied ? 'Copied!' : <Copy className="h-4 w-4" />}</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <article className="
            prose prose-zinc dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:border-border
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            prose-p:leading-7 prose-p:mb-4
            prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
            prose-hr:my-8 prose-hr:border-border
            prose-strong:font-semibold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          ">
            <ReactMarkdown>{article.markdown}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
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
  
  // Auto-add https if missing
  const normalizeUrl = (url: string) => {
    if (!url) return ''
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url
    }
    return url
  }
  
  const isUrlValid = () => {
    const url = normalizeUrl(formData.website_url)
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  const handleDiscoverTopics = async () => {
    if (!isUrlValid()) return
    
    const url = normalizeUrl(formData.website_url)
    setFormData(prev => ({ ...prev, website_url: url }))
    setIsDiscovering(true)
    setError(null)
    
    try {
      const response = await fetch('/api/article/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url }),
      })
      
      const data = await response.json()
      
      if (!data.success) throw new Error(data.error || 'Failed to discover topics')
      
      setTopics(data.topics || [])
      setStep('topics')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsDiscovering(false)
    }
  }
  
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
          autoResearch: true,
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
            if (event.type === 'phase_update') setPhase(event.phase as Phase)
            else if (event.type === 'article_ready') {
              setArticle(event.article)
              setPhase('complete')
            } else if (event.type === 'error') throw new Error(event.message)
          } catch (e) {
            console.error('Parse error:', e)
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
  
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Article Generator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter your URL and we'll find interesting topics to write about
        </p>
      </div>
      
      {/* Terminal - shows during generation */}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Enter Your Website
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="yourcompany.com"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                className="text-lg"
              />
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <Button
              onClick={handleDiscoverTopics}
              disabled={!formData.website_url.trim() || isDiscovering}
              className="w-full h-11 gap-2"
            >
              {isDiscovering ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Discovering Topics...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Discover Article Ideas</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Topic Selection */}
      {step === 'topics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pick a Topic ({topics.length} found)</h2>
            <Button variant="ghost" size="sm" onClick={handleReset}>← Change URL</Button>
          </div>
          
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
          
          {selectedTopicIndex !== null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Words</Label>
                    <Select value={String(formData.word_count)} onValueChange={(v) => setFormData(prev => ({ ...prev, word_count: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="800">~800</SelectItem>
                        <SelectItem value="1200">~1200</SelectItem>
                        <SelectItem value="1500">~1500</SelectItem>
                        <SelectItem value="2000">~2000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Images</Label>
                    <Select value={String(formData.image_count)} onValueChange={(v) => setFormData(prev => ({ ...prev, image_count: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tone</Label>
                    <Select value={formData.tone} onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v as FormData['tone'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Additional Context (optional)</Label>
                  <Textarea
                    placeholder="Any specific points or angle..."
                    value={formData.additional_context}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_context: e.target.value }))}
                    className="min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          <Button onClick={handleGenerate} disabled={selectedTopicIndex === null} className="w-full h-11 gap-2">
            <FileText className="h-4 w-4" /> Generate Article
          </Button>
        </div>
      )}
      
      {/* Error */}
      {phase === 'error' && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-2" /> Try Again</Button>
        </div>
      )}
      
      {/* Output */}
      {phase === 'complete' && article && (
        <>
          <ArticleOutput article={article} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleReset}><Plus className="h-4 w-4 mr-2" /> Write Another</Button>
          </div>
        </>
      )}
    </div>
  )
}
