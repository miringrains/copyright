'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, Globe, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  getAllCopyTypes, 
  getCopyTypeConfig, 
  getEmailCampaignFields,
  EMAIL_CAMPAIGN_TYPES,
  type InputField,
  type CopyTypeConfig 
} from '@/lib/copy-type-inputs'
import type { TaskSpec } from '@/lib/schemas'

interface SmartInputPanelProps {
  onGenerate: (taskSpec: TaskSpec) => void
  isGenerating: boolean
}

export function SmartInputPanel({ onGenerate, isGenerating }: SmartInputPanelProps) {
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [config, setConfig] = useState<CopyTypeConfig | null>(null)
  const [formData, setFormData] = useState<Record<string, string | string[]>>({})
  const [showOptional, setShowOptional] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchData, setResearchData] = useState<string>('')

  const copyTypes = getAllCopyTypes()

  // Update config when type changes
  useEffect(() => {
    if (selectedType) {
      const newConfig = getCopyTypeConfig(selectedType)
      setConfig(newConfig || null)
      setFormData({})
      setSelectedCampaign('')
      setResearchData('')
    }
  }, [selectedType])

  // Get campaign-specific fields
  const campaignFields = selectedType === 'email' && selectedCampaign 
    ? getEmailCampaignFields(selectedCampaign) 
    : []

  // Handle field changes
  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    
    // If this is the campaign_type field, update selectedCampaign
    if (fieldId === 'campaign_type' && typeof value === 'string') {
      setSelectedCampaign(value)
    }
  }

  // Handle URL list changes
  const handleUrlListChange = (fieldId: string, index: number, value: string) => {
    const currentUrls = (formData[fieldId] as string[]) || ['']
    const newUrls = [...currentUrls]
    newUrls[index] = value
    handleFieldChange(fieldId, newUrls)
  }

  const addUrl = (fieldId: string) => {
    const currentUrls = (formData[fieldId] as string[]) || ['']
    handleFieldChange(fieldId, [...currentUrls, ''])
  }

  const removeUrl = (fieldId: string, index: number) => {
    const currentUrls = (formData[fieldId] as string[]) || ['']
    handleFieldChange(fieldId, currentUrls.filter((_, i) => i !== index))
  }

  // Research competitors with Firecrawl
  const handleResearch = async () => {
    const urls = (formData['competitor_urls'] as string[]) || []
    const validUrls = urls.filter(u => u.trim().startsWith('http'))
    
    if (validUrls.length === 0) return

    setIsResearching(true)
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setResearchData(data.content || '')
      }
    } catch (error) {
      console.error('Research failed:', error)
    } finally {
      setIsResearching(false)
    }
  }

  // Build TaskSpec and generate
  const handleGenerate = async () => {
    if (!config) return

    setIsResearching(true)
    
    // Build research context from form data
    const researchContext: string[] = []
    
    // Add campaign type context for emails
    if (selectedType === 'email' && selectedCampaign) {
      const campaignInfo = EMAIL_CAMPAIGN_TYPES.find(c => c.value === selectedCampaign)
      if (campaignInfo) {
        researchContext.push(`Campaign Type: ${campaignInfo.label} - ${campaignInfo.description}`)
      }
    }
    
    // Add all form data as context
    const allFields = [...(config.requiredFields || []), ...(config.optionalFields || []), ...campaignFields]
    for (const [key, value] of Object.entries(formData)) {
      if (value && (typeof value === 'string' ? value.trim() : value.length > 0)) {
        const field = allFields.find(f => f.id === key)
        const label = field?.label || key
        const displayValue = Array.isArray(value) ? value.filter(Boolean).join(', ') : value
        if (displayValue) {
          researchContext.push(`${label}: ${displayValue}`)
        }
      }
    }

    // Auto-scrape the company website if URL provided
    const companyUrl = formData['destination_url'] as string
    if (companyUrl && companyUrl.startsWith('http')) {
      try {
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [companyUrl] }),
        })
        if (response.ok) {
          const data = await response.json()
          if (data.content) {
            researchContext.push(`\n--- COMPANY WEBSITE DATA ---\n${data.content}`)
          }
        }
      } catch (error) {
        console.error('Company website scrape failed:', error)
      }
    }

    // Add competitor research if available
    if (researchData) {
      researchContext.push(`\n--- COMPETITOR RESEARCH ---\n${researchData}`)
    }

    setIsResearching(false)

    const taskSpec: TaskSpec = {
      copy_type: getCopyTypeEnum(selectedType),
      channel: getChannelFromType(selectedType, selectedCampaign),
      audience: {
        who: (formData['target_audience'] as string) || 'Target audience not specified',
        context: researchContext.join('\n\n'),
        skepticism_level: 'medium',
        prior_knowledge: 'medium',
      },
      goal: {
        primary_action: (formData['desired_action'] as string) || 
                        (formData['goal'] as string) || 
                        'Take the next step',
        success_metric: 'Conversion/engagement',
      },
      inputs: {
        product_or_topic: (formData['company_name'] as string) || 
                          (formData['product_name'] as string) || 
                          (formData['topic'] as string) || 'Product/Service',
        offer_or_claim_seed: (formData['value_proposition'] as string) || 
                             (formData['offer'] as string) || 
                             (formData['teaching_point'] as string) || undefined,
        proof_material: [],
        must_include: [],
        must_avoid: [],
      },
      voice_profile: {
        persona: getTonePersona((formData['tone'] as string) || 'professional'),
        formality: getToneFormality((formData['tone'] as string) || 'professional'),
        stance: (formData['key_differentiators'] as string) || 'We deliver results',
        taboos: [],
        reference_texts: [],
      },
      length_budget: {
        unit: 'words',
        target: getTargetLength(selectedType),
        hard_max: Math.round(getTargetLength(selectedType) * 1.5),
      },
    }

    onGenerate(taskSpec)
  }

  // Render a single field
  const renderField = (field: InputField, isCampaignField: boolean = false) => {
    const value = formData[field.id]

    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            rows={3}
          />
        )

      case 'url':
        return (
          <Input
            id={field.id}
            type="url"
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )

      case 'url-list':
        const urls = (value as string[]) || ['']
        return (
          <div className="space-y-2">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="url"
                  placeholder={field.placeholder}
                  value={url}
                  onChange={(e) => handleUrlListChange(field.id, index, e.target.value)}
                />
                {urls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUrl(field.id, index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addUrl(field.id)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Add URL
            </Button>
            {field.id === 'competitor_urls' && config?.firecrawlEnabled && urls.some(u => u.startsWith('http')) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResearch}
                disabled={isResearching}
                className="ml-2 gap-1"
              >
                {isResearching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                Research Competitors
              </Button>
            )}
          </div>
        )

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => handleFieldChange(field.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )

      default:
        return null
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    if (!config) return false
    
    // Check required fields from config
    const requiredValid = config.requiredFields.every(field => {
      const value = formData[field.id]
      if (Array.isArray(value)) return value.some(v => v.trim())
      return value && value.trim()
    })
    
    // For email, also check campaign-specific required fields
    if (selectedType === 'email' && selectedCampaign) {
      const campaignValid = campaignFields
        .filter(f => f.required)
        .every(field => {
          const value = formData[field.id]
          if (Array.isArray(value)) return value.some(v => v.trim())
          return value && value.trim()
        })
      return requiredValid && campaignValid
    }
    
    return requiredValid
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          What are you writing?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Copy Type Selection */}
        <div className="space-y-2">
          <Label>Copy Type</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select what you're writing..." />
            </SelectTrigger>
            <SelectContent>
              {copyTypes.map((type) => (
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

        {/* Dynamic Fields */}
        {config && (
          <>
            {/* Required Fields */}
            <div className="space-y-4">
              {config.requiredFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                  {renderField(field)}
                </div>
              ))}
            </div>

            {/* Campaign-Specific Fields for Email */}
            {selectedType === 'email' && selectedCampaign && campaignFields.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-primary mb-4">
                  {EMAIL_CAMPAIGN_TYPES.find(c => c.value === selectedCampaign)?.label} Details
                </div>
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  {campaignFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      )}
                      {renderField(field, true)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Fields Toggle */}
            {config.optionalFields.length > 0 && (
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOptional ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showOptional ? 'Hide' : 'Show'} Optional Fields ({config.optionalFields.length})
                </button>

                {showOptional && (
                  <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
                    {config.optionalFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Research Data Preview */}
            {researchData && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  <Globe className="h-4 w-4" />
                  Competitor Research Loaded
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 line-clamp-2">
                  {researchData.slice(0, 200)}...
                </p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!isFormValid() || isGenerating}
              className="w-full h-12 text-lg gap-2"
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
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Helper functions
function getCopyTypeEnum(type: string): TaskSpec['copy_type'] {
  const copyTypeMap: Record<string, TaskSpec['copy_type']> = {
    landing_page: 'website',
    website: 'website',
    email: 'email',
    article: 'article',
  }
  return copyTypeMap[type] || 'website'
}

function getChannelFromType(type: string, campaign?: string): TaskSpec['channel'] {
  if (type === 'email') {
    // Map campaign types to channels
    const campaignChannels: Record<string, TaskSpec['channel']> = {
      welcome: 'email_newsletter',
      nurture: 'email_newsletter',
      launch: 'email_newsletter',
      abandoned_cart: 'email_newsletter',
      reengagement: 'email_newsletter',
    }
    return campaignChannels[campaign || ''] || 'email_newsletter'
  }
  
  const channelMap: Record<string, TaskSpec['channel']> = {
    landing_page: 'landing_page',
    website: 'homepage',
    article: 'blog_post',
  }
  return channelMap[type] || 'landing_page'
}

function getTargetLength(type: string): number {
  const lengthMap: Record<string, number> = {
    landing_page: 800,
    website: 500,
    email: 150,
    article: 1500,
  }
  return lengthMap[type] || 500
}

function getTonePersona(tone: string): string {
  const personaMap: Record<string, string> = {
    professional: 'Knowledgeable expert who builds trust through clarity',
    conversational: 'Friendly advisor having a one-on-one conversation',
    bold: 'Confident authority who speaks directly and takes a stand',
    empathetic: 'Understanding guide who acknowledges challenges',
    authoritative: 'Industry leader backed by deep expertise',
  }
  return personaMap[tone] || personaMap.professional
}

function getToneFormality(tone: string): 'low' | 'medium' | 'high' {
  const formalityMap: Record<string, 'low' | 'medium' | 'high'> = {
    professional: 'medium',
    conversational: 'low',
    bold: 'low',
    empathetic: 'medium',
    authoritative: 'high',
  }
  return formalityMap[tone] || 'medium'
}
