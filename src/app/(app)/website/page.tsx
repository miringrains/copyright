'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Globe, Sparkles, RotateCcw, Copy, ChevronDown, ChevronUp, 
  Check, Loader2, AlertCircle, Search, Lightbulb, Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import type { DomainProfile, WebsiteCopyOutput, WebsiteCopySection } from '@/lib/schemas/website'

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'input' | 'immersing' | 'clarifying' | 'generating' | 'done' | 'error'

interface TerminalLine {
  id: string
  type: 'command' | 'output' | 'success' | 'error' | 'dim'
  content: string
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

function ProcessingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-orange-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ 
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </span>
  )
}

function WebsiteTerminal({ 
  lines, 
  isProcessing 
}: { 
  lines: TerminalLine[]
  isProcessing: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [lines])

  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return 'text-orange-400'
      case 'output': return 'text-zinc-300'
      case 'success': return 'text-emerald-400'
      case 'error': return 'text-red-400'
      case 'dim': return 'text-zinc-500'
      default: return 'text-zinc-400'
    }
  }

  return (
    <Card className="border border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-[13px] overflow-hidden">
      <CardHeader className="py-2 px-3 border-b border-zinc-800/50 bg-zinc-900/50">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-zinc-400">website-pipeline</span>
          {isProcessing && (
            <span className="ml-auto text-[10px] text-zinc-500 uppercase tracking-wider flex items-center">
              running <ProcessingDots />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={scrollRef} className="h-[220px] overflow-y-auto">
          <div className="p-3 space-y-1">
            {lines.map((line) => (
              <div key={line.id} className={`leading-relaxed ${getLineStyle(line.type)}`}>
                {line.type === 'command' && <span className="text-zinc-500 mr-2">$</span>}
                {line.content}
              </div>
            ))}
            {lines.length === 0 && (
              <div className="text-zinc-600 text-center py-8">
                Waiting for input...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DOMAIN PROFILE PREVIEW
// ============================================================================

function DomainProfilePreview({ profile }: { profile: DomainProfile }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Domain Expertise Built
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="secondary">{profile.industry}</Badge>
          <Badge variant="outline">{profile.subNiche}</Badge>
          {profile.location && <Badge variant="outline">{profile.location}</Badge>}
        </div>
        
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3 pt-3 border-t"
          >
            {/* Terminology */}
            <div>
              <Label className="text-xs text-muted-foreground">Domain Terminology</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.terminology.terms.slice(0, 10).map((term, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{term}</Badge>
                ))}
                {profile.terminology.terms.length > 10 && (
                  <Badge variant="outline" className="text-xs">+{profile.terminology.terms.length - 10} more</Badge>
                )}
              </div>
            </div>

            {/* Voice Insights */}
            <div>
              <Label className="text-xs text-muted-foreground">Voice Profile</Label>
              <p className="text-sm mt-1">
                {profile.voiceInsights.relationship.replace('_', ' ')} • 
                {profile.voiceInsights.claimStyle} claims • 
                {profile.voiceInsights.proofStyle.replace('_', ' ')} proof
              </p>
            </div>

            {/* Forbidden */}
            <div>
              <Label className="text-xs text-muted-foreground">Slop to Avoid</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.forbiddenInThisNiche.slice(0, 6).map((phrase, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">{phrase}</Badge>
                ))}
              </div>
            </div>

            {/* Good Examples */}
            {profile.goodExamples.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Good Examples Found</Label>
                <div className="mt-1 space-y-1">
                  {profile.goodExamples.slice(0, 2).map((example, i) => (
                    <p key={i} className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                      "{example.slice(0, 150)}{example.length > 150 ? '...' : ''}"
                    </p>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COPY OUTPUT COMPONENT
// ============================================================================

function CopyOutput({ output }: { output: WebsiteCopyOutput }) {
  const [activeVariant, setActiveVariant] = useState<'primary' | 'direct' | 'story_led' | 'conversational'>('primary')
  const [copied, setCopied] = useState(false)

  const variants = [
    { id: 'primary' as const, label: 'Primary', available: true },
    { id: 'direct' as const, label: 'Direct', available: !!output.variants.direct },
    { id: 'story_led' as const, label: 'Story-Led', available: !!output.variants.story_led },
    { id: 'conversational' as const, label: 'Conversational', available: !!output.variants.conversational },
  ]

  const currentSections = activeVariant === 'primary' 
    ? output.primary.sections 
    : output.variants[activeVariant]?.sections || []

  const handleCopy = async () => {
    const text = currentSections.map(s => {
      let content = ''
      if (s.headline) content += `${s.headline}\n`
      if (s.subheadline) content += `${s.subheadline}\n`
      content += s.body
      if (s.cta) content += `\n\n${s.cta}`
      return content
    }).join('\n\n---\n\n')

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Slop Check Status */}
      <Card className={output.slopChecks.passed ? 'border-emerald-500/30' : 'border-amber-500/30'}>
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            {output.slopChecks.passed ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-600">Slop check passed</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">
                  Some slop detected: {[...output.slopChecks.universalViolations, ...output.slopChecks.domainViolations].slice(0, 3).join(', ')}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Output */}
      <Card className="border-2 border-primary/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Copy
            </span>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variant Tabs */}
          <div className="flex gap-2 border-b">
            {variants.filter(v => v.available).map((variant) => (
              <button
                key={variant.id}
                onClick={() => setActiveVariant(variant.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeVariant === variant.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {currentSections.map((section, i) => (
              <div key={i} className="space-y-2">
                <Badge variant="outline" className="mb-2">{section.type}</Badge>
                {section.headline && (
                  <h3 className="text-xl font-bold">{section.headline}</h3>
                )}
                {section.subheadline && (
                  <p className="text-lg text-muted-foreground">{section.subheadline}</p>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {section.body}
                </div>
                {section.cta && (
                  <p className="font-medium text-primary mt-2">{section.cta}</p>
                )}
                {section.notes && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    Why this works: {section.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// CLARIFYING QUESTIONS
// ============================================================================

function ClarifyingQuestions({
  questions,
  onSubmit,
  isSubmitting,
}: {
  questions: string[]
  onSubmit: (answers: Record<string, string>) => void
  isSubmitting: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    onSubmit(answers)
  }

  return (
    <Card className="border-2 border-amber-500/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Target className="h-5 w-5" />
          We need a bit more detail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, i) => (
          <div key={i} className="space-y-2">
            <Label>{question}</Label>
            <Textarea
              value={answers[question] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [question]: e.target.value }))}
              placeholder="Your answer..."
              className="min-h-[80px]"
            />
          </div>
        ))}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || Object.values(answers).every(a => !a.trim())}
          className="w-full"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            'Continue'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WebsitePage() {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [domainProfile, setDomainProfile] = useState<DomainProfile | null>(null)
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([])
  const [copyOutput, setCopyOutput] = useState<WebsiteCopyOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      content,
    }])
  }, [])

  const normalizeUrl = (url: string) => {
    if (!url) return ''
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url
    }
    return url
  }

  const isFormValid = () => {
    return websiteUrl.trim().length > 0 && prompt.trim().length >= 10
  }

  const handleStart = async (answers?: Record<string, string>) => {
    const url = normalizeUrl(websiteUrl)
    setWebsiteUrl(url)
    setPhase(answers ? 'generating' : 'immersing')
    setError(null)
    setTerminalLines([])
    setCopyOutput(null)

    addLine('command', `website-copy --url="${new URL(url).hostname}"`)

    try {
      const response = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: url,
          prompt,
          answers,
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
              const phaseMap: Record<string, Phase> = {
                'immersion': 'immersing',
                'parsing': 'generating',
                'clarifying': 'clarifying',
                'generating': 'generating',
                'slop_check': 'generating',
                'variants': 'generating',
                'complete': 'done',
                'error': 'error',
              }
              setPhase(phaseMap[event.phase] || 'generating')
              addLine('output', event.message)

              // Capture domain profile when available
              if (event.data?.subNiche && event.phase === 'complete') {
                // Profile might be in the complete event
              }
            } else if (event.type === 'clarifying_questions') {
              setClarifyingQuestions(event.questions)
              setPhase('clarifying')
            } else if (event.type === 'copy_ready') {
              setCopyOutput(event.output)
              setDomainProfile(event.output.domainProfile)
              addLine('success', '✓ Copy generated successfully')
              setPhase('done')
            } else if (event.type === 'error') {
              addLine('error', `✗ ${event.message}`)
              setError(event.message)
              setPhase('error')
            }
          } catch (e) {
            console.error('Parse error:', e)
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      addLine('error', `✗ ${message}`)
      setError(message)
      setPhase('error')
    }
  }

  const handleClarifyingSubmit = (answers: Record<string, string>) => {
    handleStart(answers)
  }

  const handleReset = () => {
    setPhase('input')
    setTerminalLines([])
    setCopyOutput(null)
    setDomainProfile(null)
    setClarifyingQuestions([])
    setError(null)
  }

  const isProcessing = phase === 'immersing' || phase === 'generating'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Website Copy
        </h1>
        <p className="mt-2 text-muted-foreground">
          Expert copy that sounds human, not like AI
        </p>
      </div>

      {/* Terminal - show during processing */}
      {phase !== 'input' && (
        <WebsiteTerminal lines={terminalLines} isProcessing={isProcessing} />
      )}

      {/* Domain Profile Preview */}
      {domainProfile && phase === 'done' && (
        <DomainProfilePreview profile={domainProfile} />
      )}

      {/* Input Form */}
      {phase === 'input' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              What do you need?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="url">
                Website URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                placeholder="yoursite.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll scrape this site and find competitors to build domain expertise
              </p>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">
                What do you want? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="prompt"
                placeholder={`Describe what you need. For example:

"Rewrite the about section. She's been selling Palm Beach real estate for 20 years, was a pro tennis player, specializes in historic homes in West Palm Beach. She's closed 47 historic home sales in the last 3 years."

The more specific facts you provide, the better the copy.`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[160px]"
              />
            </div>

            <Button
              onClick={() => handleStart()}
              disabled={!isFormValid()}
              className="w-full h-12 text-lg gap-2"
            >
              <Search className="h-5 w-5" />
              Build Expertise & Generate Copy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clarifying Questions */}
      {phase === 'clarifying' && clarifyingQuestions.length > 0 && (
        <ClarifyingQuestions
          questions={clarifyingQuestions}
          onSubmit={handleClarifyingSubmit}
          isSubmitting={false}
        />
      )}

      {/* Error */}
      {phase === 'error' && error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output */}
      {phase === 'done' && copyOutput && (
        <CopyOutput output={copyOutput} />
      )}

      {/* Reset Button */}
      {(phase === 'done' || phase === 'error') && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
        </div>
      )}
    </div>
  )
}
