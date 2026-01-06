'use client'

import { useState } from 'react'
import { FileText, Plus, RotateCcw, Trash2, Link, Download, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArticleTerminal } from '@/components/features/pipeline/article-terminal'
import type { TopicSuggestion, Source, GeneratedArticle, ArticleOutline } from '@/lib/schemas/article'
import ReactMarkdown from 'react-markdown'

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'input' | 'scrape' | 'topics' | 'keywords' | 'outline' | 'write' | 'images' | 'assemble' | 'complete' | 'error'

interface FormData {
  website_url: string
  blog_url: string
  sources: Source[]
  target_keywords: string
  topic: string
  word_count: number
  image_count: number
  tone: 'formal' | 'conversational' | 'technical'
}

// ============================================================================
// SOURCE INPUT COMPONENT
// ============================================================================

function SourceInput({ 
  sources, 
  onAdd, 
  onRemove, 
  onUpdate 
}: { 
  sources: Source[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: keyof Source, value: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          Research Sources
        </Label>
        <Button variant="outline" size="sm" onClick={onAdd} className="gap-1">
          <Plus className="h-3 w-3" />
          Add Source
        </Button>
      </div>
      
      {sources.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add links or paste research content for factual citations
        </p>
      )}
      
      {sources.map((source, i) => (
        <Card key={i} className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Source URL"
              value={source.url}
              onChange={(e) => onUpdate(i, 'url', e.target.value)}
              className="flex-1"
            />
            <Select 
              value={source.type} 
              onValueChange={(v) => onUpdate(i, 'type', v)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="study">Study</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="quote">Quote</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => onRemove(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <Input
            placeholder="Title/Description"
            value={source.title}
            onChange={(e) => onUpdate(i, 'title', e.target.value)}
          />
          <Textarea
            placeholder="Relevant excerpt or notes (optional)"
            value={source.content || ''}
            onChange={(e) => onUpdate(i, 'content', e.target.value)}
            className="min-h-[60px]"
          />
        </Card>
      ))}
    </div>
  )
}

// ============================================================================
// TOPIC SELECTOR
// ============================================================================

function TopicSelector({
  topics,
  selectedIndex,
  onSelect,
  customTopic,
  onCustomTopicChange,
}: {
  topics: TopicSuggestion[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  customTopic: string
  onCustomTopicChange: (value: string) => void
}) {
  const [showCustom, setShowCustom] = useState(false)
  
  if (topics.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Topic (optional)</Label>
        <Input
          placeholder="Enter your own topic or let us suggest one"
          value={customTopic}
          onChange={(e) => onCustomTopicChange(e.target.value)}
        />
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      <Label>Select a Topic</Label>
      <div className="grid gap-2">
        {topics.map((topic, i) => (
          <Card 
            key={i}
            className={`p-3 cursor-pointer transition-colors ${
              selectedIndex === i 
                ? 'border-primary bg-primary/5' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelect(i)}
          >
            <div className="font-medium">{topic.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{topic.angle}</div>
            <div className="text-xs text-primary mt-2">
              Target: {topic.target_keyword}
            </div>
          </Card>
        ))}
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setShowCustom(!showCustom)}
        className="text-muted-foreground"
      >
        {showCustom ? 'Hide' : 'Or enter your own topic'}
      </Button>
      
      {showCustom && (
        <Input
          placeholder="Enter your own topic"
          value={customTopic}
          onChange={(e) => onCustomTopicChange(e.target.value)}
        />
      )}
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
    blog_url: '',
    sources: [],
    target_keywords: '',
    topic: '',
    word_count: 1500,
    image_count: 2,
    tone: 'conversational',
  })
  
  const [phase, setPhase] = useState<Phase>('input')
  const [topics, setTopics] = useState<TopicSuggestion[]>([])
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null)
  const [article, setArticle] = useState<GeneratedArticle | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const isFormValid = () => {
    return formData.website_url.startsWith('http') && formData.sources.length > 0
  }
  
  const addSource = () => {
    setFormData(prev => ({
      ...prev,
      sources: [...prev.sources, { url: '', title: '', type: 'article', content: '' }],
    }))
  }
  
  const removeSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index),
    }))
  }
  
  const updateSource = (index: number, field: keyof Source, value: string) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.map((s, i) => 
        i === index ? { ...s, [field]: value } : s
      ),
    }))
  }
  
  const handleStart = async () => {
    if (!isFormValid()) return
    
    setPhase('scrape')
    setArticle(null)
    setError(null)
    
    try {
      const response = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: formData.website_url,
          blogUrl: formData.blog_url || undefined,
          sources: formData.sources.filter(s => s.url || s.content),
          targetKeywords: formData.target_keywords.split(',').map(k => k.trim()).filter(Boolean),
          topic: formData.topic || undefined,
          selectedTopic: selectedTopicIndex !== null ? topics[selectedTopicIndex] : undefined,
          wordCountTarget: formData.word_count,
          imageCount: formData.image_count,
          tone: formData.tone,
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
              
              // Capture topics if returned
              if (event.data?.topics) {
                setTopics(event.data.topics)
              }
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
    setPhase('input')
    setArticle(null)
    setError(null)
    setTopics([])
    setSelectedTopicIndex(null)
  }
  
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Article Generator{' '}
          <span className="text-primary">That Writes Like a Journalist</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Provide your sources. Get factual, well-structured articles.
        </p>
      </div>
      
      {/* Terminal */}
      {phase !== 'input' && (
        <ArticleTerminal
          phase={phase}
          websiteUrl={formData.website_url}
          topic={selectedTopicIndex !== null ? topics[selectedTopicIndex]?.title : formData.topic}
          error={error}
        />
      )}
      
      {/* Input Form */}
      {phase === 'input' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              What are you writing about?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="website_url" className="flex items-center justify-between">
                <span>
                  Your Website <span className="text-destructive">*</span>
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  We'll understand your industry from here
                </span>
              </Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
              />
            </div>
            
            {/* Blog URL (optional) */}
            <div className="space-y-2">
              <Label htmlFor="blog_url" className="text-muted-foreground">
                Blog URL (if different)
              </Label>
              <Input
                id="blog_url"
                type="url"
                placeholder="https://yourcompany.com/blog"
                value={formData.blog_url}
                onChange={(e) => setFormData(prev => ({ ...prev, blog_url: e.target.value }))}
              />
            </div>
            
            {/* Sources */}
            <SourceInput
              sources={formData.sources}
              onAdd={addSource}
              onRemove={removeSource}
              onUpdate={updateSource}
            />
            
            {/* Topic */}
            <TopicSelector
              topics={topics}
              selectedIndex={selectedTopicIndex}
              onSelect={setSelectedTopicIndex}
              customTopic={formData.topic}
              onCustomTopicChange={(v) => setFormData(prev => ({ ...prev, topic: v }))}
            />
            
            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords" className="text-muted-foreground">
                Target Keywords (comma separated)
              </Label>
              <Input
                id="keywords"
                placeholder="ai copywriting, content marketing"
                value={formData.target_keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, target_keywords: e.target.value }))}
              />
            </div>
            
            {/* Options row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Word Count</Label>
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
                <Label className="text-muted-foreground">Images</Label>
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
                <Label className="text-muted-foreground">Tone</Label>
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
            
            {/* Start Button */}
            <Button
              onClick={handleStart}
              disabled={!isFormValid()}
              className="w-full h-12 text-lg gap-2"
            >
              <FileText className="h-5 w-5" />
              Generate Article
            </Button>
            
            {!isFormValid() && (
              <p className="text-sm text-muted-foreground text-center">
                Add at least one source with a URL or content
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Error */}
      {phase === 'error' && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
      
      {/* Output */}
      {phase === 'complete' && article && (
        <>
          <ArticleOutput article={article} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <Plus className="h-4 w-4" />
              Write Another
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

