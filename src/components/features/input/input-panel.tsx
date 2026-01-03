'use client'

import { useState } from 'react'
import { Sparkles, Upload, FileText, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CopyTypeSelector, VoiceSelector } from './copy-type-selector'
import { UploadTab } from './upload-tab'
import { PasteTab } from './paste-tab'
import { UrlTab } from './url-tab'
import type { CopyType, Channel, TaskSpec } from '@/lib/schemas'

interface InputPanelProps {
  onGenerate: (taskSpec: TaskSpec) => void
  isGenerating: boolean
}

interface UploadedFile {
  name: string
  size: number
  content?: string
}

interface ScrapedUrl {
  url: string
  title?: string
  content?: string
  status: 'pending' | 'loading' | 'success' | 'error'
  error?: string
}

export function InputPanel({ onGenerate, isGenerating }: InputPanelProps) {
  // Input state
  const [pastedContent, setPastedContent] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [urls, setUrls] = useState<ScrapedUrl[]>([])
  
  // Copy configuration
  const [copyType, setCopyType] = useState<CopyType>('email')
  const [channel, setChannel] = useState<Channel>('email_newsletter')
  const [voice, setVoice] = useState('calm_operator')
  
  // Audience & Goal
  const [audienceWho, setAudienceWho] = useState('')
  const [audienceContext, setAudienceContext] = useState('')
  const [primaryAction, setPrimaryAction] = useState('')
  const [productOrTopic, setProductOrTopic] = useState('')

  const handleCopyTypeChange = (value: CopyType) => {
    setCopyType(value)
    // Reset channel to first option of new type
    const channels: Record<CopyType, Channel> = {
      email: 'email_newsletter',
      website: 'landing_page',
      social: 'x_post',
      article: 'blog_post',
    }
    setChannel(channels[value])
  }

  const handleGenerate = () => {
    // Combine all content sources
    const allContent = [
      pastedContent,
      ...uploadedFiles.map(f => f.content || ''),
      ...urls.filter(u => u.status === 'success').map(u => u.content || ''),
    ].filter(Boolean).join('\n\n')

    // Build TaskSpec
    const taskSpec: TaskSpec = {
      copy_type: copyType,
      channel: channel,
      audience: {
        who: audienceWho || 'Target customer',
        context: audienceContext || 'Looking for a solution',
        skepticism_level: 'medium',
        prior_knowledge: 'medium',
      },
      goal: {
        primary_action: primaryAction || 'Take action',
        success_metric: 'Engagement and conversion',
      },
      inputs: {
        product_or_topic: productOrTopic || allContent.slice(0, 200),
        offer_or_claim_seed: '',
        proof_material: [],
        must_include: [],
        must_avoid: [],
      },
      voice_profile: {
        persona: voice.replace('_', ' '),
        formality: 'medium',
        stance: 'Confident but not arrogant',
        taboos: [],
        reference_texts: [],
      },
      length_budget: {
        unit: 'words',
        target: copyType === 'social' ? 100 : copyType === 'email' ? 200 : 400,
        hard_max: copyType === 'social' ? 150 : copyType === 'email' ? 300 : 600,
      },
    }

    onGenerate(taskSpec)
  }

  const hasContent = pastedContent.trim() || uploadedFiles.length > 0 || urls.length > 0

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Input Tabs */}
          <Tabs defaultValue="paste" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="paste" className="gap-2">
                <FileText className="h-4 w-4" />
                Paste
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Globe className="h-4 w-4" />
                URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-4">
              <PasteTab
                content={pastedContent}
                onContentChange={setPastedContent}
              />
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <UploadTab
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                isProcessing={isGenerating}
              />
            </TabsContent>
            <TabsContent value="url" className="mt-4">
              <UrlTab urls={urls} onUrlsChange={setUrls} />
            </TabsContent>
          </Tabs>

          {/* Quick Config */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product">Product / Topic</Label>
                <Input
                  id="product"
                  placeholder="What are you writing about?"
                  value={productOrTopic}
                  onChange={(e) => setProductOrTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  placeholder="Who is this for?"
                  value={audienceWho}
                  onChange={(e) => setAudienceWho(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal">Primary Goal</Label>
              <Input
                id="goal"
                placeholder="What should they do after reading?"
                value={primaryAction}
                onChange={(e) => setPrimaryAction(e.target.value)}
              />
            </div>

            <CopyTypeSelector
              copyType={copyType}
              channel={channel}
              onCopyTypeChange={handleCopyTypeChange}
              onChannelChange={setChannel}
            />

            <VoiceSelector voice={voice} onVoiceChange={setVoice} />
          </div>

          {/* Generate Button */}
          <Button
            className="w-full h-12 text-lg font-semibold"
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !hasContent}
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

