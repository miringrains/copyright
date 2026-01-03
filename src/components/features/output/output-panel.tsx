'use client'

import { useState } from 'react'
import { Copy, Download, Check, FileText, Zap, Shield, Sparkles, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    return null // Progress is shown separately
  }

  if (!finalPackage) {
    return null // Don't show empty state
  }

  const tabs = [
    { id: 'main', label: 'Final', icon: FileText, content: finalPackage.final },
    ...(finalPackage.variants.shorter ? [{ id: 'shorter', label: 'Shorter', icon: Zap, content: finalPackage.variants.shorter }] : []),
    ...(finalPackage.variants.punchier ? [{ id: 'punchier', label: 'Punchier', icon: Sparkles, content: finalPackage.variants.punchier }] : []),
    ...(finalPackage.variants.safer ? [{ id: 'safer', label: 'Safer', icon: Shield, content: finalPackage.variants.safer }] : []),
  ]

  const passedChecks = Object.values(finalPackage.qa).filter(Boolean).length
  const totalChecks = Object.values(finalPackage.qa).length

  return (
    <Card className="border-0 bg-card/50 backdrop-blur glow-orange-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold">Your Copy is Ready</h3>
            <p className="text-sm text-muted-foreground">
              {passedChecks}/{totalChecks} quality checks passed
            </p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={exportAsMarkdown}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <CardContent className="p-6">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="bg-background/50 mb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
          
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <div className="relative group">
                <div className="min-h-[200px] whitespace-pre-wrap rounded-xl border border-border/50 bg-background/50 p-6 text-sm leading-relaxed">
                  {tab.content}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                  onClick={() => copyToClipboard(tab.content, tab.id)}
                >
                  {copiedTab === tab.id ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
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
          <div className="mt-6 space-y-4 pt-6 border-t border-border/50">
            {finalPackage.extras.headlines && finalPackage.extras.headlines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Headlines</h4>
                <div className="space-y-2">
                  {finalPackage.extras.headlines.map((h, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between rounded-lg bg-background/50 border border-border/50 px-4 py-3 group"
                    >
                      <span className="text-sm font-medium">{h}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(h, `headline-${i}`)}
                      >
                        {copiedTab === `headline-${i}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalPackage.extras.email_subject_lines && finalPackage.extras.email_subject_lines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Subject Lines</h4>
                <div className="space-y-2">
                  {finalPackage.extras.email_subject_lines.map((s, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between rounded-lg bg-background/50 border border-border/50 px-4 py-3 group"
                    >
                      <span className="text-sm">{s}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(s, `subject-${i}`)}
                      >
                        {copiedTab === `subject-${i}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalPackage.extras.cta_options && finalPackage.extras.cta_options.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">CTA Options</h4>
                <div className="flex flex-wrap gap-2">
                  {finalPackage.extras.cta_options.map((cta, i) => (
                    <Badge 
                      key={i}
                      variant="secondary"
                      className="px-3 py-1.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => copyToClipboard(cta, `cta-${i}`)}
                    >
                      {cta}
                      {copiedTab === `cta-${i}` && (
                        <Check className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* QA Badges */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Quality Checks</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(finalPackage.qa).map(([key, value]) => (
              <Badge
                key={key}
                variant="outline"
                className={`${
                  value
                    ? 'border-green-500/50 bg-green-500/10 text-green-400'
                    : 'border-red-500/50 bg-red-500/10 text-red-400'
                }`}
              >
                {value ? <Check className="mr-1 h-3 w-3" /> : null}
                {key.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
