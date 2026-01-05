'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Plus, RotateCcw, Clock, FileText, PenTool, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ============================================================================
// TYPES
// ============================================================================

type EmailType = 'welcome' | 'abandoned_cart' | 'nurture' | 'launch' | 'reengagement'

type Phase = 'input' | 'scraping' | 'outlining' | 'writing' | 'done' | 'error'

interface FormData {
  company_name: string
  website_url: string
  email_type: EmailType | ''
  sender_name: string
  product_focus: string
}

interface EmailResult {
  outline: {
    topic: string
    angle: string
    opener: string
    body_points: string[]
    closer: string
    facts_used: string[]
  }
  email: {
    subject: string
    body: string
    shorter: string
    warmer: string
  }
  timing: {
    outline: number
    write: number
    variants: number
  }
}

const EMAIL_TYPES: { value: EmailType; label: string; desc: string }[] = [
  { value: 'welcome', label: 'Welcome', desc: 'New subscriber greeting' },
  { value: 'abandoned_cart', label: 'Abandoned Cart', desc: 'Recover lost sales' },
  { value: 'nurture', label: 'Nurture', desc: 'Build relationship with value' },
  { value: 'launch', label: 'Launch', desc: 'Announce something new' },
  { value: 'reengagement', label: 'Re-engagement', desc: 'Win back inactive users' },
]

// ============================================================================
// PROGRESS DISPLAY
// ============================================================================

function PhaseProgress({ phase, timing }: { phase: Phase; timing?: EmailResult['timing'] }) {
  const phases = [
    { id: 'scraping', label: 'Scan Website', icon: FileText },
    { id: 'outlining', label: 'Create Outline', icon: PenTool },
    { id: 'writing', label: 'Write Email', icon: Wand2 },
  ]

  const getPhaseStatus = (phaseId: string) => {
    const order = ['scraping', 'outlining', 'writing', 'done']
    const currentIndex = order.indexOf(phase)
    const phaseIndex = order.indexOf(phaseId)
    
    if (phaseIndex < currentIndex) return 'complete'
    if (phaseIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          {phases.map((p, i) => {
            const status = getPhaseStatus(p.id)
            const Icon = p.icon
            
            return (
              <div key={p.id} className="flex items-center gap-3 flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${status === 'complete' ? 'bg-primary text-primary-foreground' : ''}
                  ${status === 'active' ? 'bg-primary/20 text-primary border-2 border-primary' : ''}
                  ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {status === 'active' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    status === 'pending' ? 'text-muted-foreground' : ''
                  }`}>
                    {p.label}
                  </p>
                  {status === 'complete' && timing && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {p.id === 'scraping' && 'Done'}
                      {p.id === 'outlining' && `${Math.round(timing.outline / 1000)}s`}
                      {p.id === 'writing' && `${Math.round((timing.write + timing.variants) / 1000)}s`}
                    </p>
                  )}
                </div>
                {i < phases.length - 1 && (
                  <div className={`h-0.5 w-8 ${
                    getPhaseStatus(phases[i + 1].id) !== 'pending' ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// OUTPUT DISPLAY
// ============================================================================

function OutputPanel({ result }: { result: EmailResult }) {
  const [activeTab, setActiveTab] = useState<'main' | 'shorter' | 'warmer'>('main')
  const [copied, setCopied] = useState(false)
  const [showOutline, setShowOutline] = useState(false)

  const tabs = [
    { id: 'main' as const, label: 'Main', content: result.email.body },
    { id: 'shorter' as const, label: 'Shorter', content: result.email.shorter },
    { id: 'warmer' as const, label: 'Warmer', content: result.email.warmer },
  ]

  const currentContent = tabs.find(t => t.id === activeTab)?.content || result.email.body

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Subject line */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Subject:</Label>
              <span className="font-medium">{result.email.subject}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(result.email.subject)}
              className="text-xs"
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main email output */}
      <Card className="border-2 border-primary/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Email
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-sm">
            {currentContent}
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
            <span className="text-xs text-muted-foreground">
              {showOutline ? '−' : '+'}
            </span>
          </button>
        </CardHeader>
        {showOutline && (
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Topic:</span> {result.outline.topic}</p>
              <p><span className="font-medium">Angle:</span> {result.outline.angle}</p>
              <p><span className="font-medium">Facts used:</span></p>
              <ul className="list-disc list-inside ml-2 text-muted-foreground">
                {result.outline.facts_used.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HomePage() {
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    website_url: '',
    email_type: '',
    sender_name: '',
    product_focus: '',
  })

  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState<EmailResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isFormValid = () => {
    return (
      formData.company_name.trim() &&
      formData.website_url.startsWith('http') &&
      formData.email_type
    )
  }

  const handleStart = async () => {
    if (!isFormValid()) return

    setPhase('scraping')
    setResult(null)
    setError(null)

    try {
      // Step 1: Scrape website
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.website_url }),
      })

      if (!scrapeResponse.ok) {
        const err = await scrapeResponse.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to scrape website')
      }

      const scrapeData = await scrapeResponse.json()
      
      if (!scrapeData.content || scrapeData.content.length < 100) {
        throw new Error('Could not get enough content from website')
      }

      // Step 2-4: Run email pipeline
      setPhase('outlining')

      const emailResponse = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteContent: scrapeData.content,
          emailType: formData.email_type,
          companyName: formData.company_name,
          senderName: formData.sender_name || formData.company_name,
          productOrTopic: formData.product_focus || undefined,
        }),
      })

      // Update to writing phase while waiting
      setPhase('writing')

      const emailData = await emailResponse.json()

      if (!emailData.success) {
        throw new Error(emailData.error || 'Failed to generate email')
      }

      setResult(emailData)
      setPhase('done')

    } catch (err) {
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleReset = () => {
    setPhase('input')
    setResult(null)
    setError(null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Email Copy That{' '}
          <span className="text-primary">Actually Works</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Drop your URL. Pick a type. Get copy in seconds.
        </p>
      </div>

      {/* Progress - show during pipeline */}
      {phase !== 'input' && phase !== 'error' && (
        <PhaseProgress phase={phase} timing={result?.timing} />
      )}

      {/* Input Form */}
      {phase === 'input' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What are you writing?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Website URL - first because it's most important */}
            <div className="space-y-2">
              <Label htmlFor="website_url" className="flex items-center justify-between">
                <span>
                  Your Website <span className="text-destructive">*</span>
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  We'll extract product info from here
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

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                placeholder="e.g., G's All Purpose Cleaning"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>

            {/* Email Type */}
            <div className="space-y-2">
              <Label>
                Email Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.email_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, email_type: v as EmailType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What kind of email?" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="font-medium">{type.label}</span>
                      <span className="text-muted-foreground ml-2">— {type.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional fields in a row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender_name" className="text-muted-foreground">
                  Sender Name
                </Label>
                <Input
                  id="sender_name"
                  placeholder="Defaults to company"
                  value={formData.sender_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, sender_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_focus" className="text-muted-foreground">
                  Specific Product/Topic
                </Label>
                <Input
                  id="product_focus"
                  placeholder="Optional focus"
                  value={formData.product_focus}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_focus: e.target.value }))}
                />
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStart}
              disabled={!isFormValid()}
              className="w-full h-12 text-lg gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Generate Email
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {phase === 'error' && error && (
        <Card className="border-2 border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output */}
      {phase === 'done' && result && (
        <>
          <OutputPanel result={result} />
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
