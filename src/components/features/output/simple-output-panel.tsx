'use client'

import { useState } from 'react'
import { Copy, Check, User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { CopyOutput } from '@/lib/schemas/copy-output'
import type { VoiceSelection } from '@/lib/schemas/voice-selection'

interface SimpleOutputPanelProps {
  copyOutput: CopyOutput | null
  voiceSelection: VoiceSelection | null
  isLoading: boolean
}

export function SimpleOutputPanel({ copyOutput, voiceSelection, isLoading }: SimpleOutputPanelProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const copyToClipboard = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mb-2 text-lg font-medium">Writing...</div>
            <p className="text-sm">3 simple phases. No bullshit.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!copyOutput) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mb-2 text-lg font-medium">Your copy will appear here</div>
            <p className="text-sm">Fill in the form and click Generate.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tabs = [
    { id: 'main', label: 'Main', content: copyOutput.copy },
    { id: 'shorter', label: 'Shorter', content: copyOutput.variants.shorter },
    { id: 'warmer', label: 'Warmer', content: copyOutput.variants.warmer },
  ]

  return (
    <Card className="border-2">
      {/* Voice info */}
      {voiceSelection && (
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Written by {voiceSelection.name}</p>
              <p className="text-sm text-muted-foreground">{voiceSelection.why}</p>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="pt-4">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <div className="relative">
                <div className="min-h-[150px] whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 pr-16 font-mono text-sm">
                  {tab.content}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyToClipboard(tab.content, tab.id)}
                >
                  {copiedTab === tab.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Subject lines */}
        {copyOutput.subject_lines && copyOutput.subject_lines.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-2 font-medium">Subject Lines</h4>
            <ul className="space-y-1">
              {copyOutput.subject_lines.map((line, i) => (
                <li 
                  key={i} 
                  className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm"
                >
                  <span>{line}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(line, `subject-${i}`)}
                  >
                    {copiedTab === `subject-${i}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* QA badges */}
        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(copyOutput.check).map(([key, value]) => (
            <span
              key={key}
              className={`rounded-full px-2 py-1 text-xs ${
                value
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {key.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

