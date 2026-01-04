'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Loader2, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InteractiveTerminal } from '@/components/features/pipeline/interactive-terminal'
import { getEmailTypeOptions } from '@/core/email-requirements'
import type { PipelinePhase, CopyOutput } from '@/core/pipeline/question-orchestrator'
import type { ScanResult, QuestionForUser } from '@/lib/schemas/scan-result'

// ============================================================================
// TYPES
// ============================================================================

type AppStatus = 'input' | 'scanning' | 'questions' | 'writing' | 'complete' | 'error'

interface FormData {
  company_name: string
  website_url: string
  email_type: string
  target_audience: string
  sender_persona: string
}

// ============================================================================
// OUTPUT PANEL
// ============================================================================

interface OutputPanelProps {
  copy: CopyOutput | null
  isVisible: boolean
}

function OutputPanel({ copy, isVisible }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'shorter' | 'warmer'>('main')
  const [copied, setCopied] = useState(false)

  if (!isVisible || !copy) return null

  const tabs = [
    { id: 'main', label: 'Main', content: copy.main },
    { id: 'shorter', label: 'Shorter', content: copy.shorter },
    { id: 'warmer', label: 'Warmer', content: copy.warmer },
  ] as const

  const currentContent = tabs.find(t => t.id === activeTab)?.content || copy.main

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-2 border-primary/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Copy
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="gap-1.5"
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

        {/* Subject Lines */}
        {copy.subjectLines.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Subject Lines</p>
            <div className="space-y-1">
              {copy.subjectLines.map((line, i) => (
                <div key={i} className="text-sm p-2 bg-muted/50 rounded">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HomePage() {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    website_url: '',
    email_type: '',
    target_audience: '',
    sender_persona: '',
  })

  // Pipeline state
  const [status, setStatus] = useState<AppStatus>('input')
  const [phase, setPhase] = useState<PipelinePhase>('scan')
  const [phaseMessage, setPhaseMessage] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [questions, setQuestions] = useState<QuestionForUser[]>([])
  const [copyOutput, setCopyOutput] = useState<CopyOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emailTypes = getEmailTypeOptions()

  // Handle form field change
  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.company_name.trim() &&
      formData.email_type.trim() &&
      formData.target_audience.trim()
    )
  }

  // Start the pipeline
  const handleStart = async () => {
    if (!isFormValid()) return

    setStatus('scanning')
    setPhase('scan')
    setPhaseMessage('Scanning website...')
    setCopyOutput(null)
    setError(null)

    try {
      // Scrape website if URL provided
      let websiteContent: string | null = null
      if (formData.website_url.startsWith('http')) {
        setPhaseMessage(`Scanning ${formData.website_url}...`)
        try {
          const scrapeResponse = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: formData.website_url }),
          })
          
          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json()
            websiteContent = scrapeData.content || null
            if (!websiteContent) {
              console.warn('Scrape returned empty content')
            } else {
              console.log('Scraped', websiteContent.length, 'chars')
            }
          } else {
            const errorData = await scrapeResponse.json().catch(() => ({}))
            console.error('Scrape failed:', scrapeResponse.status, errorData)
            setPhaseMessage(`Scrape failed: ${errorData.error || scrapeResponse.status}`)
          }
        } catch (scrapeError) {
          console.error('Scrape error:', scrapeError)
          setPhaseMessage('Website scrape failed - continuing without it')
        }
      }

      // Start pipeline (scan + questions)
      setPhase('analyze')
      setPhaseMessage('Analyzing content...')

      const response = await fetch('/api/pipeline-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          websiteContent,
          emailType: formData.email_type,
          formData: {
            company_name: formData.company_name,
            target_audience: formData.target_audience,
            sender_persona: formData.sender_persona || formData.company_name,
          },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Pipeline failed')
      }

      // Questions ready
      setScanResult(data.scanResult)
      setQuestions(data.questions)
      setStatus('questions')
      setPhase('questions')
      setPhaseMessage('Questions ready')

    } catch (err) {
      setStatus('error')
      setPhase('error')
      setPhaseMessage(err instanceof Error ? err.message : 'Failed to start')
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Handle question answers
  const handleAnswersSubmit = async (answers: Record<string, string>) => {
    if (!scanResult) return

    setStatus('writing')
    setPhase('write')
    setPhaseMessage('Writing copy...')

    try {
      const response = await fetch('/api/pipeline-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          scanResult,
          emailType: formData.email_type,
          formData: {
            company_name: formData.company_name,
            target_audience: formData.target_audience,
            sender_persona: formData.sender_persona || formData.company_name,
          },
          answers,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Writing failed')
      }

      setPhase('complete')
      setPhaseMessage('Done')
      setCopyOutput(data.copy)
      setStatus('complete')

    } catch (err) {
      setStatus('error')
      setPhase('error')
      setPhaseMessage(err instanceof Error ? err.message : 'Writing failed')
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Reset to start over
  const handleReset = () => {
    setStatus('input')
    setPhase('scan')
    setPhaseMessage('')
    setScanResult(null)
    setQuestions([])
    setCopyOutput(null)
    setError(null)
  }

  const showTerminal = status !== 'input'
  const showOutput = status === 'complete' && copyOutput

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Email copy that{' '}
          <span className="text-primary">actually works</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Answer a few questions. Get copy that sounds like you wrote it.
        </p>
      </div>

      {/* Input Form - only show when in input status */}
      {status === 'input' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What are you writing?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Company / Brand Name
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="company_name"
                placeholder="e.g., G's All Purpose Cleaning"
                value={formData.company_name}
                onChange={(e) => handleFieldChange('company_name', e.target.value)}
              />
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="website_url">
                Your Website
              </Label>
              <p className="text-xs text-muted-foreground">
                We'll scan it to get accurate product info
              </p>
              <Input
                id="website_url"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website_url}
                onChange={(e) => handleFieldChange('website_url', e.target.value)}
              />
            </div>

            {/* Email Type */}
            <div className="space-y-2">
              <Label>
                Email Type
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Select
                value={formData.email_type}
                onValueChange={(v) => handleFieldChange('email_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select email type..." />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">
                Who is this for?
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="target_audience"
                placeholder="e.g., Homeowners who care about cleaning but hate the process"
                value={formData.target_audience}
                onChange={(e) => handleFieldChange('target_audience', e.target.value)}
              />
            </div>

            {/* Sender */}
            <div className="space-y-2">
              <Label htmlFor="sender_persona">
                Who is the email from?
              </Label>
              <Input
                id="sender_persona"
                placeholder="e.g., Sarah, Head of Customer Success (defaults to company name)"
                value={formData.sender_persona}
                onChange={(e) => handleFieldChange('sender_persona', e.target.value)}
              />
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStart}
              disabled={!isFormValid()}
              className="w-full h-12 text-lg gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Start Writing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Terminal - show during pipeline */}
      {showTerminal && (
        <InteractiveTerminal
          phase={phase}
          phaseMessage={phaseMessage}
          questions={questions}
          isWaitingForAnswers={status === 'questions'}
          onAnswersSubmit={handleAnswersSubmit}
          facts={scanResult?.facts.map(f => f.content) || []}
          gaps={scanResult?.gaps.map(g => g.description) || []}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-destructive">
              <strong>Error:</strong> {error}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Output */}
      {showOutput && (
        <>
          <OutputPanel copy={copyOutput} isVisible={true} />
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
