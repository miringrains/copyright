'use client'

import { useState } from 'react'
import { 
  Globe, RotateCcw, Copy, ChevronDown, ChevronUp, 
  Check, Loader2, AlertCircle, Search, FileText,
  CheckCircle, RefreshCw, Pencil
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import type { 
  WebsiteAdvisorOutput, 
  CopyRecommendation, 
  FactInventory,
  SectionAssessment 
} from '@/lib/schemas/website'

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'input' | 'processing' | 'done' | 'error'

// ============================================================================
// FACT INVENTORY DISPLAY
// ============================================================================

function FactInventoryDisplay({ inventory }: { inventory: FactInventory }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-blue-500/30">
      <CardHeader className="pb-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Fact Inventory ({inventory.allFactsList.length} facts)
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Known Facts */}
          <div>
            <Label className="text-xs text-muted-foreground">Known Facts</Label>
            <div className="mt-1 space-y-1">
              {inventory.allFactsList.map((fact, i) => (
                <div key={i} className="text-sm flex items-start gap-2">
                  <Check className="h-3 w-3 text-emerald-500 mt-1 shrink-0" />
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps */}
          {inventory.unknownGaps.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Information Gaps</Label>
              <div className="mt-1 space-y-1">
                {inventory.unknownGaps.map((gap, i) => (
                  <div key={i} className="text-sm flex items-start gap-2 text-amber-600">
                    <AlertCircle className="h-3 w-3 mt-1 shrink-0" />
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus Areas */}
          {inventory.focusAreas.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Focus Areas (since stats missing)</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {inventory.focusAreas.map((area, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{area}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ============================================================================
// SECTION RECOMMENDATION CARD
// ============================================================================

function getActionIcon(action: SectionAssessment) {
  switch (action) {
    case 'keep': return <CheckCircle className="h-4 w-4 text-emerald-500" />
    case 'improve': return <RefreshCw className="h-4 w-4 text-amber-500" />
    case 'rewrite': return <Pencil className="h-4 w-4 text-red-500" />
  }
}

function getActionBadgeVariant(action: SectionAssessment): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action) {
    case 'keep': return 'secondary'
    case 'improve': return 'outline'
    case 'rewrite': return 'destructive'
  }
}

function SectionRecommendationCard({ recommendation }: { recommendation: CopyRecommendation }) {
  const [expanded, setExpanded] = useState(recommendation.action !== 'keep')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = [
      recommendation.after.headline,
      recommendation.after.subheadline,
      recommendation.after.body,
      recommendation.after.cta,
    ].filter(Boolean).join('\n\n')

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className={`border-l-4 ${
      recommendation.action === 'keep' ? 'border-l-emerald-500' :
      recommendation.action === 'improve' ? 'border-l-amber-500' :
      'border-l-red-500'
    }`}>
      <CardHeader className="pb-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getActionIcon(recommendation.action)}
            <span className="uppercase">{recommendation.sectionType}</span>
            <Badge variant={getActionBadgeVariant(recommendation.action)} className="text-xs">
              {recommendation.action}
            </Badge>
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CardContent className="pt-0 space-y-4">
              {recommendation.action === 'keep' ? (
                <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
              ) : (
                <>
                  {/* Before */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
                      BEFORE
                    </Label>
                    <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                      {recommendation.before.headline && (
                        <p className="font-semibold">{recommendation.before.headline}</p>
                      )}
                      {recommendation.before.subheadline && (
                        <p className="text-muted-foreground">{recommendation.before.subheadline}</p>
                      )}
                      {recommendation.before.body && (
                        <p className="whitespace-pre-wrap">{recommendation.before.body}</p>
                      )}
                      {recommendation.before.cta && (
                        <p className="text-primary font-medium">{recommendation.before.cta}</p>
                      )}
                    </div>
                  </div>

                  {/* After */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        AFTER
                      </Label>
                      <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-xs">
                        {copied ? 'Copied!' : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                      </Button>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-3 text-sm space-y-1">
                      {recommendation.after.headline && (
                        <p className="font-semibold">{recommendation.after.headline}</p>
                      )}
                      {recommendation.after.subheadline && (
                        <p className="text-muted-foreground">{recommendation.after.subheadline}</p>
                      )}
                      {recommendation.after.body && (
                        <p className="whitespace-pre-wrap">{recommendation.after.body}</p>
                      )}
                      {recommendation.after.cta && (
                        <p className="text-primary font-medium">{recommendation.after.cta}</p>
                      )}
                    </div>
                  </div>

                  {/* Why */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">WHY</Label>
                    <p className="text-sm">{recommendation.reasoning}</p>
                  </div>

                  {/* Facts Used */}
                  {recommendation.factsUsed.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">FACTS USED</Label>
                      <div className="flex flex-wrap gap-1">
                        {recommendation.factsUsed.map((fact, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{fact}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

function SummaryStats({ output }: { output: WebsiteAdvisorOutput }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Card className="text-center p-3">
        <div className="text-2xl font-bold">{output.summary.sectionsAnalyzed}</div>
        <div className="text-xs text-muted-foreground">Sections</div>
      </Card>
      <Card className="text-center p-3 border-emerald-500/30">
        <div className="text-2xl font-bold text-emerald-500">{output.summary.sectionsToKeep}</div>
        <div className="text-xs text-muted-foreground">Keep</div>
      </Card>
      <Card className="text-center p-3 border-amber-500/30">
        <div className="text-2xl font-bold text-amber-500">{output.summary.sectionsToImprove}</div>
        <div className="text-xs text-muted-foreground">Improve</div>
      </Card>
      <Card className="text-center p-3 border-red-500/30">
        <div className="text-2xl font-bold text-red-500">{output.summary.sectionsToRewrite}</div>
        <div className="text-xs text-muted-foreground">Rewrite</div>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WebsitePage() {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [advisorOutput, setAdvisorOutput] = useState<WebsiteAdvisorOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleStart = async () => {
    const url = normalizeUrl(websiteUrl)
    setWebsiteUrl(url)
    setPhase('processing')
    setError(null)
    setAdvisorOutput(null)

    try {
      const response = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: url,
          prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Request failed')
      }

      setAdvisorOutput(data.output)
      setPhase('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setPhase('error')
    }
  }

  const handleReset = () => {
    setPhase('input')
    setAdvisorOutput(null)
    setError(null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Website Copy Advisor
        </h1>
        <p className="mt-2 text-muted-foreground">
          Strategic analysis with section-by-section recommendations
        </p>
      </div>

      {/* Processing State */}
      {phase === 'processing' && (
        <Card className="border-2">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Analyzing your website...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This takes 30-60 seconds. Auditing site, building fact inventory, assessing sections, generating recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      {phase === 'input' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Analyze Your Website
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
            </div>

            {/* Facts Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">
                Facts about this business <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="prompt"
                placeholder={`Tell me the FACTS about this business. Be specific - I can only use what you provide.

Example:
"Adriana has been selling Palm Beach real estate for 20 years. She was a professional tennis player before real estate. She specializes in historic homes in West Palm Beach. She has a degree from Northwood University."

Do NOT include stats you don't have - I will not make them up.`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[160px]"
              />
              <p className="text-xs text-muted-foreground">
                Only include facts you can verify. The system will never invent numbers, credentials, or achievements.
              </p>
            </div>

            <Button
              onClick={handleStart}
              disabled={!isFormValid()}
              className="w-full h-12 text-lg gap-2"
            >
              <Search className="h-5 w-5" />
              Analyze & Recommend
            </Button>
          </CardContent>
        </Card>
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

      {/* Results */}
      {phase === 'done' && advisorOutput && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <SummaryStats output={advisorOutput} />

          {/* Fact Inventory */}
          <FactInventoryDisplay inventory={advisorOutput.factInventory} />

          {/* Section Recommendations */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Section-by-Section Recommendations</h2>
            {advisorOutput.recommendations.map((rec, i) => (
              <SectionRecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </div>
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
