'use client'

import { useState, useEffect } from 'react'
import { 
  Loader2, 
  Globe, 
  Sparkles, 
  Brain,
  Target,
  Zap,
  ArrowRight,
  Check,
  RefreshCw,
  Lightbulb,
  Users,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAllCopyTypes } from '@/lib/copy-type-inputs'
import type { TaskSpec } from '@/lib/schemas'

interface SmartBriefProps {
  onGenerate: (taskSpec: TaskSpec) => void
  isGenerating: boolean
}

type Step = 'input' | 'researching' | 'insights' | 'refine' | 'ready'

interface Insights {
  audience: string
  painPoints: string[]
  opportunities: string[]
  suggestedAngle: string
  competitiveGaps: string[]
  tone: string
}

export function SmartBrief({ onGenerate, isGenerating }: SmartBriefProps) {
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [copyType, setCopyType] = useState('')
  const [goal, setGoal] = useState('')
  const [insights, setInsights] = useState<Insights | null>(null)
  const [isResearching, setIsResearching] = useState(false)
  const [researchData, setResearchData] = useState('')
  const [customContext, setCustomContext] = useState('')

  const copyTypes = getAllCopyTypes()

  // Auto-research when URL is provided
  const handleResearch = async () => {
    if (!url && !companyName) return
    
    setIsResearching(true)
    setStep('researching')

    try {
      // Scrape the URL if provided
      let scrapedContent = ''
      if (url) {
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        })
        if (response.ok) {
          const data = await response.json()
          scrapedContent = data.content || ''
          setResearchData(scrapedContent)
        }
      }

      // Generate insights from the research
      const insightsResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          url,
          copyType,
          goal,
          scrapedContent,
        }),
      })

      if (insightsResponse.ok) {
        const data = await insightsResponse.json()
        setInsights(data.insights)
        setStep('insights')
      } else {
        // Fallback to mock insights if API fails
        setInsights({
          audience: `Decision-makers seeking ${companyName || 'your solution'}`,
          painPoints: [
            'Current solutions are too complex',
            'Results take too long to materialize',
            'Hard to measure ROI',
          ],
          opportunities: [
            'Emphasize speed to value',
            'Highlight measurable outcomes',
            'Show social proof from similar companies',
          ],
          suggestedAngle: 'Position as the simpler, faster alternative that delivers measurable results',
          competitiveGaps: [
            'Most competitors focus on features, not outcomes',
            'Few emphasize ease of implementation',
          ],
          tone: 'Professional yet approachable - expert without being intimidating',
        })
        setStep('insights')
      }
    } catch (error) {
      console.error('Research failed:', error)
      // Still proceed with basic insights
      setInsights({
        audience: `Target audience for ${companyName || 'your product'}`,
        painPoints: ['Key challenges your audience faces'],
        opportunities: ['Unique value propositions to emphasize'],
        suggestedAngle: 'Clear, benefit-focused messaging',
        competitiveGaps: [],
        tone: 'Professional and clear',
      })
      setStep('insights')
    } finally {
      setIsResearching(false)
    }
  }

  // Generate the copy
  const handleGenerate = () => {
    if (!insights) return

    const taskSpec: TaskSpec = {
      copy_type: getCopyTypeEnum(copyType),
      channel: getChannelFromType(copyType),
      audience: {
        who: insights.audience,
        context: `
Company: ${companyName}
Goal: ${goal}
Pain Points: ${insights.painPoints.join('; ')}
Opportunities: ${insights.opportunities.join('; ')}
Suggested Angle: ${insights.suggestedAngle}
Competitive Gaps: ${insights.competitiveGaps.join('; ')}
Additional Context: ${customContext}
Research Data: ${researchData.slice(0, 2000)}
        `.trim(),
        skepticism_level: 'medium',
        prior_knowledge: 'medium',
      },
      goal: {
        primary_action: goal || 'Take the next step',
        success_metric: 'Engagement and conversion',
      },
      inputs: {
        product_or_topic: companyName || 'Product/Service',
        offer_or_claim_seed: insights.suggestedAngle,
        proof_material: [],
        must_include: [],
        must_avoid: [],
      },
      voice_profile: {
        persona: insights.tone,
        formality: 'medium',
        stance: insights.suggestedAngle,
        taboos: [],
        reference_texts: [],
      },
      length_budget: {
        unit: 'words',
        target: getTargetLength(copyType),
        hard_max: Math.round(getTargetLength(copyType) * 1.5),
      },
    }

    onGenerate(taskSpec)
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Quick Input */}
      {step === 'input' && (
        <Card className="border-0 bg-card/50 backdrop-blur glow-orange-sm overflow-hidden">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Smart Brief</h2>
                <p className="text-sm text-muted-foreground">
                  Tell me what you&apos;re writing and I&apos;ll do the research
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Copy Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  What are you writing?
                </label>
                <Select value={copyType} onValueChange={setCopyType}>
                  <SelectTrigger className="h-12 bg-background/50 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Select copy type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {copyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="font-medium">{type.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company/Product */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Company or Product Name
                </label>
                <Input
                  placeholder="e.g., Hypertune"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website URL <span className="text-muted-foreground/50">(optional - enables deep research)</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://yoursite.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  What should readers do?
                </label>
                <Input
                  placeholder="e.g., Sign up for a free trial, Book a demo, Subscribe"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Research Button */}
              <Button
                onClick={handleResearch}
                disabled={(!url && !companyName) || !copyType}
                className="w-full h-14 text-lg gap-3 glow-orange"
              >
                <Brain className="h-5 w-5" />
                Research & Strategize
                <ArrowRight className="h-5 w-5" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                I&apos;ll analyze your business, identify opportunities, and craft a strategic brief
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Researching */}
      {step === 'researching' && (
        <Card className="border-0 bg-card/50 backdrop-blur overflow-hidden">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse-glow">
                  <Brain className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Researching {companyName}...</h3>
                <p className="text-muted-foreground max-w-md">
                  Analyzing your business, identifying target audience, and finding strategic opportunities
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {[
                  'Analyzing website',
                  'Understanding audience',
                  'Finding pain points',
                  'Identifying opportunities',
                  'Crafting strategy',
                ].map((task, i) => (
                  <Badge 
                    key={task} 
                    variant="secondary" 
                    className={`animate-pulse ${i * 200}ms`}
                  >
                    {task}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Insights */}
      {step === 'insights' && insights && (
        <div className="space-y-4">
          {/* Insights Header */}
          <Card className="border-0 bg-card/50 backdrop-blur overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Strategic Brief Ready</h2>
                    <p className="text-sm text-muted-foreground">
                      Here&apos;s what I discovered about {companyName}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('input')}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Insight Cards Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Target Audience */}
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">Target Audience</h3>
                </div>
                <p className="text-sm text-muted-foreground">{insights.audience}</p>
              </CardContent>
            </Card>

            {/* Suggested Angle */}
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">Recommended Angle</h3>
                </div>
                <p className="text-sm text-muted-foreground">{insights.suggestedAngle}</p>
              </CardContent>
            </Card>

            {/* Pain Points */}
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="font-medium">Pain Points to Address</h3>
                </div>
                <ul className="space-y-1">
                  {insights.painPoints.map((point, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <h3 className="font-medium">Opportunities</h3>
                </div>
                <ul className="space-y-1">
                  {insights.opportunities.map((opp, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Tone & Refinement */}
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-medium">Recommended Tone</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{insights.tone}</p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Anything else I should know?
                </label>
                <Textarea
                  placeholder="Add specific details, examples, testimonials, or directions..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={3}
                  className="bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-14 text-lg gap-3 glow-orange"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Copy
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getCopyTypeEnum(type: string): TaskSpec['copy_type'] {
  const copyTypeMap: Record<string, TaskSpec['copy_type']> = {
    landing_page: 'website',
    website_copy: 'website',
    email_sequence: 'email',
    sales_letter: 'website',
    ad_copy: 'social',
    blog_article: 'article',
    case_study: 'article',
  }
  return copyTypeMap[type] || 'website'
}

function getChannelFromType(type: string): TaskSpec['channel'] {
  const channelMap: Record<string, TaskSpec['channel']> = {
    landing_page: 'landing_page',
    website_copy: 'homepage',
    email_sequence: 'email_newsletter',
    sales_letter: 'landing_page',
    ad_copy: 'linkedin_post',
    blog_article: 'blog_post',
    case_study: 'case_study',
  }
  return channelMap[type] || 'landing_page'
}

function getTargetLength(type: string): number {
  const lengthMap: Record<string, number> = {
    landing_page: 800,
    website_copy: 500,
    email_sequence: 1500,
    sales_letter: 2000,
    ad_copy: 150,
    blog_article: 1500,
    case_study: 1000,
  }
  return lengthMap[type] || 500
}

