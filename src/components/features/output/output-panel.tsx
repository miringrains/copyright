'use client'

import { useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { FinalPackage } from '@/lib/schemas'

interface OutputPanelProps {
  finalPackage: FinalPackage | null
  isLoading: boolean
}

export function OutputPanel({ finalPackage, isLoading }: OutputPanelProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const copyToClipboard = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const exportAsMarkdown = () => {
    if (!finalPackage) return

    const content = `# Generated Copy

## Main Version
${finalPackage.final}

${finalPackage.variants.shorter ? `## Shorter Version
${finalPackage.variants.shorter}` : ''}

${finalPackage.variants.punchier ? `## Punchier Version
${finalPackage.variants.punchier}` : ''}

${finalPackage.variants.safer ? `## Safer Version
${finalPackage.variants.safer}` : ''}

${finalPackage.extras.headlines?.length ? `## Headlines
${finalPackage.extras.headlines.map(h => `- ${h}`).join('\n')}` : ''}

${finalPackage.extras.email_subject_lines?.length ? `## Subject Lines
${finalPackage.extras.email_subject_lines.map(s => `- ${s}`).join('\n')}` : ''}
`

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-copy.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mb-2 text-lg font-medium">Generating your copy...</div>
            <p className="text-sm">
              The AI is working through 8 phases to create human-quality copy.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!finalPackage) {
    return null
  }

  const tabs = [
    { id: 'main', label: 'Main', content: finalPackage.final },
    ...(finalPackage.variants.shorter ? [{ id: 'shorter', label: 'Shorter', content: finalPackage.variants.shorter }] : []),
    ...(finalPackage.variants.punchier ? [{ id: 'punchier', label: 'Punchier', content: finalPackage.variants.punchier }] : []),
    ...(finalPackage.variants.safer ? [{ id: 'safer', label: 'Safer', content: finalPackage.variants.safer }] : []),
  ]

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generated Copy</h3>
          <Button variant="outline" size="sm" onClick={exportAsMarkdown}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="main" className="w-full">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <div className="relative">
                <div className="min-h-[200px] whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-sm">
                  {tab.content}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyToClipboard(tab.content, tab.id)}
                >
                  {copiedTab === tab.id ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Extras */}
        {(finalPackage.extras.headlines?.length > 0 || 
          finalPackage.extras.email_subject_lines?.length > 0 ||
          finalPackage.extras.cta_options?.length > 0) && (
          <div className="mt-6 space-y-4">
            {finalPackage.extras.headlines && finalPackage.extras.headlines.length > 0 && (
              <div>
                <h4 className="mb-2 font-medium">Headlines</h4>
                <ul className="space-y-1">
                  {finalPackage.extras.headlines.map((h, i) => (
                    <li key={i} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                      <span>{h}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(h, `headline-${i}`)}
                      >
                        {copiedTab === `headline-${i}` ? (
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

            {finalPackage.extras.email_subject_lines && finalPackage.extras.email_subject_lines.length > 0 && (
              <div>
                <h4 className="mb-2 font-medium">Subject Lines</h4>
                <ul className="space-y-1">
                  {finalPackage.extras.email_subject_lines.map((s, i) => (
                    <li key={i} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                      <span>{s}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(s, `subject-${i}`)}
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
          </div>
        )}

        {/* QA Badge */}
        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(finalPackage.qa).map(([key, value]) => (
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
